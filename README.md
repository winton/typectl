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

Let's call the `hi` function we defined earlier:

```typescript
import { call, prop } from "typectl"

export default async () => {
  const hello = prop<boolean>()

  await call(
    // function
    import("./hi"),
    // input
    { hi: true },
    // output
    { hello }
  )
  
  // expect(hello.value).toBe(true)
}
```

> ℹ️ Input and output arguments to `call` remain type-safe whether provided as a `prop` or not.

## More complex example

```typescript
import { call, all } from "typectl"

export default async function () => {
  const hello = prop<boolean>()
  const hello2 = prop<boolean>()

  await all(
    call(import("./hi"), { hi: true }, { hello }),
    call(import("./hi"), { hi: hello }, { hello: hello2 })
  )

  // expect(hello.value).toBe(true)
  // expect(hello2.value).toBe(true)
}
```

## API

| Function | Description |
| --- | --- |
| `call` | Call a function from dynamic import |
| `all` | Wait for calls in parallel |
| `each` | Wait for calls in serial |
| `mapToStream` | Map iterable to stream |
| `mapToArray` | Map iterable to array |
| `mapToRecord` | Map iterable to record |