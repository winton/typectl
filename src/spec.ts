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

  it("everything", async () => {
    const fn1 = pick(import("./fixture"), "fn1")
    const fn2 = pick(import("./fixture"), "fn2")

    const allOut = all([fn1, fn2])
    expect(await pick(allOut, 0)).toBe("fn1")
    expect(await pick(allOut, 1)).toBe("fn2")

    const eachOut = each([fn1, fn2])
    expect(await pick(eachOut, 0)).toBe("fn1")
    expect(await pick(eachOut, 1)).toBe("fn2")

    const relay = wrap(pick(import("./fixture"), "relay"))
    expect(await relay(pick(allOut, 0))).toBe("fn1")
    expect(await relay(pick(allOut, 1))).toBe("fn2")
  })
})
