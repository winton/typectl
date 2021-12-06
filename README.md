# 🚰 typectl

TypeScript control flow library

```bash
npm install typectl
```

## Goals

1. A type-safe API for defining complex control flows of generic (reusable) functions.
2. Full runtime control over input and output variable mapping.
3. Dynamic resolution of inputs and outputs, resulting in naturally optimized code.

## Function API

The function API requires defining arguments and return values as objects:

```typescript
// incrementNumber.ts
//
export default ({
  num,
  increment,
}: {
  num: number
  increment: number
}) => {
  return { num: num + increment }
}
```

Functions may be async or not have inputs/outputs. For example, this function is valid:

```typescript
export default async () => {}
```

## Your first control flow

Let's run the `incrementNumber` function concurrently using `typectl`:

```typescript
import { all, prop } from "typectl"
import incrementNumber from "./incrementNumber"

// control flow builder
const caller = all({
  incrementNumberBy1: incrementNumber,
  incrementNumberBy2: incrementNumber,
})

// create prop (see next section)
const num = prop<number>()

// call control flow
await caller({
  // define input & output mappings
  incrementNumberBy1: [
    { num: 0, increment: 1 },
    { num },
  ],
  incrementNumberBy2: [{ num, increment: 2 }, { num }],
})

// drumroll please...
expect(num.value).toBe(3)
```

## Props

Props are getter-setters that can `await` initial value assignment. Control flows with prop input mappings automatically wait for the prop to populate.

Props are optional when providing input mappings, but required with output mappings.

## Control flow builders

In addition to the `all` builder function, there is also `each` and `any`:

| Function | Description |
| --- | --- |
| `all` | Concurrent execution |
| `each` | Serial execution |
| `any` | Concurrent execution (if input or output mapping provided) |

### Nested control flow builders

Nest `all`, `each`, or `any` functions to create complex control flows:

```typescript
import { all, each, any, prop } from "typectl"
import incrementNumber from "./incrementNumber"

// nested control flow builders
const caller = all({
  incrementNumberBy1: incrementNumber,
  incrementNumbersInSuccession: each({
    incrementNumberBy2: incrementNumber,
    incrementNumberBy3: incrementNumber,
    incrementAnyNumber: any({
      incrementNumberBy4: incrementNumber,
      incrementNumberBy5: incrementNumber,
    }),
  }),
})

// create props
const num = prop<number>()
const num2 = prop<number>()
const num3 = prop<number>()
const num4 = prop<number>()

// call control flow
await caller({
  // input & output mappings
  incrementNumberBy1: [
    { num: 0, increment: 1 },
    { num },
  ],
  incrementNumbersInSuccession: [
    {
      incrementNumberBy2: [
        { num, increment: 2 },
        { num: num2 },
      ],
      incrementNumberBy3: [
        { num: num2, increment: 3 },
        { num: num3 },
      ],
      incrementAnyNumber: [
        {
          incrementNumberBy4: [
            { num: num3, increment: 4 },
            { num: num4 },
          ],
          incrementNumberBy5: false,
        },
      ],
    },
  ],
})

// drumroll please...
expect(num4.value).toBe(10)
```
