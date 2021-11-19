import {
  RecordType,
  RecordOutType,
  RecordInType,
} from "io-type"

export function all<Obj extends RecordType>(obj: Obj) {
  return async (
    input: RecordInType<Obj>
  ): Promise<RecordOutType<Obj>> => {
    const outputs: any = {}
    const keys = Object.keys(obj)

    for (const key of keys) {
      outputs[key] = obj[key](input[key])
    }

    await Promise.all(Object.values(outputs))

    for (const key of keys) {
      outputs[key] = await outputs[key]
    }

    return outputs
  }
}

export function each<Obj extends RecordType>(obj: Obj) {
  return async (
    input: RecordInType<Obj>
  ): Promise<RecordOutType<Obj>> => {
    const outputs: any = {}
    const keys = Object.keys(obj)

    for (const key of keys) {
      outputs[key] = await obj[key](input[key])
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
    this._resolve(value)
  }
  toJSON() {
    return this._state
  }
}

export function prop<T>(value?: T): Prop<T> {
  return new Prop(value)
}
