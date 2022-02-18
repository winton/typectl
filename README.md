# 🚰 typectl

TypeScript control flow library

```bash
npm install typectl
```

## Summary

**Typectl** is a control flow library for executing dependent functions and transforming return values.

The "killer feature" of typectl is `wrap`. Wrapping a function allows it to optionally receive the typed promise version of its arguments. Wrapped functions do not execute until their arguments resolve, and they also always return a typed promise version of the original return value.

By calling wrapped functions without awaiting, you can pass the promise return values to successive wrapped functions. The most optimal execution order occurs naturally based on the "race" to run functions pending the resolution of its arguments. To prepare return values for becoming input, you may "pick" values out of promises or transform them without awaiting their resolution.

The end result? Your function definitions remain simple and reusable by moving more complex synchronicty concerns to control flows. The control flow execution order remains optimized as it scales organically (without much planning).

### How it works

1. Wrap any function so it accepts the promise version of its arguments (`wrap`).
2. Pick values from promises without awaiting resolution (`pick`).
3. Map promise values to arrays, records, and streams (`toArray`, `toRecord`, `toStream`).
4. Execute promised functions concurrently (`all`) or sequentially (`each`).

### Dev features

1. Type-safe ☔.
2. Elegant dynamic imports ⚡.
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