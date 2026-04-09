export type RecordKeyType = string | number | symbol

export type IterableType =
  | ReadableStream<any>
  | Record<RecordKeyType, any>
  | any[]

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
  K extends RecordKeyType,
> =
  T extends Promise<any>
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

export type WrappedFunctionType<F, D = F> =
  F extends PromiseOrValueType<(...any: infer A) => infer T>
    ? (
        ...any: OptionalPromiseArgsType<A>
      ) => Promise<PromiseInferType<T>>
    : D
