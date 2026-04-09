# typectl

TypeScript control flow library

```bash
npm install typectl
```

## Why typectl?

Async orchestration code tends to look like this:

```typescript
const a = await fetchA()
const b = await fetchB()           // waits for A, even though it doesn't need to
const c = await computeC(a, b)
```

`fetchB` doesn't depend on `fetchA`, yet it waits. You can fix it with `Promise.all`, but as dependencies grow the wiring becomes fragile and hard to read. Typectl eliminates this problem entirely.

With typectl, you describe **what depends on what** and let the runtime figure out the optimal execution order:

```typescript
import { wrap, all } from "typectl"

const fetchAW = wrap(fetchA)
const fetchBW = wrap(fetchB)
const computeCW = wrap(computeC)

const a = fetchAW()
const b = fetchBW()                // runs concurrently with A
const c = computeCW(a, b)          // automatically waits for both A and B

const [resultA, resultB, resultC] = await all([a, b, c])
```

No manual `await` placement. No `Promise.all` juggling. Functions execute as soon as their arguments resolve.

## Core concept

The key primitive is `wrap`. Wrapping a function makes every argument accept either a plain value **or** a `Promise` of that value. The wrapper resolves all arguments with `Promise.all` before calling the inner function, and always returns a `Promise`.

By passing promise return values to successive wrapped functions, you build a dependency graph that resolves itself optimally at runtime.

## API reference

### `wrap(fn)`

Wraps a function (or a `Promise` of a function) so each argument may be a value or a `Promise`. Returns a memoized wrapper that always produces a `Promise`.

```typescript
import { wrap } from "typectl"

const add = wrap((a: number, b: number) => a + b)

await add(1, 2)                        // → 3
await add(Promise.resolve(1), 2)       // → 3
await add(fetch("/a"), fetch("/b"))    // resolves both, then adds
```

Wrapping is memoized — `wrap(fn) === wrap(fn)` — so you can call it freely without creating duplicate wrappers.

`wrap` also accepts a `Promise<Function>`, which is useful with dynamic imports:

```typescript
const fn = wrap(
  import("./math").then((m) => m.add)
)
await fn(1, 2) // → 3
```

### `pick(object, key)`

Extracts a property from an object or a `Promise` of an object. If the property is a function, it is automatically `wrap`ped (with `this` bound). Non-function values are returned as a resolved `Promise`.

```typescript
import { pick } from "typectl"

// With dynamic imports — no await needed
const functions = import("./math")
const add = pick(functions, "add")     // Promise<wrapped add>
const result = (await add)(1, 2)       // → 3

// With plain objects
const config = { port: 3000 }
await pick(config, "port")             // → 3000
```

Throws an `Error` if the resolved object is `undefined`.

### `wrapPick(object, key)`

Like `pick`, but unconditionally wraps the result with `wrap`. Useful when you need to guarantee a property goes through wrapping even if the type is broad.

```typescript
import { wrapPick } from "typectl"

const add = await wrapPick(
  import("./math"),
  "add"
)
await add(Promise.resolve(1), 2) // → 3
```

### `all(array)`

Executes all elements of a tuple **concurrently**. Each element may be a plain value, a `Promise`, or a zero-argument function. Returns a `Promise` of the resolved results in the same positional order.

```typescript
import { all } from "typectl"

const [a, b, c] = await all([
  fetch("/a").then((r) => r.json()),
  42,
  () => expensiveComputation(),
])
// a = fetched data, b = 42, c = computation result
```

Functions are called and their return values are resolved. This lets you defer execution until `all` runs.

### `each(array)`

Same interface as `all`, but executes elements **sequentially** — each element is fully resolved before the next starts.

```typescript
import { each } from "typectl"

const [a, b] = await each([
  () => createUser("Alice"),
  () => createUser("Bob"),   // waits for Alice to finish
])
```

Use `each` when the order of side effects matters.

### `iterate(iterable, callback)`

Iterates over a `ReadableStream`, array, or plain-object record, invoking `callback` for each element. Both `iterable` and `callback` may be `Promise`-wrapped.

**Concurrency behaviour:**

