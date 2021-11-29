import { RecordType, RecordOutType, InType } from "io-type"

export type PropRecordType<Obj extends RecordType> = {
  [P in keyof Obj]: Obj[P] | Prop<Obj[P]>
}

export type PropRecordInType<Obj extends RecordType> = {
  [P in keyof Obj]: PropRecordType<InType<Obj[P]>>
}

export async function propInput(
  input: Record<string | number | symbol, any>
) {
  const out = {}
  for (const key in input) {
    if (
      input[key] instanceof Prop &&
      !key.endsWith("Prop")
    ) {
      out[key] = await input[key].promise
    } else {
      out[key] = input[key]
    }
  }
  return out
}

export function all<Obj extends RecordType>(obj: Obj) {
  return async (
    input: PropRecordInType<Obj>
  ): Promise<RecordOutType<Obj>> => {
    const outputs: any = {}

    for (const key in obj) {
      outputs[key] = obj[key](await propInput(input[key]))
    }

    await Promise.all(Object.values(outputs))

    for (const key in outputs) {
      outputs[key] = await outputs[key]
    }

    return outputs
  }
}

export function any<Obj extends RecordType>(obj: Obj) {
  return async (
    input: Partial<PropRecordInType<Obj>>
  ): Promise<Partial<RecordOutType<Obj>>> => {
    const outputs: any = {}

    for (const key in obj) {
      if (input[key] !== undefined) {
        outputs[key] = obj[key](await propInput(input[key]))
      }
    }

    await Promise.all(Object.values(outputs))

    for (const key in outputs) {
      outputs[key] = await outputs[key]
    }

    return outputs
  }
}

export function each<Obj extends RecordType>(obj: Obj) {
  return async (
    input: PropRecordInType<Obj>
  ): Promise<RecordOutType<Obj>> => {
    const outputs: any = {}
    const keys = Object.keys(obj)

    for (const key of keys) {
      outputs[key] = await obj[key](
        await propInput(input[key])
      )
    }

    return outputs
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
    this._state = value
    if (this._resolve) {
      this._resolve(value)
    } else {
      this._promise = Promise.resolve(value)
    }
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
