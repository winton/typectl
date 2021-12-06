import { RecordType, InType, OutType } from "io-type"

export type InputOutputMapType<Obj extends RecordType> = {
  [P in keyof Obj]:
    | [
        OptionalPropRecordType<InType<Obj[P]>>,
        PropRecordType<OutType<Obj[P]>>
      ]
    | [OptionalPropRecordType<InType<Obj[P]>>]
}

export type InputOutputMapAnyType<Obj extends RecordType> =
  {
    [P in keyof Obj]:
      | [
          OptionalPropRecordType<InType<Obj[P]>>,
          PropRecordType<OutType<Obj[P]>>
        ]
      | [OptionalPropRecordType<InType<Obj[P]>>]
      | false
  }

export type PropRecordType<Obj extends RecordType> = {
  [P in keyof Obj]: Prop<Obj[P]>
}

export type OptionalPropRecordType<Obj extends RecordType> =
  {
    [P in keyof Obj]: Obj[P] | Prop<Obj[P]>
  }

export type PartialOptionalPropRecordType<
  Obj extends RecordType
> = {
  [P in keyof Obj]?: Obj[P] | Prop<Obj[P]>
}

export async function propInput(
  input: Record<string | number | symbol, any>
) {
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
  outputMap: Record<string | number | symbol, any>
) {
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
  ): Promise<void> => {
    const promises = []

    for (const key in obj) {
      promises.push(
        (async () =>
          propOutput(
            await obj[key](await propInput(input[key][0])),
            input[key][1]
          ))()
      )
    }

    await Promise.all(promises)
  }
}

export function any<Obj extends RecordType>(obj: Obj) {
  return async (
    input: InputOutputMapAnyType<Obj>
  ): Promise<void> => {
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
  ): Promise<void> => {
    const keys = Object.keys(obj)

    for (const key of keys) {
      propOutput(
        await obj[key](await propInput(input[key][0])),
        input[key][1]
      )
    }
  }
}

export class Prop<T> {
  _promise: Promise<T>
  _resolve: (value: T | PromiseLike<T>) => void
  _state: T
  constructor(value?: T) {
    this._promise =
      value !== undefined
        ? Promise.resolve(value)
        : new Promise<T>(
            (resolve) => (this._resolve = resolve)
          )
    this._state = value
  }
  get promise() {
    return this._promise
  }
  get value() {
    return this._state
  }
  set value(value: T) {
    if (this._state !== undefined) {
      throw new Error(
        "Prop cannot receive a value more than once."
      )
    }
    this._state = value
    this._resolve(value)
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