| Input | Execution | Callback signature |
|-------|-----------|-------------------|
| `ReadableStream` | Sequential | `(value) => any` |
| `Array` | Concurrent (`Promise.all`) | `(value, index) => any` |
| `Record` | Concurrent (`Promise.all`) | `(value, key) => any` |

```typescript
import { iterate } from "typectl"

// Array — callbacks run concurrently
await iterate(["a", "b", "c"], (value, index) => {
  console.log(index, value) // 0 "a", 1 "b", 2 "c"
})

// ReadableStream — callbacks run sequentially
await iterate(stream, (chunk) => {
  process(chunk)
})

// Record — callbacks run concurrently
await iterate({ x: 1, y: 2 }, (value, key) => {
  console.log(key, value) // "x" 1, "y" 2
})

// Promise arguments — resolved before iteration
await iterate(
  Promise.resolve(["a", "b"]),
  Promise.resolve((v: string) => console.log(v))
)
```

### `toArray(iterable, callback?)`

Maps an iterable to a flat array.

The optional `callback` receives `(value, index|key, memo)` where `memo` is the output array being built. It may return:
- A single value — appended to the output.
- An array — each non-`undefined` element is appended (flat-map).
- `undefined` — element is skipped (filter).

Without a callback, values are collected as-is and `undefined` elements are filtered out.

```typescript
import { toArray } from "typectl"

// Collect values
await toArray(["a", "b", "c"])
// → ["a", "b", "c"]

// Map
await toArray([1, 2, 3], (v) => v * 2)
// → [2, 4, 6]

// Filter
await toArray([1, 2, 3, 4], (v) =>
  v % 2 === 0 ? v : undefined
)
// → [2, 4]

// Flat-map
await toArray(["hello world"], (v) => v.split(" "))
// → ["hello", "world"]
```

### `toRecord(iterable, callback?)`

Maps an iterable to a plain record.

The optional `callback` receives `(value, index|key, memo)` and must return a partial record. Results are merged with `Object.assign`.

Without a callback, arrays are indexed numerically and records pass through as-is.

```typescript
import { toRecord } from "typectl"

// Default indexing
await toRecord(["a", "b"])
// → { 0: "a", 1: "b" }

// Custom keys
await toRecord(["Alice", "Bob"], (name, i) => ({
  [name.toLowerCase()]: i,
}))
// → { alice: 0, bob: 1 }
```

### `toStream(iterable, callback?)`

Maps an iterable to a `ReadableStream`.

The optional `callback` receives `(value, index|key, controller)` and should return the value to enqueue. Returning `undefined` skips that item. Errors in the callback propagate via `ReadableStreamController.error`.

Without a callback:
- Arrays emit `[index, value]` tuples.
- Records emit `[key, value]` tuples.
- Streams emit raw values.

```typescript
import { toStream } from "typectl"

// Convert array to stream
const stream = await toStream([1, 2, 3], (v) => v * 2)
// stream emits: 2, 4, 6

// Default format (with index tuples)
const stream2 = await toStream(["a", "b"])
// stream emits: [0, "a"], [1, "b"]
```

Iteration runs asynchronously after the stream is returned, so consumers can start reading immediately.

### `toValue(iterable, callback?)`

Reduces an iterable to a single value.

The optional `callback` receives `(value, index|key, accumulator)` and should return the next accumulator. Returning `undefined` leaves the accumulator unchanged.

Without a callback, the last non-`undefined` element is returned.

```typescript
import { toValue } from "typectl"

// Last element
await toValue(["a", "b", "c"])
// → "c"

// Sum
await toValue([1, 2, 3], (v, _i, acc) =>
  (acc ?? 0) + v
)
// → 6

// Find
await toValue([1, 5, 3], (v, _i, acc) =>
  v > (acc ?? 0) ? v : undefined
)
// → 5
```

> **Note:** For array inputs, callbacks run concurrently. Stateful reduction with async callbacks may yield non-deterministic results. Use a `ReadableStream` input for guaranteed sequential reduction.

### `tee(stream)`

Splits a `ReadableStream` (or `Promise` thereof) into two independent streams using the native `ReadableStream.tee()` method.

```typescript
import { tee } from "typectl"

const [s1, s2] = tee(myStream)
// Read s1 and s2 independently
```

### `assign(target, ...sources)`

