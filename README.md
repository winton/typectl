# 🚰 typectl

TypeScript control flow library

```bash
npm install typectl
```

## All

The `all` function is a factory that creates a function that executes a group of functions in parallel:

```typescript
import { all } from "typectl"

// supports sync or async functions ✅
const a = async ({ arg }: { arg: number }) => arg
const b = ({ arg }: { arg: boolean }) => arg

// build control flow caller
const abFlow = all({ a, b })

// call function control flow
await abFlow({ a: { arg: 1 }, b: { arg: true }})
```

The resulting function retains type safety on arguments and return values for the functions it executes:

```typescript
const out = await abFlow({
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

const abFlow = each({ a, b })
```

## Any

The `any` function has the same signature as `all`, but function group arguments are optional. If an argument is undefined, the respective function is not executed.

```typescript
import { any } from "typectl"

const a = ({ arg }: { arg: number }) => arg
const b = ({ arg }: { arg: boolean }) => arg

const abFlow = any({ a, b })

const out = await abFlow({
  a: { arg: 1 },
  // b argument undefined
})

expect(out.a).toBe(1)
expect(out.b).toBe(undefined)
```

## Nested control flow

Nest `all`, `each`, or `any` functions to create complex control flows:

```typescript
import { any, each } from "typectl"

const a = ({ arg }: { arg: number }) => arg
const b = ({ arg }: { arg: boolean }) => arg
const c = ({ arg }: { arg: string }) => arg
const d = ({ arg }: { arg: null }) => arg

const abcdFlow = all({ a, b, cd: each({ c, d }) })

const out = await abcdFlow({
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

Props are getter-setter factories:

```typescript
import { prop } from "typectl"

const arg = prop(1)
expect(arg.value).toBe(1)
expect(await arg.promise).toBe(1)

arg.value = 2
expect(arg.value).toBe(2)
expect(await arg.promise).toBe(2)
```

When props are passed as inputs, they reach the control flow as their values:

```typescript
import { all, prop } from "typectl"

const a = ({ arg }: { arg: number }) => arg
const aFlow = all({ a })

const out = await aFlow({
  a: { arg: prop(1) }, // `arg` may be number or Prop<number>
})

expect(out.a).toBe(1)
```

The flow function does not execute until the prop value is available:

```typescript
import { all, prop } from "typectl"

const a = ({ arg }: { arg: number }) => arg
const aFlow = all({ a })
const arg = prop<number>()

setTimeout(() => (arg.value = 1), 100)

const out = await aFlow({
  a: { arg },
})

expect(out.a).toBe(1)
```

To bypass the prop value resolution, add `Prop` to the end of the input name:

```typescript
const a = ({ argProp }: { argProp: Prop<number> }) =>
  (argProp.value = 1)

const aFlow = all({ a })
const argProp = prop<number>()

const out = await aFlow({
  a: { argProp }, // input ending with `Prop` bypasses prop resolution
})

expect(argProp.value).toBe(1)
expect(out.a).toBe(1)
```