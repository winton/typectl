# 🚰 typectl

TypeScript control flow library

```bash
npm install typectl
```

## All

The `all` function is a factory for executing functions in parallel, retaining type safety on arguments and return values.

```typescript
import { all } from "typectl"

const a = ({ arg }: { arg: number }) => arg
const b = ({ arg }: { arg: boolean }) => arg

const ab = all({ a, b })

const out = await ab({
  a: { arg: 1 }, // arg type safety ✅
  b: { arg: true },
})

expect(out.a).toBe(1) // return type safety ✅
expect(out.b).toBe(true)
```

## Each

The `each` function has the same signature as `all`, but runs functions sequentially.

## Props

Props are getter-setter factories that allow functions in your control flows to wait on a variable to populate.

```typescript
import { all, prop, Prop } from "./typectl"

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