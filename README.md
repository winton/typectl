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

### `functions.ts`

```typescript
export function time() {
  return new Date().getTime()
}

export function relay(value: number) {
  return value
}
```

### `ctlFlow.ts`

```typescript
import { all, pick, each, wrap } from "./typectl"

export default async function() {
  const time = pick(import("./functions"), "time")
  const times = all([time, time])
  const time1 = pick(times, 0)
  const time2 = pick(times, 1)

  const relay = wrap(pick(import("./functions"), "relay"))
  const relayedTime1 = relay(time1)
  const relayedTime2 = relay(time2)

  expect(await relayedTime1).toEqual(await time1)
  expect(await relayedTime2).toEqual(await time2)
  
  // console.log(await time1, await time2)
}
```