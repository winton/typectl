import type {
  PromiseOrValueType,
  IterableType,
  IterableValueType,
  MapCallbackType,
  RecordKeyType,
} from "./types"
import { iterate } from "./iterate"
import { getReadableStream } from "./polyfill"

export async function toArray<
  I extends PromiseOrValueType<IterableType>,
>(iterable: I): Promise<IterableValueType<I>[]>

export async function toArray<
  I extends PromiseOrValueType<IterableType>,
  C extends PromiseOrValueType<MapCallbackType<I, any[]>>,
>(
  iterable: I,
  callback: C
): Promise<
  C extends PromiseOrValueType<
    (
      ...any: any[]
    ) => PromiseOrValueType<(infer V)[] | infer V>
  >
    ? V[]
    : never
>

/**
 * Maps an iterable to a flat array. The optional `callback`
 * receives `(value, index|key, memo)` and may return:
 * - A single value → appended to the output array.
 * - An array → each non-`undefined` element is appended.
 * - `undefined` → item is filtered out (skipped).
 *
 * Without a callback, values are collected as-is and
 * `undefined` elements are filtered out.
 *
 * Array and record inputs are processed **concurrently**;
 * stream inputs are processed sequentially. See
 * {@link iterate} for details.
 */
export async function toArray<
  I extends PromiseOrValueType<IterableType>,
  C extends PromiseOrValueType<MapCallbackType<I, any[]>>,
>(iterable: I, callback?: C) {
  const output: any[] = []

  ;[iterable, callback] = await Promise.all([
    iterable,
    callback || (((v: any) => v) as any),
  ])

  await iterate(
    iterable as IterableType,
    async (...args: any[]) => {
      const out = await (
        callback as (...any: any[]) => any
      )(...args, output)

      if (Array.isArray(out)) {
        for (const v of out) {
          if (v !== undefined) {
            output.push(v)
          }
        }
      } else {
        if (out !== undefined) {
          output.push(out)
        }
      }
    }
  )

  return output
}

export async function toRecord<
  I extends PromiseOrValueType<IterableType>,
>(
  iterable: I
): Promise<Record<RecordKeyType, IterableValueType<I>>>

export async function toRecord<
  I extends PromiseOrValueType<IterableType>,
  C extends PromiseOrValueType<
    MapCallbackType<I, Record<RecordKeyType, any>>
  >,
>(
  iterable: I,
  callback: C
): Promise<
  C extends PromiseOrValueType<
    (
      ...any: any[]
    ) => PromiseOrValueType<Record<RecordKeyType, infer V>>
  >
    ? Record<RecordKeyType, V>
    : never
>

/**
 * Maps an iterable to a plain record. The optional `callback`
 * receives `(value, index|key, memo)` and must return a
 * partial record; results are merged (via `Object.assign`)
 * into the output.
 *
 * Without a callback, arrays are indexed by their numeric
 * index and records pass through as-is.
 *
 * Array and record inputs are processed **concurrently**. See
 * {@link iterate} for details.
 */
export async function toRecord<
  I extends PromiseOrValueType<IterableType>,
  C extends PromiseOrValueType<
    MapCallbackType<I, Record<RecordKeyType, any>>
  >,
>(iterable: I, callback?: C) {
  const output = {}

  ;[iterable, callback] = await Promise.all([
    iterable,
    callback ||
      (((v: any, i: RecordKeyType) => ({ [i]: v })) as any),
  ])

  await iterate(
    iterable as IterableType,
    async (...args: any[]) =>
      Object.assign(
        output,
        await (callback as (...any: any[]) => any)(
          ...args,
          output
        )
      )
  )

  return output
}

export async function toStream<
  I extends PromiseOrValueType<IterableType>,
>(
  iterable: I
): Promise<ReadableStream<IterableValueType<I>>>

export async function toStream<
  I extends PromiseOrValueType<IterableType>,
  C extends PromiseOrValueType<
    MapCallbackType<I, ReadableStreamController<any>>
  >,
