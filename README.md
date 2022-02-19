# 🚰 typectl

TypeScript control flow library

```bash
npm install typectl
```

## Summary

**Typectl** is a control flow library for executing and connecting independent functions. The API is designed to scale from both a development and performance perspective; there is no need for `await` and execution order remains optimal as functions are added.

The "killer feature" of typectl is `wrap`. Wrapping a function allows it to optionally receive the typed promise version of each argument. Wrapped functions do not execute until their arguments resolve and always return a typed promise.

By passing promise return values to successive wrapped functions, the most optimal execution order occurs naturally based on the "race" to execute functions as their arguments resolve.

The API also provides type-safe ways of transforming promise values without requiring their resolution, which aid in preparing arguments or final return values.

### How it works

Control flows are similar to a "controller", or a place where other functions are orchestrated. Within your control flow, you may:

1. Wrap any function so it accepts the promise version of its arguments and returns a promise (`wrap`).
2. Execute promised functions independently, concurrently (`all`), or sequentially (`each`) **without await**.
3. Pick values from promise return values without awaiting resolution (`pick`).
4. Map promise values to arrays, records, streams, or any value (`toArray`, `toRecord`, `toStream`, `toValue`).

### Dev features

1. Type-safe ☔
2. Dynamic imports ⚡
3. Universal JS (Node and browser) 👽
4. Small footprint (~1 kb) 👣

## Example

### `fixture.ts`

```typescript
export function time() {
  return new Date().getTime()
}

export function relay(value: number) {
  return value
}
```

### `spec.ts`

```typescript
import { all, pick, each, wrap } from "typectl"
import expect from "expect"

export default async function() {
  const time = pick(import("./fixture"), "time")
  const times = all([time, time])
  const time1 = pick(times, 0)
  const time2 = pick(times, 1)

  const relay = wrap(pick(import("./fixture"), "relay"))
  const relayedTime1 = relay(time1)
  const relayedTime2 = relay(time2)

  expect(await relayedTime1).toEqual(await time1)
  expect(await relayedTime2).toEqual(await time2)
  
  // console.log(await time1, await time2)
}
```