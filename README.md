# 🚰 typectl

TypeScript control flow library

```bash
npm install typectl
```

## Goals

1. A type-safe API for defining complex control flows of generic functions.
2. Full runtime control over input and output variable mapping.
3. Dynamic resolution of inputs and outputs, resulting in naturally optimized code.

## Function API

The `typectl` pattern promotes keeping functions generic and isolated.

The function API requires that arguments and return values are defined as objects:

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

## Concurrency

Let's run a function concurrently using `typectl`:

```typescript
import { all, prop } from "typectl"
import incrementNumber from "./incrementNumber"

// build caller function
const caller = all({
  incrementNumberBy1: incrementNumber,
  incrementNumberBy2: incrementNumber,
})

// create prop (see next section)
const num = prop<number>()

// call functions
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

Props are getter-setters that you can `await` for value assignment. Control flow functions that depend on a prop as input will automatically wait for the prop to receive a value before executing.

Props are optional when providing input mappings, but output mappings must always use props.

## Caller builder functions

In addition to the `all` caller builder function, there is also `each` and `any`.

The `each` caller builder will execute functions in succession.

The `any` caller builder will only run a control flow function if an input or output mapping is provided.

### Caller builder chains

Nest `all`, `each`, or `any` functions to create complex control flows:

```typescript
import { all, each, any, prop } from "typectl"
import incrementNumber from "./incrementNumber"

// build caller function
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

// create prop
const num = prop<number>()
const num2 = prop<number>()
const num3 = prop<number>()
const num4 = prop<number>()

// call functions
await caller({
  // define input & output mappings
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
