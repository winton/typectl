import { describe, it, expect } from "vitest"
import {
  all,
  pick,
  each,
  wrap,
  iterate,
  toArray,
  toRecord,
  toStream,
  toValue,
  tee,
  wrapPick,
  assign,
} from "./typectl"

class TestClass {
  blah() {
    return true
  }
}

describe("typectl", () => {
  describe("wrap", () => {
    it("function", async () => {
      const fn = wrap((x: string, y: Promise<string>) => [
        x,
        y,
      ])

      expect(
        await fn("hi", Promise.resolve("hello"))
      ).toEqual(["hi", "hello"])
    })

    it("promise", async () => {
      const fn = wrap(
        Promise.resolve((x: string, y: Promise<string>) => [
          x,
          y,
        ])
      )

      expect(
        await fn("hi", Promise.resolve("hello"))
      ).toEqual(["hi", "hello"])
    })
  })

  it("wrapPick", async () => {
    const fn = wrapPick(
      { x: (x: string, y: Promise<string>) => [x, y] },
      "x"
    )

    expect(
      await fn("hi", Promise.resolve("hello"))
    ).toEqual(["hi", "hello"])
  })

  it("pick", async () => {
    const fetchUser = await pick(
      import("./example/functions"),
      "fetchUser"
    )
    expect(await fetchUser("test-1")).toEqual({
      id: "test-1",
      name: "Alice",
      email: "alice@example.com",
    })

    const x: Promise<TestClass | undefined> =
      Promise.resolve(new TestClass())

    const y = await pick(x, "blah")
    expect(y).toBeInstanceOf(Function)

    await expect(
      pick(Promise.resolve(undefined), "blah")
    ).rejects.toThrow("`pick` received undefined value")
  })

  it("tee", async () => {
    const stream = await toStream(["test"])
    const [stream1, stream2] = tee(stream)
    const reader1 = (await stream1).getReader()
    const reader2 = (await stream2).getReader()

    expect(await reader1.read()).toEqual({
      value: [0, "test"],
      done: false,
    })

    expect(await reader1.read()).toEqual({
      value: undefined,
      done: true,
    })

    expect(await reader2.read()).toEqual({
      value: [0, "test"],
      done: false,
    })

    expect(await reader2.read()).toEqual({
      value: undefined,
      done: true,
    })
  })

  it("iterate", async () => {
    const out: any[] = []

    await iterate(["hello"], (v, i) => out.push([v, i]))
    expect(out).toEqual([["hello", 0]])

    const out2: any[] = []
    await iterate(
      Promise.resolve(["hello"]),
      Promise.resolve((v: any, i: any) => out2.push([v, i]))
    )
    expect(out2).toEqual([["hello", 0]])
  })

  it("toArray", async () => {
    const out = await toArray([undefined], (v) => v)
    expect(out).toEqual([])

    const out1 = await toArray(["test"])
    expect(out1).toEqual(["test"])

    const out2 = await toArray(["test"], (v) => v)
    expect(out2).toEqual(["test"])

    const out3 = await toArray(["test"], (v) => [v])
    expect(out3).toEqual(["test"])

    const out4 = await toArray(["test"], (v) => ["hi", v])
    expect(out4).toEqual(["hi", "test"])
  })

  it("toRecord", async () => {
    const out = await toRecord([undefined], (v) => ({
      [v as any]: v,
    }))
    expect(out).toEqual({ undefined: undefined })

    const out1 = await toRecord(["test"], (v) => ({
      [v as any]: v,
    }))
    expect(out1).toEqual({ test: "test" })

    const out2 = await toRecord(["test"])
    expect(out2).toEqual({ 0: "test" })
  })

  it("toStream", async () => {
    const out = await toStream([undefined], (v) => ({
      [v as any]: v,
    }))

    const reader = out.getReader()

    expect(await reader.read()).toEqual({
      value: { undefined: undefined },
      done: false,
    })

    expect(await reader.read()).toEqual({
      value: undefined,
      done: true,
    })

    const out1 = await toStream(["test"], (v) => ({
      [v as any]: v,
    }))

    const reader1 = out1.getReader()

    expect(await reader1.read()).toEqual({
      value: { test: "test" },
      done: false,
    })

    expect(await reader1.read()).toEqual({
      value: undefined,
      done: true,
    })

    const out2 = await toStream(["test"])
    const reader2 = out2.getReader()

    expect(await reader2.read()).toEqual({
      value: [0, "test"],
      done: false,
    })

    expect(await reader2.read()).toEqual({
      value: undefined,
      done: true,
    })

    const out3 = await toStream({ hi: "test" })
    const reader3 = out3.getReader()

    expect(await reader3.read()).toEqual({
      value: ["hi", "test"],
      done: false,
    })

    expect(await reader3.read()).toEqual({
      value: undefined,
      done: true,
    })
  })

  it("toValue", async () => {
    const out = await toValue([undefined], (v) => v)
    expect(out).toEqual(undefined)

    const out1 = await toValue(["test"], (v) => v)
    expect(out1).toEqual("test")

    const out2 = await toValue(["test1", "test2"])
    expect(out2).toEqual("test2")

    const out3 = await toValue(
      ["test", "test2", "test3"],
      (v, i: any) => (i > 0 ? v : undefined)
    )
    expect(out3).toEqual("test3")
  })

  it("each", async () => {
    const r = each([
      Promise.resolve(true),
      1,
      async () => "hello",
    ])

    const r0 = pick(r, 0)
    expect(await r0).toBe(true)

    const r1 = pick(r, 1)
    expect(await r1).toBe(1)

    const r2 = pick(r, 2)
    expect(await r2).toBe("hello")
  })

  it("all", async () => {
    const r = all([Promise.resolve(true), 1, () => "hello"])

    const r0 = pick(r, 0)
    expect(await r0).toBe(true)

    const r1 = pick(r, 1)
    expect(await r1).toBe(1)

    const r2 = pick(r, 2)
    expect(await r2).toBe("hello")
  })

  it("assign", async () => {
    const r = assign(
      Promise.resolve({ x: true }),
      Promise.resolve({ y: true })
    )

    expect(await r).toEqual({ x: true, y: true })
  })

  it("assign with 3 sources", async () => {
    const r = assign(
      Promise.resolve({ a: 1 }),
      Promise.resolve({ b: 2 }),
      Promise.resolve({ c: 3 })
    )

    expect(await r).toEqual({ a: 1, b: 2, c: 3 })
  })

  describe("wrap error propagation", () => {
    it("propagates thrown errors", async () => {
      const fn = wrap(() => {
        throw new Error("sync error")
      })

      await expect(fn()).rejects.toThrow("sync error")
    })

    it("propagates rejected promises", async () => {
      const fn = wrap(
        Promise.resolve(() => {
          throw new Error("from rejected")
        })
      )

      await expect(fn()).rejects.toThrow("from rejected")
    })
  })

  describe("all/each error handling", () => {
    it("all rejects when an element rejects", async () => {
      await expect(
        all([
          Promise.resolve(1),
          Promise.reject(new Error("fail")),
        ])
      ).rejects.toThrow("fail")
    })

    it("each rejects when an element rejects", async () => {
      await expect(
        each([
          Promise.resolve(1),
          Promise.reject(new Error("fail")),
        ])
      ).rejects.toThrow("fail")
    })
  })

  it("iterate over ReadableStream", async () => {
    const stream = new ReadableStream<string>({
      start(controller) {
        controller.enqueue("a")
        controller.enqueue("b")
        controller.enqueue("c")
        controller.close()
      },
    })

    const out: string[] = []
    await iterate(stream, (v: string) => {
      out.push(v)
    })
    expect(out).toEqual(["a", "b", "c"])
  })

  it("iterate over Record", async () => {
    const out: [any, any][] = []
    await iterate(
      { x: 1, y: 2 } as Record<string, number>,
      (v: number, k: any) => {
        out.push([k, v])
      }
    )
    expect(out).toContainEqual(["x", 1])
    expect(out).toContainEqual(["y", 2])
  })

  it("iterate skips class instances", async () => {
    const out: any[] = []
    await iterate(new TestClass() as any, (v: any) => out.push(v))
    expect(out).toEqual([])
  })

  describe("toValue with falsy results", () => {
    it("reduces to 0", async () => {
      const out = await toValue([1, 2, 3], () => 0)
      expect(out).toBe(0)
    })

    it("reduces to empty string", async () => {
      const out = await toValue(["a", "b"], () => "")
      expect(out).toBe("")
    })

    it("reduces to false", async () => {
      const out = await toValue([1], () => false)
      expect(out).toBe(false)
    })
  })

  it("toValue is sequential and deterministic for arrays", async () => {
    const order: number[] = []
    const out = await toValue(
      [1, 2, 3],
      async (v: number, _i: number, acc: number | undefined) => {
        order.push(v)
        return (acc ?? 0) + v
      }
    )
    expect(order).toEqual([1, 2, 3])
    expect(out).toBe(6)
  })

  it("toValue is sequential and deterministic for records", async () => {
    const order: string[] = []
    const out = await toValue(
      { a: 1, b: 2, c: 3 } as Record<string, number>,
      async (v: number, k: any, acc: number | undefined) => {
        order.push(k)
        return (acc ?? 0) + v
      }
    )
    expect(order).toEqual(["a", "b", "c"])
    expect(out).toBe(6)
  })

  it("toStream propagates callback errors", async () => {
    const stream = await toStream(["a", "b"], () => {
      throw new Error("stream callback error")
    })

    const reader = stream.getReader()

    await expect(reader.read()).rejects.toThrow(
      "stream callback error"
    )
  })

  it("pick returns non-function values unwrapped", async () => {
    const obj = { name: "typectl", version: 42 }

    const name = await pick(obj, "name")
    expect(name).toBe("typectl")

    const version = await pick(obj, "version")
    expect(version).toBe(42)
  })

  describe("empty iterables", () => {
    it("toArray on empty array", async () => {
      expect(await toArray([])).toEqual([])
    })

    it("toArray on empty record", async () => {
      expect(await toArray({})).toEqual([])
    })

    it("toRecord on empty array", async () => {
      expect(await toRecord([])).toEqual({})
    })

    it("toRecord on empty record", async () => {
      expect(await toRecord({})).toEqual({})
    })

    it("toValue on empty array returns undefined", async () => {
      expect(await toValue([])).toBeUndefined()
    })

    it("toStream on empty array closes immediately", async () => {
      const stream = await toStream([])
      const reader = stream.getReader()
      expect(await reader.read()).toEqual({
        value: undefined,
        done: true,
      })
    })

    it("iterate on empty array", async () => {
      const out: any[] = []
      await iterate([], (v) => out.push(v))
      expect(out).toEqual([])
    })

    it("iterate on empty record", async () => {
      const out: any[] = []
      await iterate({} as Record<string, number>, (v) =>
        out.push(v)
      )
      expect(out).toEqual([])
    })

    it("iterate on empty ReadableStream", async () => {
      const stream = new ReadableStream<string>({
        start(controller) {
          controller.close()
        },
      })
      const out: string[] = []
      await iterate(stream, (v) => out.push(v))
      expect(out).toEqual([])
    })

    it("wrap with zero-arg function", async () => {
      const fn = wrap(() => 42)
      expect(await fn()).toBe(42)
    })

    it("all on empty array", async () => {
      expect(await all([])).toEqual([])
    })

    it("each on empty array", async () => {
      expect(await each([])).toEqual([])
    })
  })
})
