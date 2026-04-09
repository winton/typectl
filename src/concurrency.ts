import type {
  PromiseCallsType,
  PromiseCallType,
} from "./types"

/**
 * Resolves a value: if the resolved result is a zero-argument
 * function it is called and its return value is used;
 * otherwise the resolved value is returned as-is. This is the
 * primitive used by {@link all} and {@link each}.
 */
export async function promiseCall<V>(
  value: V
): Promise<PromiseCallType<V>> {
  const resolved = await value

  if (typeof resolved === "function") {
    return resolved()
  }

  return resolved as any
}

/**
 * Executes all elements of a tuple **concurrently**. Each
 * element may be a plain value, a `Promise`, or a
 * zero-argument function (sync or async). Returns a `Promise`
 * of the resolved results in the same positional order.
 *
 * Use {@link each} when side effects must run sequentially.
 *
 * @example
 * const [a, b] = await all([fetchA(), () => computeB()])
 */
export function all<T extends readonly unknown[] | []>(
  array: T
): Promise<PromiseCallsType<T>> {
  return Promise.all(
    array.map(promiseCall)
  ) as unknown as Promise<PromiseCallsType<T>>
}

/**
 * Executes all elements of a tuple **sequentially**, awaiting
 * each before starting the next. Each element may be a plain
 * value, a `Promise`, or a zero-argument function. Returns a
 * `Promise` of the resolved results in order.
 *
 * Use this instead of {@link all} when the order of side
 * effects matters.
 *
 * @example
 * const [a, b] = await each([stepOne, stepTwo])
 */
export async function each<
  T extends readonly unknown[] | [],
>(array: T): Promise<PromiseCallsType<T>> {
  const output = []

  for (const value of array) {
    output.push(await promiseCall(value))
  }

  return output as unknown as PromiseCallsType<T>
}
