# 🚰 typectl

TypeScript control flow library

```bash
npm install typectl
```

## Goals

1. Dynamically execute groups of pure functions using a type-safe API.
2. Implement an input/output mapping abstraction that enables a similarly typed, but awaitable, getter/setter to be passed in place of the type requested by the function.
3. Because all functions execute at once but wait on specific inputs before executing, the pattern should automatically produce optimized control flows that scale with complexity.

## Pure function API

Specify arguments and return values as single objects:

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

Functions may be asynchronous and omit input/output (this is a valid function):

```typescript
export default async () => {}
```

## Your first control flow

Let's run the `incrementNumber` function concurrently using the `all` builder:

```typescript
import { all, prop } from "typectl"
import incrementNumber from "./incrementNumber"

// control flow builder
const increment = all({
  incrementNumberBy1: incrementNumber,
  incrementNumberBy2: incrementNumber,
})

// create props (see next section)
const num1 = prop<number>()
const num2 = prop<number>()

// execute control flow
await increment({
  incrementNumberBy1: [
    // argument mapping
    { num: 0, increment: 1 },
    // return mapping
    { num: num1 },
  ],
  incrementNumberBy2: [
    // argument mapping
    { num: num1, increment: 2 },
    // return mapping
    { num: num2 },
  ],
})

// drumroll please...
expect(num1.value).toBe(1)
expect(num2.value).toBe(3)
```

## Props

Props are getter-setters that can only be set once (immutable):

```typescript
import { prop } from "typectl"

const hello = prop("hello")
hello.value = "hi" // error!

const hi = prop()
hi.value = "hi" // success!
```

### Props are awaitable

Use the `promise` attribute to wait for a prop to populate:

```typescript
import { prop } from "typectl"

const hello = prop<string>()
setTimeout(() => (hello.value = "hello"), 10)
expect(await hello.promise).toBe("hello")
```

### Input/output mappings

When executing a control flow, input mappings may receive the prop version of the requested input type. If the prop is not assigned, the dependent function does not execute until it becomes available.

Because control flow functions wait for prop input resolution, you can usually write the most optimal code by throwing all of your functions in a single `all` and allow the caller to reason about execution order based on its desired inputs.

Output mappings are optional, but when provided, **must** use props so they can be assigned a value.

## Builder functions

In addition to the `all` builder function, there are also `any` and `each`:

| Function | Description |
| --- | --- |
| `all` | Concurrent execution of *all* functions |
| `each` | Serial execution of *each* function |
| `any` | Concurrent execution of *any* functions where input maps provided |
| `anyEach` | Serial execution of *each* function where input maps provided |

### Nested builders

Nest builder functions to create complex control flows:

```typescript
import { all, each, any, prop } from "typectl"
import incrementNumber from "./incrementNumber"

// nested control flow builders
const caller = all({
  incrementNumberBy1: incrementNumber,
  incrementNumberEach: each({
    incrementNumberBy2: incrementNumber,
    incrementNumberBy3: incrementNumber,
    incrementNumberAny: any({
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
  incrementNumberBy1: [
    { num: 0, increment: 1 },
    { num },
  ],
  incrementNumberEach: [
    {
      incrementNumberBy2: [
        { num, increment: 2 },
        { num: num2 },
      ],
      incrementNumberBy3: [
        { num: num2, increment: 3 },
        { num: num3 },
      ],
      incrementNumberAny: [
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
expect(num.value).toBe(1)
expect(num2.value).toBe(3)
expect(num3.value).toBe(6)
expect(num4.value).toBe(10)
```
