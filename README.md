# 🚰 typectl

TypeScript control flow library

```bash
npm install typectl
```

## All

The `all` function is a factory that creates a function that executes a group of functions in parallel:

```typescript
import { all } from "typectl"

const a = ({ arg }: { arg: number }) => arg
const b = ({ arg }: { arg: boolean }) => arg

const ab = all({ a, b })
```

The resulting function retains type safety on arguments and return values for the functions it executes:

```typescript
const out = await ab({
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

const ab = each({ a, b })
```

## Any

The `any` function has the same signature as `all`, but function arguments are optional. If an argument is undefined, the respective function is not executed.

```typescript
import { any } from "typectl"

const a = ({ arg }: { arg: number }) => arg
const b = ({ arg }: { arg: boolean }) => arg

const ab = any({ a, b })

const out = await ab({
  a: { arg: 1 },
  // b argument undefined
})

expect(out.a).toBe(1)
expect(out.b).toBe(undefined)
```

## Nested control flow

Nest `all`, `each`, or `any` functions to create complex control flows:

```typescript
const a = ({ arg }: { arg: number }) => arg
const b = ({ arg }: { arg: boolean }) => arg
const c = ({ arg }: { arg: string }) => arg
const d = ({ arg }: { arg: null }) => arg

const ab = all({ a, b, cd: each({ c, d }) })

const out = await ab({
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

Use props to wait on variables to populate within your control flows:

```typescript
import { all, prop, Prop } from "typectl"

const a = ({ arg }: { arg: Prop<number> }) => arg.value
const b = async ({ arg }: { arg: Prop<number> }) =>
  await arg.promise

const ab = all({ a, b })
const arg = prop(1)

const out = await ab({
  a: { arg },
  b: { arg },
})

expect(out.a).toBe(1)
expect(out.b).toBe(1)
```