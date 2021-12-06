# 🚰 typectl

TypeScript control flow library

```bash
npm install typectl
```

## Goals

1. A type-safe API for defining complex control flows of pure (isolated, simply typed) functions.
2. Make dynamic input and output variable mapping within the control flow possible at runtime.
3. Use of the pattern should naturally optimize control flow execution.

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

Functions may be async or without inputs/outputs. For example, this function is valid:

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
const firstNum = prop<number>()
const finalNum = prop<number>()

// call control flow
await caller({
  // input & output mappings
  incrementNumberBy1: [
    { num: 0, increment: 1 },
    { num: firstNum },
  ],
  incrementNumberBy2: [
    { num: firstNum, increment: 2 },
    { num: finalNum },
  ],
})

// drumroll please...
expect(finalNum.value).toBe(3)
```

## Props

Props are getter-setters that can only be set once:

```typescript
import { prop } from "typectl"

const hello = prop("hello")
hello.value = "hi" // error!

const hi = prop()
hi.value = "hi" // no error!
```

### Awaitable

You can also `await` prop assignment:

```typescript
import { prop } from "typectl"

const hello = prop()
setTimeout(() => hello.value = "hello", 100)
expect(await hello.promise).toBe("hello")
```

### Control flow variable mappings

When calling a control flow, input mappings may contain the original input types or the prop version. If a prop input is unresolved, the caller waits for the prop value to become available before executing the dependent function.

Output mappings, on the other hand, **must** use the prop version of the original output types, if provided.

## Control flow builder functions

In addition to the `all` builder function, there is also `each` and `any`:

| Function | Description |
| --- | --- |
| `all` | Concurrent execution |
| `any` | Concurrent execution (if input or output mapping provided) |
| `each` | Serial execution |

### Nested control flow builders

Nest builder functions to create complex control flows:

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
          // don't run incrementNumberBy5
          incrementNumberBy5: false,
        },
      ],
    },
  ],
})

// drumroll please...
expect(num4.value).toBe(10)
```
