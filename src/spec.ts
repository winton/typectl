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
import expect from "expect"

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
    const plusOne = await pick(
      import("./example/functions"),
      "plusOne"
    )
    expect(await plusOne(1)).toBe(2)

    const x: Promise<TestClass | undefined> =
      Promise.resolve(new TestClass())

    const y = await pick(x, "blah")
    expect(y).toBeInstanceOf(Function)

    try {
      await pick(Promise.resolve(undefined), "blah")
    } catch (e) {
      expect((e as Error).message).toBe(
        "`pick` received undefined value"
      )
    }
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
    expect(out).toEqual([undefined])

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

    expect(await reader.read()).toEqual({
      value: undefined,
      done: true,
    })

    const out2 = await toStream(["test"])
    const reader2 = out2.getReader()

    expect(await reader2.read()).toEqual({
      value: [0, "test"],
      done: false,
    })

    expect(await reader.read()).toEqual({
      value: undefined,
      done: true,
    })

    const out3 = await toStream({ hi: "test" })
    const reader3 = out3.getReader()

    expect(await reader3.read()).toEqual({
      value: ["hi", "test"],
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
})
