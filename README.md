# 🚰 typectl

TypeScript control flow library

```bash
npm install typectl
```

## Summary

**Typectl** is a control flow library for executing functions that depend on each other's outputs in complex ways. Control flows do not use async/await and produce a naturally optimized execution order without much effort.

The "killer feature" of typectl is `wrap`. Wrapping a function allows it to optionally receive the typed promise version of each argument. Wrapped functions do not execute until their arguments resolve and always return a promise.

By passing the promise return values to successive wrapped functions, the most optimal execution order occurs naturally based on the "race" to run functions (pending the resolution of all arguments).

To prepare the return value of a wrapped function as an argument, the API type-safe provides ways of transforming promise return values without needing to resolve them.

### How it works

Control flows are similar to a "controller", or a place where other functions are called (potentially to return something). Within your control flow:

1. Wrap any function so it accepts the promise version of its arguments and returns a promise (`wrap`).
2. Pick values from promise return values without awaiting resolution (`pick`).
3. Map promise values to arrays, records, streams, or anything (`toArray`, `toRecord`, `toStream`, `toValue`).
4. Execute promised functions concurrently (`all`) or sequentially (`each`).

### Dev features

1. Type-safe ☔.
2. Dynamic imports ⚡.
3. Universal JS (Node and browser) 👽.
4. Small footprint (~1 kb) 👣.

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