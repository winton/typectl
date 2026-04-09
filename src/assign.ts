import type { PromiseOrValueType } from "./types"

export async function assign<T, U>(
  target: PromiseOrValueType<T>,
  source: PromiseOrValueType<U>
): Promise<T & U>

export async function assign<T, U, V>(
  target: PromiseOrValueType<T>,
  source: PromiseOrValueType<U>,
  source2: PromiseOrValueType<V>
): Promise<T & U & V>

/**
 * Resolves all arguments concurrently, then merges them into
 * the target object with `Object.assign`. Analogous to
 * `Object.assign` but each argument may be a `Promise`.
 *
 * @example
 * const merged = await assign(
 *   Promise.resolve({ a: 1 }),
 *   { b: 2 }
 * )
 * // → { a: 1, b: 2 }
 */
export async function assign(
  target: PromiseOrValueType<any>,
  ...sources: PromiseOrValueType<any>[]
): Promise<any> {
  return Object.assign(
    ...(await Promise.all([target, ...sources]))
  )
}
