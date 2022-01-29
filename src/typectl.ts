import { InType, OutType, RecordType } from "io-type"
import { ReadableStream } from "web-streams-polyfill/ponyfill"

export type RecordKeyType = string | number | symbol

export type IterableType =
  | Record<string, any>
  | any[]
  | ReadableStream<any>

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

export async function map<I extends IterableType, CV>(
  iterable: I,
  callback: (
    value: IterableValueType<I>,
    key?: RecordKeyType
  ) => CV | [RecordKeyType, CV],
  output: {
    array?: Prop<CV[]>
    record?: Prop<Record<RecordKeyType, CV>>
    stream?: Prop<ReadableStream<CV>>
  }
) {
  if (output.array) {
    const finalOutput = []

    await iterate(iterable, async (value, key) =>
      finalOutput.push(await callback(value, key))
    )

    output.array.value = finalOutput
  }

  if (output.record) {
    const finalOutput: Record<RecordKeyType, CV> = {}

    await iterate(iterable, async (value, key) => {
      const out = await callback(value, key)
      if (Array.isArray(out)) {
        const [k, v] = out
        finalOutput[k] = v
      }
    })

    output.record.value = finalOutput
  }

  if (output.stream) {
    let streamController: ReadableStreamController<CV>

    const finalOutput = new ReadableStream({
      start(controller) {
        streamController = controller
      },
    })

    iterate(iterable, async (v, k) =>
      streamController.enqueue((await callback(v, k)) as CV)
    ).then(() => streamController.close())

    output.stream.value = finalOutput
  }
}

export async function all<
  T extends readonly unknown[] | []
>(...input: T) {
  return Promise.all(input)
}

export async function each<
  T extends readonly (() => unknown)[] | []
>(
  ...input: T
): Promise<{
  [P in keyof T]: Awaited<
    T[P] extends () => infer U ? U : any
  >
}> {
  const out: any = []
  for (const i of input) {
    out.push(await i())
  }
  return out
}

export async function iterate(
  input: IterableType | Prop<IterableType>,
  callback: (value: any, key?: RecordKeyType) => any
) {
  if (input instanceof Prop) {
    input = await input.promise
  }

  if (input instanceof ReadableStream) {
    const stream = input.getReader()
    return new Promise<void>((resolve) => {
      const pump = () => {
        return stream
          .read()
          .then(async ({ done, value }) => {
            if (done) {
              resolve()
            } else {
              await callback(value)
              return stream.read().then(pump)
            }
          })
      }
      pump()
    })
  } else if (Array.isArray(input)) {
    await Promise.all(input.map(callback))
  } else if (typeof input === "object" && input !== null) {
    const promises = []
    for (const key in input) {
      promises.push(callback(input[key], key))
    }
    await Promise.all(promises)
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
