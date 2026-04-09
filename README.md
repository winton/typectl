# typectl

TypeScript control flow library

```bash
npm install typectl
```

## Why typectl?

Async orchestration code tends to look like this:

```typescript
async function getProfile(userId: string) {
  const user = await fetchUser(userId)
  const posts = await fetchPosts(userId)   // waits for user, even though it doesn't need to
  const profile = formatProfile(user, posts)
  return profile
}
```

`fetchPosts` doesn't depend on `fetchUser`, yet it waits. You can fix it with `Promise.all`, but as dependencies grow the wiring becomes fragile and hard to read. Typectl eliminates this problem entirely.

With typectl, you describe **what depends on what** and the runtime figures out the rest:

```typescript
import { wrapPick } from "typectl"

const functions = import("./functions")
const fetchUser = wrapPick(functions, "fetchUser")
const fetchPosts = wrapPick(functions, "fetchPosts")
const formatProfile = wrapPick(functions, "formatProfile")

function getProfile(userId: string) {
  const user = fetchUser(userId)
  const posts = fetchPosts(userId)            // runs concurrently with fetchUser
  const profile = formatProfile(user, posts)  // waits for both, then runs
  return profile
}
```

No `async`. No `await`. No `Promise.all`. No manual promise wiring. Two properties make this work beautifully:

**You never `await` until you need a final result.** The entire control flow reads like synchronous code. You only `await` at the boundary where you actually need a resolved value — a test assertion, an HTTP response, a rendered template. Everything before that is just describing relationships between computations.

**Everything stays fully typed — without writing a single type annotation.** `wrapPick` infers each function's parameter types and return type directly from the dynamic import. In the example above, `user` is typed as `Promise<{ id: string; name: string; email: string }>` and `profile` carries the full return type of `formatProfile` — all without any explicit type declarations in the control flow. The type system follows the data through every step automatically.

## Core concepts

**`wrap`** — Wrapping a function makes every argument accept either a plain value **or** a `Promise` of that value. The wrapper resolves all arguments before calling the inner function, and always returns a `Promise`. Since `wrap` also accepts a `Promise<Function>`, it works seamlessly with dynamic imports.

**`wrapPick`** — Combines a dynamic `import()` with property extraction and wrapping in a single step. The result is an immediately callable wrapped function — no `await`, no static imports.

By passing promise return values to successive wrapped functions, you build a dependency graph that resolves itself optimally at runtime. `await` only appears at the final consumption boundary.

## Example

This example is located at [`src/example`](src/example).

### `functions.ts`

```typescript
export async function fetchUser(id: string) {
  return { id, name: "Alice", email: "alice@example.com" }
}

export async function fetchPosts(userId: string) {
  return [
    { userId, title: "First post", likes: 3 },
    { userId, title: "Second post", likes: 7 },
  ]
}

export function formatProfile(
  user: { id: string; name: string; email: string },
  posts: { userId: string; title: string; likes: number }[]
) {
  return {
    displayName: user.name,
    email: user.email,
    postCount: posts.length,
    totalLikes: posts.reduce((sum, p) => sum + p.likes, 0),
  }
}
```

### `controlFlow.ts`

```typescript
import { wrapPick } from "typectl"

const functions = import("./functions")
const fetchUser = wrapPick(functions, "fetchUser")
const fetchPosts = wrapPick(functions, "fetchPosts")
const formatProfile = wrapPick(functions, "formatProfile")

export default function getProfile(userId: string) {
  const user = fetchUser(userId)
  const posts = fetchPosts(userId)
  const profile = formatProfile(user, posts)
  return { user, posts, profile }
}
```

There is no `await` anywhere and no static function imports — each function is dynamically imported and wrapped in a single expression. `fetchUser` and `fetchPosts` run concurrently because neither depends on the other. `formatProfile` automatically waits for both before running. The dependency graph:

```
fetchUser ──┐
             ├── formatProfile
fetchPosts ─┘
```

### `spec.ts`

```typescript
import { describe, it, expect } from "vitest"
import getProfile from "./controlFlow"

describe("example", () => {
  it("builds a profile without awaits in the control flow", async () => {
    const { user, posts, profile } = getProfile("user-1")

    expect(await user).toEqual({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
    })

    expect(await posts).toEqual([
      { userId: "user-1", title: "First post", likes: 3 },
      { userId: "user-1", title: "Second post", likes: 7 },
    ])

    expect(await profile).toEqual({
      displayName: "Alice",
      email: "alice@example.com",
      postCount: 2,
      totalLikes: 10,
    })
  })
})
```

`await` only appears in the test — at the consumption boundary where you actually need the resolved values.

## API reference

### `wrap(fn)`

Wraps a function (or a `Promise` of a function) so each argument may be a value or a `Promise`. Returns a memoized wrapper that always produces a `Promise`.

```typescript
import { wrap } from "typectl"

const add = wrap((a: number, b: number) => a + b)

const three = add(1, 2)                // → Promise<3>
const six = add(three, 3)              // chains without await → Promise<6>
add(fetch("/a"), fetch("/b"))          // resolves both, then adds
```

Wrapping is memoized — `wrap(fn) === wrap(fn)` — so you can call it freely without creating duplicate wrappers.

`wrap` also accepts a `Promise<Function>`, which is useful with dynamic imports:

```typescript
const add = wrap(
  import("./math").then((m) => m.add)
)
add(1, 2) // → Promise<3>
```

### `pick(object, key)`

Extracts a property from an object or a `Promise` of an object. If the property is a function, it is automatically `wrap`ped (with `this` bound). Non-function values are returned as a resolved `Promise`.

```typescript
import { pick } from "typectl"

// With dynamic imports
const functions = import("./math")
const add = pick(functions, "add")     // → Promise<wrapped add>

// With plain objects
const config = { port: 3000 }
pick(config, "port")                   // → Promise<3000>
```

Throws an `Error` if the resolved object is `undefined`.

### `wrapPick(object, key)`

Picks a named property from an object (or `Promise` of one) and wraps it with `wrap`. Because `wrap` accepts a `Promise<Function>`, the returned wrapper is immediately callable — no `await` needed.

```typescript
import { wrapPick } from "typectl"

const functions = import("./math")
const add = wrapPick(functions, "add")
const multiply = wrapPick(functions, "multiply")

const result = add(1, multiply(2, 3))  // → Promise<7>, no await needed
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
| `Record` (plain objects only) | Concurrent (`Promise.all`) | `(value, key) => any` |

> **Note:** Only plain objects (`{}` literals and `Object.create(null)`) are accepted as records. Class instances are not iterated.

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

All input types are processed **sequentially**, so stateful accumulation is always deterministic regardless of whether callbacks are async.

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

const merged = assign(
  fetch("/defaults").then((r) => r.json()),
  fetch("/overrides").then((r) => r.json())
)
// → Promise<merged object> — pass to other wrapped functions or await at the boundary
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
