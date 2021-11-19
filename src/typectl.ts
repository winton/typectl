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

export type PropType<T> = {
  get: () => T
  toJSON: () => T
  set: (value: T) => T
}

export function prop<T>(store?: T): PropType<T> {
  return {
    get: function () {
      return store
    },
    toJSON: function () {
      return store
    },
    set: function (value: T) {
      return (store = value)
    },
  }
}
