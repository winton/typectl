import type {
  PickedValueType,
  PromiseInferType,
  WrappedFunctionType,
} from "./types"
import { wrap } from "./wrap"

/**
 * Picks a named property from an object or a `Promise` of an
 * object. If the property value is a function, it is
 * automatically wrapped with {@link wrap} (with `this` bound)
 * so callers can pass promise arguments. Non-function values
 * are returned as a resolved `Promise`.
 *
 * @throws {Error} If the resolved object is `undefined`.
 *
 * @example
 * const plusOne = await pick(import("./math"), "plusOne")
 * await plusOne(Promise.resolve(1)) // → 2
 */
export function pick<
  T extends Promise<Record<any, any>> | Record<any, any>,
  K extends keyof (T extends Promise<any>
    ? PromiseInferType<T>
    : T),
>(p: T, k: K): PickedValueType<T, K> {
  return Promise.resolve(p).then((v: any) => {
    if (v === undefined) {
      throw new Error("`pick` received undefined value")
    }
    return typeof v[k] === "function"
      ? wrap(v[k].bind(v))
      : v[k]
  }) as PickedValueType<T, K>
}

/**
 * Picks a named property from an object (or `Promise` of one)
 * and unconditionally wraps it with {@link wrap}. Unlike
 * {@link pick}, the returned `Promise` always resolves to a
 * wrapped function — useful when you need to guarantee that a
 * known-function property goes through `wrap` even when the
 * object type is broad.
 *
 * @remarks Because this function is `async`, it must be
 * `await`ed or passed as a `Promise` argument to another
 * wrapped function.
 */
export async function wrapPick<
  T extends Promise<Record<any, any>> | Record<any, any>,
  V extends T extends Promise<infer V>
    ? Exclude<V, undefined>
    : Exclude<T, undefined>,
  K extends keyof V,
>(
  item: T,
  k: K
): Promise<WrappedFunctionType<V[K], never>> {
  const fn = await pick(item, k)
  return wrap(fn)
}

/**
 * Splits a `ReadableStream` (or `Promise` thereof) into two
 * independent streams that both emit all the same values,
 * using the native `ReadableStream#tee()` method.
 *
 * @returns A tuple of two `Promise<ReadableStream>` values
 * that can be consumed independently.
 *
 * @example
 * const [s1, s2] = tee(myStream)
 * // Read s1 and s2 independently without interfering.
 */
export function tee<
  T extends
    | ReadableStream<any>
    | Promise<ReadableStream<any>>,
  V extends T extends Promise<infer V>
    ? Exclude<V, undefined>
    : Exclude<T, undefined>,
>(
  v: T
): [
  Promise<
    ReadableStream<
      V extends ReadableStream<infer U> ? U : any
    >
  >,
  Promise<
    ReadableStream<
      V extends ReadableStream<infer U> ? U : any
    >
  >,
] {
  const promise = Promise.resolve(v).then((v) => v.tee())
  const stream1 = pick(promise, 0)
  const stream2 = pick(promise, 1)
  return [stream1, stream2]
}
