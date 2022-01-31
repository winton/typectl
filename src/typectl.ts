import { InType, OutType, RecordType } from "io-type"
import { ReadableStream } from "web-streams-polyfill/ponyfill"

export type RecordKeyType = string | number | symbol

export type IterableType =
  | Record<string, any>
  | any[]
  | ReadableStream<any>

export type IterableValueType<T> = T extends PropValueType<
  Record<RecordKeyType, infer V>
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

export async function map<
  IP extends IterableType | Prop<IterableType>,
  IV extends PropValueType<IP>,
  I extends IterableValueType<IV>
>(
  iterable: IP,
  options: {
    concurrency?: number
    array?: Prop<
      IV extends Record<RecordKeyType, I>
        ? [RecordKeyType, I][]
        : I[]
    >
    record?: Prop<Record<RecordKeyType, I>>
    stream?: Prop<
      ReadableStream<
        IV extends Record<RecordKeyType, I>
          ? [RecordKeyType, I]
          : I
      >
    >
  }
): Promise<void>

export async function map<
  IP extends IterableType | Prop<IterableType>,
  IV extends PropValueType<IP>,
  I extends IterableValueType<IV>,
  CO
>(
  iterable: IP,
  options: {
    concurrency?: number
    array?: Prop<CO[]>
    record?: Prop<Record<RecordKeyType, CO>>
    stream?: Prop<ReadableStream<CO>>
  },
  callback: IV extends Record<RecordKeyType, I>
    ? (
        value: I,
        key: RecordKeyType
      ) => typeof options["record"] extends Prop<
        Record<RecordKeyType, CO>
      >
        ? [RecordKeyType, CO] | Promise<[RecordKeyType, CO]>
        : CO | Promise<CO>
    : (
        value: I
      ) => typeof options["record"] extends Prop<
        Record<RecordKeyType, CO>
      >
        ? [RecordKeyType, CO] | Promise<[RecordKeyType, CO]>
        : CO | Promise<CO>
): Promise<void>

export async function map<
  IP extends IterableType | Prop<IterableType>,
  IV extends PropValueType<IP>,
  I extends IterableValueType<IV>,
  CO
>(
  iterable: IP,
  options: {
    concurrency?: number
    array?: Prop<CO[]>
    record?: Prop<Record<RecordKeyType, CO>>
    stream?: Prop<ReadableStream<CO>>
  },
  callback?: (
    value: I,
    key?: RecordKeyType
  ) => CO | Promise<CO>
): Promise<void> {
  if (options?.array) {
    const finalOutput = []

    await all(
      iterable,
      { concurrency: options.concurrency },
      async (value, key) =>
        finalOutput.push(
          callback
            ? await callback(value, key)
            : key
            ? [key, value]
            : value
        )
    )

    options.array.value = finalOutput

    if (iterable instanceof ReadableStream) {
      return
    }
  }

  if (options?.record) {
    const finalOutput: Record<RecordKeyType, CO> = {}

    await all(
      iterable,
      { concurrency: options.concurrency },
      async (value, key) => {
        const out = callback
          ? await callback(value, key)
          : [key, value]

        if (Array.isArray(out)) {
          const [k, v] = out
          finalOutput[k] = v
        }
      }
    )

    options.record.value = finalOutput

    if (iterable instanceof ReadableStream) {
      return
    }
  }

  if (options?.stream) {
    let streamController: ReadableStreamController<CO>

    const finalOutput = new ReadableStream<CO>({
      start(controller) {
        streamController = controller
      },
    })

    all(
      iterable,
      { concurrency: options.concurrency },
      async (v, k) =>
        streamController.enqueue(
          callback
            ? ((await callback(v, k)) as
                | CO
                | [RecordKeyType, CO])
            : k
            ? [k, v]
            : v
        )
    ).then(() => streamController.close())

    options.stream.value = finalOutput
  }
}

export async function all(
  input: IterableType | Prop<IterableType>,
  options?: {
    concurrency?: number
  },
  callback?: (value: any, key?: RecordKeyType) => any
) {
  const cb = callback
    ? options?.concurrency
      ? pLimit(options.concurrency, callback)
      : callback
    : undefined

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
              await (cb ? cb(value) : value)
              return stream.read().then(pump)
            }
          })
      }
      pump()
    })
  }

  if (Array.isArray(input)) {
    return Promise.all(cb ? input.map(cb) : input)
  }

  if (typeof input === "object" && input !== null) {
    const promises = []

    for (const key in input) {
      promises.push(cb ? cb(input[key], key) : input[key])
    }

    return Promise.all(promises)
  }
}

export async function each(
  input: IterableType | Prop<IterableType>
) {
  return all(input, { concurrency: 1 }, (v) => v())
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
    }

    if (value !== undefined) {
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

const wrapFunction = (from: any, to: any) =>
  Object.defineProperties(to, {
    length: { value: from.length },
    name: { value: from.name },
  })

// eslint-disable-next-line no-empty-function
const noop = () => {}

export function pLimit<Fn extends (...args: any[]) => any>(
  concurrency: number,
  fn: Fn
): ReturnType<Fn> extends PromiseLike<any> ? Fn : never {
  if (
    !Number.isSafeInteger(concurrency) ||
    concurrency <= 0
  ) {
    throw new TypeError(
      `Expected \`concurrency\` to be a positive integer: ${concurrency}`
    )
  }

  const pending = new Set()

  return wrapFunction(fn, async (...args: any[]) => {
    while (pending.size === concurrency) {
      await Promise.race(pending)
    }

    const promise = fn(...args)

    ;(async () => {
      const nonThrowingPromise = promise
        .then(noop, noop)
        .catch(noop)
      pending.add(nonThrowingPromise)
      await nonThrowingPromise
      pending.delete(nonThrowingPromise)
    })()

    return promise
  })
}
