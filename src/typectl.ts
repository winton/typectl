type ReadableStreamType = typeof ReadableStream

export type RecordKeyType = string | number | symbol

export type IterableType =
  | ReadableStream<any>
  | Record<RecordKeyType, any>
  | any[]
  | any

export type IterableValueType<I> =
  I extends PromiseOrValueType<ReadableStream<infer V>>
    ? V
    : I extends PromiseOrValueType<
        Record<RecordKeyType, infer V>
      >
    ? Record<RecordKeyType, V>
    : I extends PromiseOrValueType<(infer V)[]>
    ? V
    : never

export type IterableCallbackType<I> =
  I extends PromiseOrValueType<ReadableStream<infer V>>
    ? (value: V) => any
    : I extends PromiseOrValueType<
        Record<RecordKeyType, infer V>
      >
    ? (value: V, key: RecordKeyType) => any
    : I extends PromiseOrValueType<(infer V)[]>
    ? (value: V, index: number) => any
    : never

export type MapCallbackType<I, M> =
  I extends PromiseOrValueType<ReadableStream<infer V>>
    ? (value: V) => any
    : I extends PromiseOrValueType<
        Record<RecordKeyType, infer V>
      >
    ? (value: V, key: string, memo: M) => any
    : I extends PromiseOrValueType<(infer V)[]>
    ? (value: V, index: number, memo: M) => any
    : never

export type PromiseOrValueType<T> = Promise<T> | T

export type PromiseInferType<T> = Exclude<
  T extends PromiseLike<infer A> ? A : T,
  undefined
>

export type PickedValueType<
  T extends Promise<Record<any, any>> | Record<any, any>,
  K extends RecordKeyType
> = T extends Promise<any>
  ? Promise<WrappedFunctionType<PromiseInferType<T>[K]>>
  : T extends Record<any, any>
  ? Promise<WrappedFunctionType<T[K]>>
  : never

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

export type WrappedFunctionType<
  F,
  D = F
> = F extends PromiseOrValueType<
  (...any: infer A) => infer T
>
  ? (
      ...any: OptionalPromiseArgsType<A>
    ) => Promise<PromiseInferType<T>>
  : D

export async function getReadableStream() {
  if (typeof ReadableStream === "undefined") {
    return (await import("web-streams-polyfill"))
      .ReadableStream as ReadableStreamType
  } else {
    return ReadableStream
  }
}

export function wrap<
  I extends PromiseOrValueType<(...any: any[]) => any>
>(item: I): WrappedFunctionType<I, never> {
  const fn = ((...args: any[]) =>
    Promise.all(args).then(async (args) => {
      const fn = (await item) as (...any: any[]) => any
      return fn(...args)
    })) as any

  return fn
}

export function wrapPick<
  T extends Promise<Record<any, any>> | Record<any, any>,
  V extends T extends Promise<infer V>
    ? Exclude<V, undefined>
    : Exclude<T, undefined>,
  K extends keyof V
>(item: T, k: K): WrappedFunctionType<V[K], never> {
  const fn = ((...args: any[]) =>
    Promise.all(args).then(async (args) => {
      const base = await item

      if (base === undefined) {
        throw new Error(
          "`wrapPick` received undefined value"
        )
      }

      const fn = base[k] as unknown as (
        ...any: any[]
      ) => any

      if (typeof fn !== "function") {
        throw new Error("`wrapPick` picked a non-function")
      }

      return fn.bind(base)(...args)
    })) as any

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
  T extends Promise<Record<any, any>> | Record<any, any>,
  K extends keyof (T extends Promise<infer V>
    ? Exclude<V, undefined>
    : Exclude<T, undefined>)
>(p: T, k: K): PickedValueType<T, K> {
  return Promise.resolve(p).then((v: any) => {
    if (v === undefined) {
      throw new Error("`pick` received undefined value")
    }
    return typeof v[k || "default"] === "function"
      ? wrap(v[k].bind(v))
      : v[k]
  }) as PickedValueType<T, K>
}

export function tee<
  T extends
    | ReadableStream<any>
    | Promise<ReadableStream<any>>,
  V extends T extends Promise<infer V>
    ? Exclude<V, undefined>
    : Exclude<T, undefined>
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
  >
] {
  const promise = Promise.resolve(v).then((v) => v.tee())
  const stream1 = pick(promise, 0)
  const stream2 = pick(promise, 1)
  return [stream1, stream2]
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
  C extends PromiseOrValueType<IterableCallbackType<I>>
>(iterable: I, callback: C) {
  ;[iterable, callback] = await Promise.all([
    iterable,
    callback,
  ])

  const ReadableStream = await getReadableStream()

  if (iterable instanceof ReadableStream) {
    const stream = iterable.getReader()

    const pump = async (): Promise<void> => {
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
  I extends PromiseOrValueType<IterableType>
>(iterable: I): Promise<IterableValueType<I>[]>

export async function toArray<
  I extends PromiseOrValueType<IterableType>,
  C extends PromiseOrValueType<MapCallbackType<I, any[]>>
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

export async function toArray<
  I extends PromiseOrValueType<IterableType>,
  C extends PromiseOrValueType<MapCallbackType<I, any[]>>
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
          output.push(v)
        }
      } else {
        output.push(out)
      }
    }
  )

  return output
}

export async function toRecord<
  I extends PromiseOrValueType<IterableType>
>(
  iterable: I
): Promise<Record<RecordKeyType, IterableValueType<I>>>

export async function toRecord<
  I extends PromiseOrValueType<IterableType>,
  C extends PromiseOrValueType<
    MapCallbackType<I, Record<RecordKeyType, any>>
  >
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

export async function toRecord<
  I extends PromiseOrValueType<IterableType>,
  C extends PromiseOrValueType<
    MapCallbackType<I, Record<RecordKeyType, any>>
  >
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
  I extends PromiseOrValueType<IterableType>
>(
  iterable: I
): Promise<ReadableStream<IterableValueType<I>>>

export async function toStream<
  I extends PromiseOrValueType<IterableType>,
  C extends PromiseOrValueType<
    MapCallbackType<I, ReadableStreamController<any>>
  >
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

export async function toStream<
  I extends PromiseOrValueType<IterableType>,
  C extends PromiseOrValueType<
    MapCallbackType<I, ReadableStreamController<any>>
  >
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
      streamController.enqueue(
        callback
          ? await (callback as (...any: any[]) => any)(
              ...args,
              streamController
            )
          : args[1] !== undefined
          ? [args[1], args[0]]
          : args[0]
      )
    }
  ).then(() => streamController.close())

  return stream as any
}

export async function toValue<
  I extends PromiseOrValueType<IterableType>
>(iterable: I): Promise<IterableValueType<I>>

export async function toValue<
  I extends PromiseOrValueType<IterableType>,
  C extends PromiseOrValueType<MapCallbackType<I, any>>
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

export async function toValue<
  I extends PromiseOrValueType<IterableType>,
  C extends PromiseOrValueType<MapCallbackType<I, any>>
>(iterable: I, callback?: C) {
  ;[iterable, callback] = await Promise.all([
    iterable,
    callback || (((v: any) => v) as any),
  ])

  let value: any

  await iterate(
    iterable as IterableType,
    async (...args: any[]) => {
      const out = await (
        callback as (...any: any[]) => any
      )(...args, value)

      if (out) {
        value = out
      }
    }
  )

  return value
}
