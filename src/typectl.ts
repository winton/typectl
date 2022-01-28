import { InType, OutType, RecordType } from "io-type"
import { ReadableStream } from "web-streams-polyfill/ponyfill"

export type RecordKeyType = string | number | symbol

export type IterableType =
  | Record<string, any>
  | any[]
  | ReadableStream

export type IterableValueType<T> = T extends Record<
  RecordKeyType,
  infer V
>
  ? V
  : T extends (infer V)[]
  ? V
  : T extends ReadableStream<infer V>
  ? V
  : any

export type PropValueType<T> = T extends Prop<infer U>
  ? U
  : T

export type ImportFunctionType = PromiseLike<{
  default: (...any: any[]) => any
}>

export type ImportType<T> = T extends PromiseLike<infer A>
  ? A
  : never

export type ImportInType<T extends ImportFunctionType> =
  InType<ImportType<T>["default"]>

export type ImportOutType<T extends ImportFunctionType> =
  OutType<ImportType<T>["default"]>

export type InputPropRecordType<Obj extends RecordType> = {
  [P in keyof Obj]: Obj[P] | Prop<Obj[P]>
}

export type OutputPropRecordType<Obj extends RecordType> = {
  [P in keyof Obj]?: Prop<Obj[P]>
}

export async function call<
  F extends ImportFunctionType,
  I extends InputPropRecordType<ImportInType<F>>,
  O extends OutputPropRecordType<ImportOutType<F>>
>(...input: [F, I, O]) {
  const [fn, fnInput, fnOutput] = input

  const finalFnInput: Record<string, any> = {}
  const promises = []

  for (const key in fnInput) {
    if (
      fnInput[key] instanceof Prop &&
      !key.endsWith("Prop")
    ) {
      promises.push(
        (async () =>
          (finalFnInput[key] = await fnInput[key]
            .promise))()
      )
    } else {
      finalFnInput[key] = fnInput[key]
    }
  }

  await Promise.all(promises)

  const out = (await fn).default(finalFnInput)

  for (const key in fnOutput) {
    fnOutput[key].value = out[key]
  }
}

export async function all(...input: Promise<any>[]) {
  return Promise.all(input)
}

export async function each(
  ...input: (() => Promise<any>)[]
) {
  for (const i of input) {
    await i()
  }
}

export async function mapToStream<
  T,
  I extends IterableType | Prop<IterableType>,
  IV extends PropValueType<I>
>(
  input: I,
  output: Prop<ReadableStream<T>>,
  fn: (
    value: IterableValueType<IV>,
    key?: RecordKeyType
  ) => T
) {
  let streamController: ReadableStreamController<T>

  const finalOutput = new ReadableStream({
    start(controller) {
      streamController = controller
    },
  })

  iterate(
    input,
    (v, k) => streamController.enqueue(fn(v, k)),
    () => streamController.close()
  )

  output.value = finalOutput
}

export async function mapToArray<
  T,
  I extends IterableType | Prop<IterableType>,
  IV extends PropValueType<I>
>(
  input: I,
  output: Prop<T[]>,
  fn: (
    value: IterableValueType<IV>,
    key?: RecordKeyType
  ) => T
) {
  const finalOutput = []
  iterate(input, (v, k) => finalOutput.push(fn(v, k)))
  output.value = finalOutput
}

export async function mapToRecord<
  K extends RecordKeyType,
  V,
  I extends IterableType | Prop<IterableType>,
  IV extends PropValueType<I>
>(
  input: I,
  output: Prop<Record<K, V>>,
  fn: (
    value: IterableValueType<IV>,
    key?: RecordKeyType
  ) => [K, V]
) {
  const finalOutput: Record<RecordKeyType, V> = {}

  iterate(input, (value, key) => {
    const [k, v] = fn(value, key)
    finalOutput[k] = v
  })

  output.value = finalOutput
}

export async function iterate(
  input: IterableType | Prop<IterableType>,
  callback: (value: any, key?: RecordKeyType) => void,
  complete?: () => void
) {
  if (input instanceof Prop) {
    input = await input.promise
  }

  if (input instanceof ReadableStream) {
    const stream = input.getReader()
    const pump = () => {
      return stream.read().then(({ done, value }) => {
        if (done) {
          complete()
        } else {
          callback(value)
          return stream.read().then(pump)
        }
      })
    }
    pump()
  } else if (Array.isArray(input)) {
    for (const value of input) {
      callback(value)
    }
    complete()
  } else if (typeof input === "object" && input !== null) {
    for (const key in input) {
      callback(input[key], key)
    }
    complete()
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
