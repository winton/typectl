import { all, pick, each, wrap } from "./typectl"
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
