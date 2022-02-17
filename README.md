# 🚰 typectl

TypeScript control flow library

```bash
npm install typectl
```

## Goals / API

1. Wrap any function so its arguments may be passed as promises (`wrap`).
2. Pick out values from promises without awaiting (`pick`).
3. Execute functions & promises concurrently (`all`) or sequentially (`each`).
4. Produce naturally optimal control flows without thinking too much 🏆.

## Example

```typescript
import { all, pick, each, wrap } from "./typectl"

const fn1 = pick(import("./fn1"), "default") // () => Fn1OutputType
const fn2 = pick(import("./fn2"), "default") // () => Promise<Fn2OutputType>
const out = all([fn1, fn2]) // Promise<[Fn1OutputType, Fn2OutputType]>
const fn1Out = pick(out, 0) // Promise<Fn1OutputType>
console.log(await fn1Out) // Fn1OutputType
```