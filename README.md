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
const abFlow = all({ a, b })
```

Calling the function control flow preserves type safety of arguments and return values:

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

Props allow control flow functions to maintain a simple argument signature while enabling the end user to optionally specify async arguments.

Props are awaitable getter-setter factories:

```typescript
import { prop } from "typectl"

const arg = prop<number>()

setTimeout(() => (arg.value = 1), 100)
expect(await arg.promise).toBe(1)
expect(arg.value).toBe(1)

arg.value = 2
expect(arg.value).toBe(2)
expect(await arg.promise).toBe(2)
```

When a caller function receives a prop as input, the value of the prop is resolved before it reaches the control flow function:

```typescript
import { all, prop } from "typectl"

const a = ({ arg }: { arg: number }) => arg
const aFlow = all({ a })

const out = await aFlow({
  a: { arg: prop(1) }, // `arg` may be number or Prop<number>
})

expect(out.a).toBe(1)
```

Control flow functions that receive a prop input do not execute until the prop value is resolvable:

```typescript
import { all, prop } from "typectl"

// simple function input signature ✅
const a = ({ arg }: { arg: number }) => arg

const aFlow = all({ a })

// async prop ✅
const arg = prop<number>()
setTimeout(() => (arg.value = 1), 100)

// `a` not called until prop resolves
const out = await aFlow({ a: { arg } })

expect(out.a).toBe(1)
```

To bypass prop value resolution, add `Prop` to the end of the input name:

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