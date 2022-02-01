# 🚰 typectl

TypeScript control flow library

```bash
npm install typectl
```

## Goals

1. Dynamically execute and map groups of simply typed, "pure" functions.
2. Make function I/O awaitable via a type-safe getter/setter known as a "prop".
3. Produce self-optimizing, reusable control flows that scale with complexity 🏆

## Pure function API

Specify arguments and return values as single objects:

```typescript
// hi.ts
//
export default function ({ hi }: { hi: boolean }) {
  return { hello: hi }
}
```

Functions may be async and/or void (this is a valid function):

```typescript
export default async () => {}
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

### Await props

Use the `promise` attribute to wait for a prop to initialize:

```typescript
import { prop } from "typectl"

export default async () => {
  const hello = prop<string>()
  
  setTimeout(() => (hello.value = "hello"), 10)
  
  // expect(await hello.promise).toBe("hello")
}
```

## First control flow

Let's call the `hi.ts` function we [defined earlier](#pure-function-api):

```typescript
import { call, prop } from "typectl"

export default async () => {
  const hello = prop<boolean>()

  await call(
    import("./hi"), // function
    { hi: true }, // input
    { hello } // output
  )
  
  // expect(hello.value).toBe(true)
}
```

## More complex example

```typescript
import { call, all } from "typectl"

export default async function () => {
  const hello = prop<boolean>()
  const hello2 = prop<boolean>()

  await all([
    call(import("./hi"), { hi: true }, { hello }),
    call(import("./hi"), { hi: hello }, { hello: hello2 })
  ])

  // expect(hello.value).toBe(true)
  // expect(hello2.value).toBe(true)
}
```

## API

| Function | Description |
| --- | --- |
| `call` | Call a function from dynamic import |
| `all` | Execute functions in parallel |
| `each` | Execute functions in serial |
| `map` | Map between arrays, records, or streams |
| `pLimit` | Concurrency limiter |
| `prop` | Prop initializer |
| `pairKey` | Pair key with output prop |
| `pairValue` | Pair value with output prop |