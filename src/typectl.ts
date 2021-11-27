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

    for (const key in obj) {
      outputs[key] = obj[key](input[key])
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
    input: Partial<RecordInType<Obj>>
  ): Promise<Partial<RecordOutType<Obj>>> => {
    const outputs: any = {}

    for (const key in obj) {
      if (input[key] !== undefined) {
        outputs[key] = obj[key](input[key])
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
    if (this._resolve) {
      this._resolve(value)
    } else {
      this._promise = Promise.resolve(value)
    }
  }
  toJSON() {
    return this._state
  }
}

export function prop<T>(value?: T): Prop<T> {
  return new Prop(value)
}

export type AnyProp = Prop<any>

export function anyProp(value?: any): Prop<any> {
  return new Prop(value)
}

export type StringProp = Prop<string>

export function stringProp(value?: string): Prop<string> {
  return new Prop(value)
}

export type BooleanProp = Prop<boolean>

export function booleanProp(
  value?: boolean
): Prop<boolean> {
  return new Prop(value)
}

export type NumberProp = Prop<number>

export function numberProp(value?: number): Prop<number> {
  return new Prop(value)
}

export type ArrayProp = Prop<any[]>

export function arrayProp(value?: any[]): Prop<any[]> {
  return new Prop(value)
}

export type RecordProp = Prop<Record<string, any>>

export function recordProp(
  value?: Record<string, any>
): Prop<Record<string, any>> {
  return new Prop(value)
}
