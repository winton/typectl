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
>(fn: F, input: I, output?: O) {
  const finalInput: Record<string, any> = {}
  const promises = []

  for (const key in input) {
    if (
      input[key] instanceof Prop &&
      !key.endsWith("Prop")
    ) {
      promises.push(
        (async () =>
          (finalInput[key] = await input[key].promise))()
      )
    } else {
      finalInput[key] = input[key]
    }
  }

  await Promise.all(promises)

  const out = await (await fn).default(finalInput)

  if (output) {
    for (const key in output) {
      output[key].value = out[key]
    }
  }
}

export async function map<
  IP extends IterableType | Prop<IterableType>,
  IV extends PropValueType<IP>,
  I extends IterableValueType<IV>
>(
  iterable: IP,
  options: {
    compress?: boolean
    array: Prop<
      IV extends Record<RecordKeyType, I>
        ? [RecordKeyType, I][]
        : I[]
    >
  }
): Promise<void>

export async function map<
  IP extends IterableType | Prop<IterableType>,
  IV extends PropValueType<IP>,
  I extends IterableValueType<IV>
>(
  iterable: IP,
  options: {
    compress?: boolean
    record: Prop<Record<RecordKeyType, I>>
  }
): Promise<void>

export async function map<
  IP extends IterableType | Prop<IterableType>,
  IV extends PropValueType<IP>,
  I extends IterableValueType<IV>
