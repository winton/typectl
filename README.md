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

Control flows are similar to a "controller", or a place where other functions are orchestrated. Within your control flow, do all of the following **without `await`**:

1. Wrap any function so it accepts the promise version of its arguments and returns a promise (`wrap`).
2. Execute functions independently, concurrently (`all`), or sequentially (`each`).
3. Pick values from promise return values (`pick`).
4. Map promise values to arrays, records, web streams, or any value (`toArray`, `toRecord`, `toStream`, `toValue`).

### Dev features

1. Type-safe ☔
2. Dynamic imports ⚡
3. Universal JS (Node and browser) 👽
4. Small footprint (~3 kb compressed) 👣

## Example

### `fixture.ts`

```typescript
export function time() {
  return new Date().getTime()
}

export function plusOne(value: number) {
  return value + 1
}
```

### `spec.ts`

```typescript
import { all, pick, toArray, toRecord, wrap } from "typectl"
import expect from "expect"

export default async function() {
  const fixture = import("./fixture")
  const time = wrap(pick(fixture, "time"))
  const plusOne = wrap(pick(fixture, "plusOne"))
  const times = all([time, time])
  const timesPlusOne = toArray(times, plusOne)
  const timesPlusOneRecord = toRecord(
    timesPlusOne,
    (v, i) => ({ [i]: v })
  )

  expect(await timesPlusOneRecord).toEqual({
    0: expect.any(Number),
    1: expect.any(Number),
  })

  expect(await pick(times, 0)).toEqual(
    (await pick(timesPlusOneRecord, 0)) - 1
  )
}
```