export type PropType<T> = {
  get: () => T
  toJSON: () => T
  set: (value: T) => T
}

export default function <T>(store?: T): PropType<T> {
  return {
    get: function () {
      return store
    },
    toJSON: function () {
      return store
    },
    set: function (value: T) {
      return (store = value)
    },
  }
}
