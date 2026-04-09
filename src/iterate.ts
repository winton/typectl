import type {
  PromiseOrValueType,
  IterableType,
  IterableCallbackType,
  RecordKeyType,
} from "./types"
import { getReadableStream } from "./polyfill"

/**
 * Iterates over an iterable — `ReadableStream`, array, or
 * plain-object record — invoking `callback` for each element.
 *
 * **Concurrency behaviour:**
 * - `ReadableStream`: items are processed **sequentially**;
 *   each callback is awaited before the next chunk is read.
 * - `Array`: all callbacks are fired **concurrently** via
 *   `Promise.all`. The completion order of async callbacks is
 *   therefore non-deterministic.
 * - `Record` (plain objects only — `Object.create(null)` or
 *   `{}` literals): same concurrent semantics as arrays,
 *   iterating own enumerable string keys (`Object.entries`).
 *   Class instances are not treated as records and are skipped.
 *
 * Both `iterable` and `callback` may themselves be
 * `Promise`-wrapped; they are resolved before iteration
 * begins.
 */
export async function iterate<
  I extends PromiseOrValueType<IterableType>,
  C extends PromiseOrValueType<IterableCallbackType<I>>,
>(iterable: I, callback: C) {
  ;[iterable, callback] = await Promise.all([
    iterable,
    callback,
  ])

  const ReadableStream = await getReadableStream()

  if (iterable instanceof ReadableStream) {
    const reader = iterable.getReader()

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      await (callback as (value?: any) => any)(value)
    }
  } else if (Array.isArray(iterable)) {
    await Promise.all(
      iterable.map((value, index) =>
        (callback as (value?: any, index?: number) => any)(
          value,
          index
        )
      )
    )
  } else if (
    iterable !== null &&
    typeof iterable === "object" &&
    (Object.getPrototypeOf(iterable) === Object.prototype ||
      Object.getPrototypeOf(iterable) === null)
  ) {
    await Promise.all(
      Object.entries(
        iterable as Record<string, unknown>
      ).map(([key, value]) =>
        (
          callback as (
            value?: any,
            key?: RecordKeyType
          ) => any
        )(value, key)
      )
    )
  }
}
