export type RecordKeyType = string | number | symbol

export type IterableType =
  | ReadableStream<any>
  | Record<RecordKeyType, any>
  | any[]

export type IterableCallbackType<I> =
  I extends PromiseOrValueType<ReadableStream<infer V>>
    ? PromiseOrValueType<(value?: V) => any>
    : I extends PromiseOrValueType<
        Record<RecordKeyType, infer V>
      >
    ? PromiseOrValueType<(value?: V, key?: string) => any>
    : I extends PromiseOrValueType<(infer V)[]>
    ? PromiseOrValueType<(value?: V, index?: number) => any>
    : never

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

export type PromiseCallsType<R> = {
  -readonly [P in keyof R]: PromiseCallType<R[P]>
}

export type PromiseCallType<T> =
  T extends PromiseOrValueType<(...any: any[]) => infer V>
    ? PromiseInferType<V>
    : T extends Promise<infer V>
    ? V
    : T

export async function getReadableStream() {
  if (typeof ReadableStream === "undefined") {
    return (
      await import("web-streams-polyfill/ponyfill/es2018")
    ).ReadableStream
  } else {
    return ReadableStream
  }
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
): Promise<PromiseCallsType<T>> {
  return Promise.all(
    array.map(promiseCall)
  ) as unknown as Promise<PromiseCallsType<T>>
}

export async function each<
  T extends readonly unknown[] | []
>(array: T): Promise<PromiseCallsType<T>> {
  const output = []

  for (const value of array) {
    output.push(await promiseCall(value))
  }

  return output as unknown as PromiseCallsType<T>
}

export function pick<
  T extends Promise<any> | any,
  K extends keyof (T extends Promise<infer V> ? V : T)
>(p: T, k: K): PickedValueType<T, K> {
  return Promise.resolve(p).then(
    (v) => (v as any)[k]
  ) as PickedValueType<T, K>
}

export async function promiseCall<V>(
  value: V
): Promise<PromiseCallType<V>> {
  value = await value

  if (typeof value === "function") {
    return value()
  }

  return value as any
}

export async function iterate<
  I extends PromiseOrValueType<IterableType>,
  C extends IterableCallbackType<I>
>(iterable: I, callback: C) {
  ;[iterable, callback] = await Promise.all([
    iterable,
    callback,
  ])

  const ReadableStream = await getReadableStream()

  if (iterable instanceof ReadableStream) {
    const stream = iterable.getReader()

    const pump = async () => {
      const { done, value } = await stream.read()

      if (!done) {
        await (callback as (value?: any) => any)(value)
        return pump()
      }
    }

    await pump()
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

export async function toArray<
  I extends PromiseOrValueType<IterableType>,
  C extends IterableCallbackType<I>
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
> {
  const output = []

  ;[iterable, callback] = await Promise.all([
    iterable,
    callback,
  ])

  await iterate(
    iterable as IterableType,
    async (...args: any[]) => {
      const out = await (
        callback as (...any: any[]) => any
      )(...args)

      if (Array.isArray(out)) {
        for (const v of out) {
          output.push(v)
        }
      } else {
        output.push(out)
      }
    }
  )

  return output as any
}

export async function toRecord<
  I extends PromiseOrValueType<IterableType>,
  C extends IterableCallbackType<I>
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
> {
  const output = {}

  ;[iterable, callback] = await Promise.all([
    iterable,
    callback,
  ])

  await iterate(
    iterable as IterableType,
    async (...args: any[]) =>
      Object.assign(
        output,
        await (callback as (...any: any[]) => any)(...args)
      )
  )

  return output as any
}

export async function toStream<
  I extends PromiseOrValueType<IterableType>,
  C extends IterableCallbackType<I>
>(
  iterable: I,
  callback: C
): Promise<
  C extends PromiseOrValueType<
    (...any: any[]) => PromiseOrValueType<infer V>
  >
    ? ReadableStream<V>
    : never
> {
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

  await iterate(
    iterable as IterableType,
    async (...args: any[]) => {
      streamController.enqueue(
        await (callback as (...any: any[]) => any)(...args)
      )
    }
  )

  return stream as any
}

export async function toValue<
  I extends PromiseOrValueType<IterableType>,
  C extends IterableCallbackType<I>
>(
  iterable: I,
  callback: C
): Promise<
  C extends PromiseOrValueType<
    (...any: any[]) => PromiseOrValueType<infer V>
  >
    ? V
    : never
> {
  ;[iterable, callback] = await Promise.all([
    iterable,
    callback,
  ])

  let value: any

  await iterate(
    iterable as IterableType,
    async (...args: any[]) => {
      const out = await (
        callback as (...any: any[]) => any
      )(...args)

      if (out) {
        value = out
      }
    }
  )

  return value
}