>(
  iterable: IP,
  options: {
    compress?: boolean
    stream: Prop<
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
  I extends IterableValueType<IV>
>(
  iterable: IP,
  options: {
    compress?: boolean
    value: Prop<
      IV extends Record<RecordKeyType, I>
        ? [RecordKeyType, I]
        : I
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
    compress?: boolean
    concurrency?: number
    array: Prop<CO[]>
  },
  callback: IV extends Record<RecordKeyType, I>
    ? (
        value: I,
        key: RecordKeyType,
        output: Prop<CO>
      ) => void
    : (value: I, output: Prop<CO>) => void
): Promise<void>

export async function map<
  IP extends IterableType | Prop<IterableType>,
  IV extends PropValueType<IP>,
  I extends IterableValueType<IV>,
  CO
>(
  iterable: IP,
  options: {
    compress?: boolean
    concurrency?: number
    record: Prop<Record<RecordKeyType, CO>>
  },
  callback: IV extends Record<RecordKeyType, I>
    ? (
        value: I,
        key: RecordKeyType,
        output: Prop<[RecordKeyType, CO]>
      ) => void
    : (value: I, output: Prop<[RecordKeyType, CO]>) => void
): Promise<void>

export async function map<
  IP extends IterableType | Prop<IterableType>,
  IV extends PropValueType<IP>,
  I extends IterableValueType<IV>,
  CO
>(
  iterable: IP,
  options: {
    compress?: boolean
    concurrency?: number
    keepOpen?: boolean
    stream: Prop<ReadableStream<CO>>
    streamController?: Prop<ReadableStreamController<CO>>
  },
  callback: IV extends Record<RecordKeyType, I>
    ? (
        value: I,
        key: RecordKeyType,
        output: Prop<CO>
      ) => void
    : (value: I, output: Prop<CO>) => void
): Promise<void>

export async function map<
  IP extends IterableType | Prop<IterableType>,
  IV extends PropValueType<IP>,
  I extends IterableValueType<IV>,
  CO
>(
  iterable: IP,
  options: {
    compress?: boolean
    concurrency?: number
    value: Prop<CO>
  },
  callback: IV extends Record<RecordKeyType, I>
    ? (
        value: I,
        key: RecordKeyType,
        output: Prop<CO>
      ) => void
    : (value: I, output: Prop<CO>) => void
): Promise<void>

export async function map<
  IP extends IterableType | Prop<IterableType>,
  IV extends PropValueType<IP>,
  I extends IterableValueType<IV>,
  CO
>(
  iterable: IP,
  options: {
    compress?: boolean
    concurrency?: number
    keepOpen?: boolean
    array?: Prop<CO[]>
    record?: Prop<Record<RecordKeyType, CO>>
    stream?: Prop<ReadableStream<CO>>
    streamController?: Prop<ReadableStreamController<CO>>
    value?: Prop<CO>
  },
  callback?: (
    value: I,
    keyOrOutput:
      | RecordKeyType
      | Prop<CO>
      | Prop<[RecordKeyType, CO]>,
    output?: Prop<CO> | Prop<[RecordKeyType, CO]>
  ) => void | Promise<void>
): Promise<void> {
  if (options?.array) {
    const finalOutput = []

    await all(
      iterable,
      { concurrency: options.concurrency },
      async (...args: [any, RecordKeyType]) => {
        const [value, key] = args

        if (callback) {
          const outProp = prop<CO>()

          callback(...args, outProp)

          const out = await outProp.promise

          if (!options.compress || out !== undefined) {
            finalOutput.push(out)
          }
        } else if (
          !options.compress ||
          value !== undefined
        ) {
          finalOutput.push(key ? [key, value] : value)
        }
      }
    )

    options.array.value = finalOutput
  } else if (options?.record) {
    const finalOutput: Record<RecordKeyType, CO> = {}

    await all(
      iterable,
      { concurrency: options.concurrency },
      async (...args: [any, RecordKeyType]) => {
        const [value, key] = args
        const outProp = prop<[RecordKeyType, CO]>()

        if (callback) {
          callback(...args, outProp)
        } else {
          outProp.value = [key, value]
        }

        const out = await outProp.promise

        if (Array.isArray(out)) {
          const [k, v] = out

          if (!options.compress || v !== undefined) {
            finalOutput[k] = v
          }
        }
      }
    )

    options.record.value = finalOutput
  } else if (options?.value) {
    let finalOutput: CO

    await all(
      iterable,
      { concurrency: options.concurrency },
      async (...args: [any, RecordKeyType]) => {
        if (finalOutput) {
          return
        }

        const [value, key] = args

        if (callback) {
          const outProp = prop<CO>()

          callback(...args, outProp)

          const out = await outProp.promise

          if (!options.compress || out !== undefined) {
            finalOutput = out
          }
        } else if (
          !options.compress ||
          value !== undefined
        ) {
          finalOutput = key ? [key, value] : value
        }
      }
    )

    options.value.value = finalOutput
  } else if (options?.stream) {
    let streamController: ReadableStreamController<CO>

    const finalOutput = new ReadableStream<CO>({
      start(controller) {
        streamController = controller

        if (options.streamController) {
          options.streamController.value = controller
        }
      },
    })

    all(
      iterable,
      { concurrency: options.concurrency },
      async (...args: [any, RecordKeyType]) => {
        const [value, key] = args

        if (callback) {
          const outProp = prop<CO>()

          callback(...args, outProp)

          const out = await outProp.promise

          if (!options.compress || out !== undefined) {
            streamController.enqueue(out)
          }
        } else if (
          !options.compress ||
          value !== undefined
        ) {
          streamController.enqueue(
            key ? [key, value] : value
          )
        }
      }
    ).then(
      () => options.keepOpen || streamController.close()
    )

    options.stream.value = finalOutput
  }
}

export async function all<
  IP extends IterableType | Prop<IterableType>,
  IV extends PropValueType<IP>,
  I extends IterableValueType<IV>
>(
  iterable: IP,
  options?: {
    concurrency?: number
  },
  callback?: IV extends Record<RecordKeyType, I>
    ? (value: I, key: RecordKeyType) => void | Promise<void>
    : (value: I) => void | Promise<void>
) {
  const cb = callback
    ? options?.concurrency
      ? pLimit(options.concurrency, callback)
      : callback
    : undefined

  let input: IV

  if (iterable instanceof Prop) {
    input = (await iterable.promise) as IV
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
              await (cb
                ? (cb as (value: I) => void)(value)
                : value)
              return pump()
            }
          })
      }
      pump()
    })
  } else if (Array.isArray(input)) {
    return Promise.all(
      cb
        ? input.map((v) => (cb as (value: I) => void)(v))
        : input
    )
  } else if (typeof input === "object" && input !== null) {
    const promises = []

    for (const key in input as Record<string, any>) {
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

export function pairKey<V>(
  key: RecordKeyType,
  output: Prop<[RecordKeyType, V]>
): Prop<V> {
  const value = prop<V>()
  value.promise.then((v) => (output.value = [key, v]))
  return value
}

export function pairValue<V>(
  value: V,
  output: Prop<[RecordKeyType, V]>
): Prop<RecordKeyType> {
  const key = prop<RecordKeyType>()
  key.promise.then((k) => (output.value = [k, value]))
  return key
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
