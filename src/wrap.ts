import type {
  PromiseOrValueType,
  WrappedFunctionType,
} from "./types"

/**
 * WeakMap cache used by {@link wrap} to memoize wrapper
 * functions. The same original function reference always
 * returns the identical wrapper, avoiding redundant wrapping.
 *
 * @remarks Exposed for debugging; avoid mutating directly.
 */
export const wrapCache = new WeakMap()

/**
 * Wraps a function (or a `Promise` of a function) so that
 * each argument may be a plain value **or** a `Promise` of
 * that value. The wrapper resolves all arguments concurrently
 * with `Promise.all` before invoking the inner function, and
 * always returns a `Promise`.
 *
 * Wrappers are memoized per original reference via
 * {@link wrapCache}, so `wrap(fn) === wrap(fn)`.
 *
 * @example
 * const add = wrap((a: number, b: number) => a + b)
 * await add(Promise.resolve(1), 2) // → 3
 */
export function wrap<
  I extends PromiseOrValueType<(...any: any[]) => any>,
>(item: I): WrappedFunctionType<I, never> {
  const cached = wrapCache.get(item)

  if (cached) {
    return cached
  }

  const fn = ((...args: any[]) =>
    Promise.all(args).then(async (resolved) => {
      const inner = (await item) as (...any: any[]) => any
      return inner(...resolved)
    })) as any

  wrapCache.set(item, fn)

  return fn
}
