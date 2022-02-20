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
} from "./typectl"
import expect from "expect"

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

  describe("pick", () => {
    it("import", async () => {
      const pickedPick = pick(import("./typectl"), "pick")
      expect(await pickedPick).toBe(pick)
    })
  })

  it("iterate", async () => {
    const out = []
    await iterate(["hello"], (v, i) => out.push([v, i]))
    expect(out).toEqual([["hello", 0]])

    const out2 = []
    await iterate(
      Promise.resolve(["hello"]),
      Promise.resolve((v, i) => out2.push([v, i]))
    )
    expect(out2).toEqual([["hello", 0]])
  })

  it("toArray", async () => {
    const out = await toArray([undefined], (v) => v)
    expect(out).toEqual([undefined])

    const out1 = await toArray(["test"], (v) => v)
    expect(out1).toEqual(["test"])

    const out2 = await toArray(["test"], (v) => ["hi", v])
    expect(out2).toEqual(["hi", "test"])
  })

  it("toRecord", async () => {
    const out = await toRecord([undefined], (v) => ({
      [v]: v,
    }))
    expect(out).toEqual({ undefined: undefined })

    const out1 = await toRecord(["test"], (v) => ({
      [v]: v,
    }))
    expect(out1).toEqual({ test: "test" })
  })

  it("toStream", async () => {
    const out = await toStream([undefined], (v) => ({
      [v]: v,
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
      [v]: v,
    }))

    const reader1 = out1.getReader()

    expect(await reader1.read()).toEqual({
      value: { test: "test" },
      done: false,
    })

    expect(await reader.read()).toEqual({
      value: undefined,
      done: true,
    })
  })

  it("toValue", async () => {
    const out = await toValue([undefined], (v) => v)
    expect(out).toEqual(undefined)

    const out1 = await toValue(["test"], (v) => v)
    expect(out1).toEqual("test")

    const out2 = await toValue(
      ["test", "test2", "test3"],
      (v, i) => (i > 0 ? v : undefined)
    )
    expect(out2).toEqual("test3")
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

  it("readme", async () => {
    const time = pick(import("./fixture"), "time")
    const times = all([time, time])
    const time1 = pick(times, 0)
    const time2 = pick(times, 1)

    const relay = wrap(pick(import("./fixture"), "relay"))
    const relayedTime1 = relay(time1)
    const relayedTime2 = relay(time2)

    expect(await relayedTime1).toEqual(await time1)
    expect(await relayedTime2).toEqual(await time2)
  })
})
