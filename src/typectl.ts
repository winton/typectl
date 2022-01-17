import { RecordType, InType, OutType } from "io-type"
import { Readable } from "stream"

export type InputOutputMapType<Obj extends RecordType> = {
  [P in keyof Obj]:
    | [
        InputPropRecordType<InType<Obj[P]>>,
        OutputPropRecordType<OutType<Obj[P]>>
      ]
    | [InputPropRecordType<InType<Obj[P]>>]
    | []
}

export type InputOutputMapAnyType<Obj extends RecordType> =
  {
    [P in keyof Obj]:
      | [
          InputPropRecordType<InType<Obj[P]>>,
          OutputPropRecordType<OutType<Obj[P]>>
        ]
      | [InputPropRecordType<InType<Obj[P]>>]
      | []
  }

export type InputPropRecordType<Obj extends RecordType> = {
  [P in keyof Obj]: Obj[P] extends Array<any>
    ? Obj[P] | Prop<Obj[P]> | Readable | Prop<Readable>
    : Obj[P] | Prop<Obj[P]>
}

export type OutputPropRecordType<Obj extends RecordType> = {
  [P in keyof Obj]?: Prop<Obj[P]>
}

export async function propInput(
  input: Record<string | number | symbol, any>
) {
  if (!input) {
    return
  }

  const out = {}
  const promises = []

  for (const key in input) {
    if (
      input[key] instanceof Prop &&
      !key.endsWith("Prop")
    ) {
      promises.push(
        (async () =>
          (out[key] = await input[key].promise))()
      )
    } else {
      out[key] = input[key]
    }
  }

  await Promise.all(promises)

  return out
}

export function propOutput(
  output: Record<string | number | symbol, any>,
  outputMap: Record<string | number | symbol, any>,
  signal: { break: any }
) {
  if (output?.break) {
    signal.break = output.break
  }
  for (const key in outputMap) {
    if (outputMap[key] instanceof Prop) {
      if (output[key] instanceof Prop) {
        ;(async () =>
          (outputMap[key].value = await output[key]))()
      } else {
        outputMap[key].value = output[key]
      }
    }
  }
}

export function all<Obj extends RecordType>(obj: Obj) {
  return async (
    input: InputOutputMapType<Obj>
  ): Promise<{ break: any }> => {
    const signal = { break: undefined }
    const promises = []

    for (const key in obj) {
      promises.push(
        (async () => {
          propOutput(
            signal.break === undefined
              ? await obj[key](
                  await propInput(input[key][0])
                )
              : {},
            input[key][1],
            signal
          )
        })()
      )
    }

    await Promise.all(promises)

    return signal
  }
}

export function any<Obj extends RecordType>(obj: Obj) {
  return async (
    input: InputOutputMapAnyType<Obj>
  ): Promise<{ break: any }> => {
    const objs: any = {}

    for (const key in obj) {
      if (input[key]) {
        objs[key] = obj[key]
      }
    }

    return await all(objs)(input as InputOutputMapType<Obj>)
  }
}

export function each<Obj extends RecordType>(obj: Obj) {
  return async (
    input: InputOutputMapType<Obj>
  ): Promise<{ break: any }> => {
    const signal = { break: undefined }
    const keys = Object.keys(obj)

    for (const key of keys) {
      propOutput(
        signal.break === undefined
          ? await obj[key](await propInput(input[key][0]))
          : {},
        input[key][1],
        signal
      )
    }

    return signal
  }
}

export function anyEach<Obj extends RecordType>(obj: Obj) {
  return async (
    input: InputOutputMapType<Obj>
  ): Promise<{ break: any }> => {
    const signal = { break: undefined }
    const keys = Object.keys(obj)

    for (const key of keys) {
      if (input[key]) {
        propOutput(
          signal.break === undefined
            ? await obj[key](await propInput(input[key][0]))
            : {},
          input[key][1],
          signal
        )
      }
    }

    return signal
  }
}

export class Prop<T> {
  _promise: Promise<T>
  _resolve: (value: T | PromiseLike<T>) => void
  _state: T
  constructor(value?: T) {
    if (value === undefined) {
      this._promise = new Promise<T>(
        (resolve) => (this._resolve = resolve)
      )
    } else {
      this._promise = Promise.resolve(value)
      this._state = value
      Object.freeze(this)
    }
  }
  get promise() {
    return this._promise
  }
  get value() {
    return this._state
  }
  set value(value: T) {
    if (Object.isFrozen(this)) {
      throw new Error("Props cannot be reassigned.")
    }
    this._state = value
    this._resolve(value)
    Object.freeze(this)
  }
  toJSON() {
    return this._state
  }
  toString() {
    return JSON.stringify(this)
  }
}

export function prop<T>(value?: T): Prop<T> {
  return new Prop(value)
}
