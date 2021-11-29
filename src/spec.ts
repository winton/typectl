import expect from "expect"
import { all, any, each, Prop, prop } from "./typectl"

const numberFn = (input: {
  inputNumber: number
}): { outputNumber: number } => ({
  outputNumber: input.inputNumber,
})

const stringFn = (input: {
  inputString: string
}): { outputString: string } => ({
  outputString: input.inputString,
})

describe("typectl", () => {
  it("readme all example", async () => {
    const a = async ({ arg }: { arg: number }) => arg
    const b = ({ arg }: { arg: boolean }) => arg

    const abFlow = all({ a, b })

    const out = await abFlow({
      a: { arg: 1 }, // argument type safety ✅
      b: { arg: true },
    })

    expect(out.a).toBe(1) // return type safety ✅
    expect(out.b).toBe(true)
  })

  it("readme any example", async () => {
    const a = ({ arg }: { arg: number }) => arg
    const b = ({ arg }: { arg: boolean }) => arg

    const abFlow = any({ a, b })

    const out = await abFlow({
      a: { arg: 1 },
      // b argument undefined
    })

    expect(out.a).toBe(1)
    expect(out.b).toBe(undefined)
  })

  it("readme nested example", async () => {
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
  })

  it("readme prop example 1", async () => {
    const arg = prop<number>()

    setTimeout(() => (arg.value = 1), 100)
    expect(await arg.promise).toBe(1)
    expect(arg.value).toBe(1)

    arg.value = 2
    expect(arg.value).toBe(2)
    expect(await arg.promise).toBe(2)
  })

  it("readme prop example 2", async () => {
    const a = ({ arg }: { arg: number }) => arg
    const aFlow = all({ a })

    const out = await aFlow({
      a: { arg: prop(1) }, // `arg` may be number or Prop<number>
    })

    expect(out.a).toBe(1)
  })

  it("readme prop example 3", async () => {
    // simple function input signature ✅
    const a = ({ arg }: { arg: number }) => arg

    const aFlow = all({ a })

    // async prop ✅
    const arg = prop<number>()
    setTimeout(() => (arg.value = 1), 100)

    // `a` not called until prop resolves
    const out = await aFlow({ a: { arg } })

    expect(out.a).toBe(1)
  })

  it("readme prop example 4", async () => {
    const a = ({ argProp }: { argProp: Prop<number> }) =>
      (argProp.value = 1)

    const aFlow = all({ a })
    const argProp = prop<number>()

    const out = await aFlow({
      a: { argProp }, // input ending with `Prop` bypasses prop resolution
    })

    expect(argProp.value).toBe(1)
    expect(out.a).toBe(1)
  })

  it("each", async () => {
    const fn = each({ numberFn, stringFn })
    const x = await fn({
      numberFn: { inputNumber: prop(1) },
      stringFn: { inputString: prop("2") },
    })
    expect(x.numberFn.outputNumber).toBe(1)
    expect(x.stringFn.outputString).toBe("2")
  })

  it("all", async () => {
    const fn = all({ numberFn, stringFn })
    const x = await fn({
      numberFn: { inputNumber: prop(1) },
      stringFn: { inputString: prop("2") },
    })
    expect(x.numberFn.outputNumber).toBe(1)
    expect(x.stringFn.outputString).toBe("2")
  })

  it("all with each", async () => {
    const inputNumber = prop<number>()
    const inputString = prop("2")

    inputNumber.value = 1

    const x = await all({
      numberFn,
      stringFn,
      otherFn: each({ numberFn, stringFn }),
    })({
      numberFn: { inputNumber },
      stringFn: { inputString },
      otherFn: {
        numberFn: { inputNumber },
        stringFn: { inputString },
      },
    })

    expect(x.numberFn.outputNumber).toBe(1)
    expect(x.stringFn.outputString).toBe("2")
    expect(x.otherFn.numberFn.outputNumber).toBe(1)
    expect(x.otherFn.stringFn.outputString).toBe("2")
  })
})
