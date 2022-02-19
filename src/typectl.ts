import { ReadableStream } from "web-streams-polyfill/ponyfill"

export type RecordKeyType = string | number | symbol

export type IterableType =
  | ReadableStream<any>
  | Record<RecordKeyType, any>
  | any[]

export type PromiseOrValueType<T> = Promise<T> | T

export type PromiseInferType<T> = T extends PromiseLike<
  infer A
>
  ? A
  : T

export type PickedValueType<
  T extends Promise<Record<any, any>> | Record<any, any>,
  K extends RecordKeyType
> = T extends Promise<any>
  ? Promise<PromiseInferType<T>[K]>
  : Promise<T[K]>

export type OptionalPromiseArgsType<T> = {
  [K in keyof T]: T[K] | Promise<T[K]>
}

export type ResolvedIterableType<R> = {
  -readonly [P in keyof R]: R[P] extends PromiseOrValueType<
    (...any: any[]) => infer T
  >
    ? PromiseInferType<T>
    : R[P] extends Promise<infer T>
    ? T
    : R[P]
}

export function wrap<
  I extends PromiseOrValueType<(...any: any[]) => any>
>(
  item: I
): I extends PromiseOrValueType<
  (...any: infer A) => infer T
>
  ? (
      ...any: OptionalPromiseArgsType<A>
    ) => Promise<PromiseInferType<T>>
  : never {
  if (item["_typectl"]) {
    return item as any
  }

  const fn = ((...args: any[]) =>
    Promise.all(args).then(async (args) => {
      const fn = (await item) as (...any: any[]) => any
      return fn(...args)
    })) as any

  fn._typectl = true

  return fn
}

export function all<T extends readonly unknown[] | []>(
  array: T
): Promise<ResolvedIterableType<T>> {
  return Promise.all(
    array.map(promiseCall)
  ) as unknown as Promise<ResolvedIterableType<T>>
}

export async function each<
  T extends readonly unknown[] | []
>(array: T): Promise<ResolvedIterableType<T>> {
  const output = []

  for (const value of array) {
    output.push(await promiseCall(value))
  }

  return output as unknown as ResolvedIterableType<T>
}

export function pick<
  T extends Promise<any> | any,
  K extends keyof (T extends Promise<infer V> ? V : T)
>(p: T, k: K): PickedValueType<T, K> {
  return Promise.resolve(p).then(
    (v) => (v as any)[k]
  ) as PickedValueType<T, K>
}

export async function promiseCall(value: any) {
  value = await value

  if (typeof value === "function") {
    return value()
  }

  return value
}

export async function iterate<
  I extends PromiseOrValueType<IterableType>
>(
  iterable: I,
  callback: I extends PromiseOrValueType<
    ReadableStream<infer V>
  >
    ? PromiseOrValueType<(value?: V) => any>
    : I extends PromiseOrValueType<
        Record<RecordKeyType, infer V>
      >
    ? PromiseOrValueType<(value?: V, key?: string) => any>
    : I extends PromiseOrValueType<(infer V)[]>
    ? PromiseOrValueType<(value?: V, index?: number) => any>
    : never
) {
  if (iterable instanceof Promise) {
    iterable = await iterable
  }

  if (callback instanceof Promise) {
    callback = await callback
  }

  if (iterable instanceof ReadableStream) {
    const stream = iterable.getReader()

    const pump = async () => {
      const { done, value } = await stream.read()

      if (!done) {
        await (callback as (value?: any) => any)(value)
        return pump()
      }
    }

    pump()
  } else if (Array.isArray(iterable)) {
    await Promise.all(
      iterable.map((value, index) =>
        (callback as (value?: any, index?: number) => any)(
          value,
          index
        )
      )
    )
  } else if (typeof iterable === "object") {
    const promises = []

    for (const key in iterable) {
      promises.push(
        (
          callback as (
            value?: any,
            key?: RecordKeyType
          ) => any
        )(iterable[key], key)
      )
    }

    await Promise.all(promises)
  }
}