>(
  iterable: I,
  callback: C
): Promise<
  C extends PromiseOrValueType<
    (...any: any[]) => PromiseOrValueType<infer V>
  >
    ? ReadableStream<V>
    : never
>

/**
 * Maps an iterable to a `ReadableStream`. The optional
 * `callback` receives `(value, index|key, controller)` and
 * should return the value to enqueue; returning `undefined`
 * skips enqueueing for that item.
 *
 * **Without a callback, the stream emits:**
 * - Arrays → `[index, value]` tuples.
 * - Records → `[key, value]` tuples.
 * - Streams → raw values (no index).
 *
 * Iteration runs asynchronously after the stream is returned;
 * errors from the callback propagate via
 * `ReadableStreamController#error`.
 */
export async function toStream<
  I extends PromiseOrValueType<IterableType>,
  C extends PromiseOrValueType<
    MapCallbackType<I, ReadableStreamController<any>>
  >,
>(iterable: I, callback?: C) {
  ;[iterable, callback] = await Promise.all([
    iterable,
    callback,
  ])

  const ReadableStream = await getReadableStream()

  let streamController: ReadableStreamController<any>

  const stream = new ReadableStream<any>({
    start(controller) {
      streamController = controller
    },
  })

  iterate(
    iterable as IterableType,
    async (...args: any[]) => {
      if (callback) {
        const value = (callback as (...any: any[]) => any)(
          ...args,
          streamController
        )

        if (value !== undefined) {
          return value.then
            ? value.then((v: any) =>
                streamController.enqueue(v)
              )
            : streamController.enqueue(value)
        }
      } else {
        streamController.enqueue(
          args[1] !== undefined
            ? [args[1], args[0]]
            : args[0]
        )
      }
    }
  ).then(
    () => streamController.close(),
    (err) => streamController.error(err)
  )

  return stream as any
}

export async function toValue<
  I extends PromiseOrValueType<IterableType>,
>(iterable: I): Promise<IterableValueType<I>>

export async function toValue<
  I extends PromiseOrValueType<IterableType>,
  C extends PromiseOrValueType<MapCallbackType<I, any>>,
>(
  iterable: I,
  callback: C
): Promise<
  C extends PromiseOrValueType<
    (...any: any[]) => PromiseOrValueType<infer V>
  >
    ? V
    : never
>

/**
 * Reduces an iterable to a single value. The optional
 * `callback` receives `(value, index|key, accumulator)` and
 * should return the next accumulator; returning `undefined`
 * leaves the accumulator unchanged.
 *
 * Without a callback, the last non-`undefined` element wins.
 *
 * All input types are processed **sequentially**, so stateful
 * accumulation is always deterministic regardless of whether
 * callbacks are async.
 *
 * @example
 * // Last element of an array
 * await toValue(["a", "b", "c"]) // → "c"
 */
export async function toValue<
  I extends PromiseOrValueType<IterableType>,
  C extends PromiseOrValueType<MapCallbackType<I, any>>,
>(iterable: I, callback?: C) {
  ;[iterable, callback] = await Promise.all([
    iterable,
    callback || (((v: any) => v) as any),
  ])

  const cb = callback as (...any: any[]) => any
  let value: any

  const apply = async (...args: any[]) => {
    const out = await cb(...args, value)
    if (out !== undefined) {
      value = out
    }
  }

  const ReadableStream = await getReadableStream()

  if (iterable instanceof ReadableStream) {
    await iterate(iterable as IterableType, apply)
  } else if (Array.isArray(iterable)) {
    for (let i = 0; i < (iterable as any[]).length; i++) {
      await apply((iterable as any[])[i], i)
    }
  } else if (typeof iterable === "object" && iterable !== null) {
    for (const [key, val] of Object.entries(
      iterable as Record<string, unknown>
    )) {
      await apply(val, key)
    }
  }

  return value
}
