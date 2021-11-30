# 🚰 typectl

TypeScript control flow library

```bash
npm install typectl
```

## All

The `all` function builds a "caller" function that executes a group of functions in parallel:

```typescript
import { all } from "typectl"

// sync or async functions ✅
const a = async ({ arg }: { arg: number }) => arg
const b = ({ arg }: { arg: boolean }) => arg

// build caller function
const caller = all({ a, b })
```

Calling the function control flow preserves type safety of arguments and return values:

```typescript
const out = await caller({
  a: { arg: 1 }, // argument type safety ✅
  b: { arg: true },
})

expect(out.a).toBe(1) // return type safety ✅
expect(out.b).toBe(true)
```

## Each

The `each` function has the same signature as `all`, but function groups execute sequentially:

```typescript
import { each } from "typectl"

const a = ({ arg }: { arg: number }) => arg
const b = ({ arg }: { arg: boolean }) => arg

const caller = each({ a, b })
```

## Any

The `any` function has the same signature as `all`, but function group arguments are optional. If an argument is undefined, the respective function is not executed.

```typescript
import { any } from "typectl"

const a = ({ arg }: { arg: number }) => arg
const b = ({ arg }: { arg: boolean }) => arg

const caller = any({ a, b })

const out = await caller({
  a: { arg: 1 },
  // b argument undefined, not called
})

expect(out.a).toBe(1)
expect(out.b).toBe(undefined)
```

## Nested control flow

Nest `all`, `each`, or `any` functions to create complex control flows:

```typescript
import { any, each } from "typectl"

const a = async ({ arg }: { arg: number }) => arg
const b = ({ arg }: { arg: boolean }) => arg
const c = async ({ arg }: { arg: string }) => arg
const d = ({ arg }: { arg: null }) => arg

const caller = all({ a, b, cd: each({ c, d }) })

const out = await caller({
  a: { arg: 1 }, // argument type safety ✅
  b: { arg: true },
  cd: { c: { arg: "c" }, d: { arg: null } },
})

expect(out.a).toBe(1) // return type safety ✅
expect(out.b).toBe(true)
expect(out.cd).toEqual({
  c: "c",
  d: null,
})
```

## Props

Props allow the end user to specify an async input without changing the signature of the control flow function's arguments.

### Getter-setter

Props are awaitable getter-setters:

```typescript
import { prop } from "typectl"

const arg = prop<number>()

setTimeout(() => (arg.value = 1), 10)
expect(await arg.promise).toBe(1)
expect(arg.value).toBe(1)

arg.value = 2
expect(arg.value).toBe(2)
expect(await arg.promise).toBe(2)
```

### Prop resolution

When a caller function receives a prop as input, the prop value is resolved before it reaches the control flow function:

```typescript
import { all, prop } from "typectl"

const a = ({ arg }: { arg: number }) => arg
const caller = all({ a })

const out = await caller({
  a: {
    arg: prop(1), // number | Prop<number>
  },
})

expect(out.a).toBe(1)
```

#### Async prop resolution

Control flow functions do not execute until the prop value is resolvable:

```typescript
import { all, prop } from "typectl"

// simple input type ✅
const a = ({ arg }: { arg: number }) => arg

const caller = all({ a })

// async prop ✅
const arg = prop<number>()
setTimeout(() => (arg.value = 1), 10)

// `a` not called until prop resolves
const out = await caller({ a: { arg } })

expect(out.a).toBe(1)
```

### Bypass prop resolution

To bypass prop value resolution, add `Prop` to the end of the input name:

```typescript
const a = ({ argProp }: { argProp: Prop<number> }) =>
  (argProp.value = 1)

const caller = all({ a })
const argProp = prop<number>()

const out = await caller({
  a: { argProp }, // input ending with `Prop` bypasses prop resolution
})

expect(argProp.value).toBe(1)
expect(out.a).toBe(1)
```

## Built-in optimization

Using props, control flow functions can depend on outputs from each other, regardless of synchronicity:

```typescript
// get arg
const a = ({ arg }: { arg: number }) => arg

// set arg
const b = ({ argProp }: { argProp: Prop<number> }) =>
  setTimeout(() => (argProp.value = 1), 10)

const caller = all({ a, b })
const arg = prop<number>()

const out = await caller({
  a: { arg },
  b: { argProp: arg },
})

expect(out.a).toBe(1)
expect(arg.value).toBe(1)
```

Using this technique, async processing is optimal out of the box, and remains so in different configurations.

Functions can now be small, simple, and isolated while remaining flexible to end-user composition.