Like `Object.assign`, but every argument may be a `Promise`. All arguments are resolved concurrently before merging.

```typescript
import { assign } from "typectl"

const merged = await assign(
  fetch("/defaults").then((r) => r.json()),
  fetch("/overrides").then((r) => r.json())
)
```

### `promiseCall(value)`

Low-level primitive used by `all` and `each`. Resolves a value: if the resolved result is a zero-argument function, it is called and its return value is used; otherwise the resolved value is returned as-is.

```typescript
import { promiseCall } from "typectl"

await promiseCall(42)                    // → 42
await promiseCall(Promise.resolve(42))   // → 42
await promiseCall(() => 42)              // → 42
await promiseCall(async () => 42)        // → 42
```

## Full example

This example is located at [`src/example`](src/example).

### `functions.ts`

```typescript
export function time() {
  return new Date().getTime()
}

export function plusOne(value: number) {
  return value + 1
}
```

### `controlFlow.ts`

```typescript
import { all, pick, toArray, toRecord } from "typectl"

export default function () {
  const functions = import("./functions")
  const time = pick(functions, "time")
  const plusOne = pick(functions, "plusOne")
  const times = all([time, time])
  const timesPlusOne = toArray(times, plusOne)
  const timesPlusOneRecord = toRecord(timesPlusOne)
  return { times, timesPlusOneRecord }
}
```

Notice there is no `await` anywhere in the control flow. The dynamic `import()` is a `Promise`, `pick` extracts wrapped functions from it, `all` executes them concurrently, and `toArray`/`toRecord` transform the results — all without blocking.

### `spec.ts`

```typescript
import { describe, it, expect } from "vitest"
import { pick } from "typectl"
import controlFlow from "./controlFlow"

describe("example", () => {
  it("runs control flow", async () => {
    const { times, timesPlusOneRecord } = controlFlow()

    expect(await times).toEqual([
      expect.any(Number),
      expect.any(Number),
    ])

    expect(await timesPlusOneRecord).toEqual({
      0: expect.any(Number),
      1: expect.any(Number),
    })

    expect(await pick(times, 0)).toEqual(
      (await pick(timesPlusOneRecord, 0)) - 1
    )
  })
})
```

## Type exports

Typectl exports the following utility types for advanced use:

| Type | Description |
|------|-------------|
| `WrappedFunctionType<F>` | The return type of `wrap(fn)` — arguments become `T \| Promise<T>`, return becomes `Promise<T>`. |
| `PromiseOrValueType<T>` | `T \| Promise<T>` — used throughout the API to accept either form. |
| `PromiseInferType<T>` | Unwraps a `Promise<T>` to `T`, excluding `undefined`. |
| `PromiseCallType<T>` | The resolved type of a single element passed to `all`/`each`. |
| `PromiseCallsType<R>` | Maps a tuple through `PromiseCallType` — the return type of `all`/`each`. |
| `PickedValueType<T, K>` | The return type of `pick(obj, key)`. |
| `IterableType` | Union of supported iterable inputs: `ReadableStream \| Record \| Array`. |
| `IterableValueType<I>` | Infers the element type from an `IterableType`. |
| `IterableCallbackType<I>` | The expected callback signature for a given `IterableType` in `iterate`. |
| `MapCallbackType<I, M>` | The expected callback signature for `toArray`/`toRecord`/`toStream`/`toValue`. |
| `OptionalPromiseArgsType<T>` | Maps a tuple so each element may be `T[K] \| Promise<T[K]>`. |
| `RecordKeyType` | `string \| number \| symbol`. |

## Compatibility

- **Node.js** 18, 20, 22+ (tested in CI)
- **Browsers** — all modern browsers with native `ReadableStream`
- **Older environments** — `ReadableStream` is polyfilled automatically via [`web-streams-polyfill`](https://www.npmjs.com/package/web-streams-polyfill)
- Ships both **ESM** and **CommonJS** builds with full TypeScript declarations

## Development

```bash
npm install          # install dependencies
npm start            # watch mode (CJS + ESM)
npm test             # run tests once
npm run test:watch   # run tests in watch mode
npm run test:coverage # run tests with coverage
npm run lint         # lint source files
npm run build        # production build (CJS + ESM)
```

## License

MIT
