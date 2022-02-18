import { InType, OutType, RecordType } from "io-type"
import { ReadableStream } from "web-streams-polyfill/ponyfill"

export type RecordKeyType = string | number | symbol

export type ImportPromiseType = PromiseLike<{
  default: (...any: any[]) => any
}>

export type IterableType =
  | Record<string, any>
  | any[]
  | ReadableStream<any>

export type IterableValueType<T> = T extends PromiseType<
  Record<RecordKeyType, infer V>
>
  ? V
  : T extends (infer V)[]
  ? V
  : T extends ReadableStream<infer V>
  ? V
  : any

export type PromiseType<T> = T extends Promise<infer U>
  ? U
  : T

export type PromiseOrValue<T> = Promise<T> | T

export type PromiseValueType<Obj extends RecordType> = {
  [P in keyof Obj]: Obj[P] | Promise<Obj[P]>
}

export type NoPromiseValueType<T> = {
  [K in keyof T]: PromiseType<T[K]>
}

export type ImportInType<T extends ImportPromiseType> =
  InType<ImportType<T>["default"]>

export type ImportOutType<T extends ImportPromiseType> =
  OutType<ImportType<T>["default"]>

export type ImportType<T> = T extends PromiseLike<infer A>
  ? A
  : never

export interface MapCallbackValue<V> {
  array?: PromiseOrValue<V[]>
  record?: PromiseOrValue<Record<RecordKeyType, V>>
  stream?: PromiseOrValue<ReadableStream<V>>
  value?: PromiseOrValue<V>
}

export interface MapReturnValue<V> {
  array?: V[]
  record?: Record<RecordKeyType, V>
  stream?: ReadableStream<V>
  value?: V
}

export async function waitForValues<
  R extends Record<RecordKeyType, PromiseOrValue<any>>
>(record: R): Promise<Partial<NoPromiseValueType<R>>> {
  const out: Partial<NoPromiseValueType<R>> = {}
  const promises = []

  for (const key in record) {
    if (
      (record[key] as any) instanceof Promise &&
      !key.endsWith("Promise")
    ) {
      promises.push(
        record[key].then((v: any) => (out[key] = v))
      )
    } else {
      out[key] = record[key]
    }
  }

  await Promise.all(promises)
  return out
}

export async function call<
  P extends ImportPromiseType,
  I extends PromiseValueType<ImportInType<P>>
>(importPromise: P, input: I): Promise<ImportOutType<P>> {
  return (await importPromise).default(
    await waitForValues(input)
  )
}

export async function all<
  IP extends PromiseOrValue<IterableType>,
  IV extends PromiseType<IP>,
  I extends IterableValueType<IV>
>(
  input: {
    iterable: IP
    concurrency?: number
  },
  callback?: IV extends Record<RecordKeyType, I>
    ? (value: I, key: RecordKeyType) => PromiseOrValue<any>
    : (value: I) => PromiseOrValue<any>
) {
  const iterable =
    input.iterable instanceof Promise
      ? await input.iterable
      : input.iterable

  const cb: (value: I, key?: RecordKeyType) => any =
    callback
      ? input.concurrency
        ? pLimit(input.concurrency, callback)
        : callback
      : undefined

  if (iterable instanceof ReadableStream) {
    const stream = iterable.getReader()

    const pump = () => {
      return stream.read().then(async ({ done, value }) => {
        if (!done) {
          await (cb ? cb(value) : value)
          return pump()
        }
      })
    }
    pump()
  } else if (Array.isArray(iterable)) {
    return Promise.all(
      cb ? iterable.map((value) => cb(value)) : iterable
    )
  } else if (
    typeof iterable === "object" &&
    iterable !== null
  ) {
    const promises = []

    for (const key in iterable as Record<string, any>) {
      promises.push(
        cb ? cb(iterable[key], key) : iterable[key]
      )
    }

    return Promise.all(promises)
  }
}

export async function each(
  input: IterableType | Promise<IterableType>
) {
  return all({ iterable: input, concurrency: 1 }, (v) =>
    v()
  )
}

export async function map<
  IP extends IterableType | Promise<IterableType>,
  IV extends PromiseType<IP>,
  I extends IterableValueType<IV>,
  CV
>(
  input: {
    iterable: IP
    compress?: boolean
    concurrency?: number
    keepOpen?: boolean
  },
  callback?: IV extends Record<RecordKeyType, I>
    ? (
        value: I,
        key: RecordKeyType
      ) => PromiseOrValue<MapCallbackValue<CV>>
    : (value: I) => PromiseOrValue<MapCallbackValue<CV>>
): Promise<MapReturnValue<CV>> {
  const output: MapReturnValue<CV> = {}

  await all(
    {
      iterable: input.iterable,
      concurrency: input.concurrency,
    },
    async (...cbInput: [any, RecordKeyType?]) => {
      const cbOutput = await callback(...cbInput)

      const { array, record, stream, value } =
        await waitForValues(cbOutput)

      let streamController: ReadableStreamController<CV>

      if (array) {
        output.array = output.array || []
        for (const value of array) {
          if (!input.compress || value !== undefined) {
            output.array.push(value)
          }
        }
      } else if (record) {
        output.record = output.record || {}
        for (const key in record) {
          if (
            !input.compress ||
            record[key] !== undefined
          ) {
            output.record[key] = record[key]
          }
        }
      } else if (stream) {
        output.stream =
          output.stream ||
          new ReadableStream<CV>({
            start(controller) {
              streamController = controller
            },
          })

        const reader = stream.getReader()

        const pump = () => {
          return reader.read().then(({ done, value }) => {
            if (done) {
              if (!input.keepOpen) {
                streamController.close()
              }
            } else {
              if (!input.compress || value !== undefined) {
                streamController.enqueue(value)
              }
              return pump()
            }
          })
        }
        pump()
      } else if (value) {
        output.value = output.value || (value as CV)
      }
    }
  )

  return output
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
