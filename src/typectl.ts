export type RecordKeyType = string | number | symbol

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
  -readonly [P in keyof R]: R[P] extends Promise<infer T>
    ? T
    : R[P] extends (...any: any[]) => infer T
    ? PromiseInferType<T>
    : R[P]
}

export function wrap<
  I extends
    | ((...any: any[]) => any)
    | Promise<(...any: any[]) => any>
>(
  item: I
): I extends
  | ((...any: infer A) => infer T)
  | Promise<(...any: infer A) => infer T>
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
    array.map(async (value: any) =>
      typeof value === "function" ? value() : value
    )
  ) as unknown as Promise<ResolvedIterableType<T>>
}

export async function each<
  T extends readonly unknown[] | []
>(array: T): Promise<ResolvedIterableType<T>> {
  const output = []

  for (const value of array) {
    output.push(
      value instanceof Promise
        ? await value
        : typeof value === "function"
        ? await value()
        : value
    )
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
