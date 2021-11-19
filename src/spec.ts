import expect from "expect"
import { all, each, prop, Prop } from "./typectl"

const numberFn = (input: {
  inputNumber: Prop<number>
}): { outputNumber: Prop<number> } => ({
  outputNumber: input.inputNumber,
})

const stringFn = (input: {
  inputString: Prop<string>
}): { outputString: Prop<string> } => ({
  outputString: input.inputString,
})

describe("typectl", () => {
  it("readme all example", async () => {
    const a = ({ arg }: { arg: number }) => arg
    const b = ({ arg }: { arg: boolean }) => arg

    const ab = all({ a, b })

    const out = await ab({
      a: { arg: 1 }, // arg type safety ✅
      b: { arg: true },
    })

    expect(out.a).toBe(1) // return type safety ✅
    expect(out.b).toBe(true)
  })

  it("readme prop example", async () => {
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
  })

  it("each", async () => {
    const fn = each({ numberFn, stringFn })
    const x = await fn({
      numberFn: { inputNumber: prop(1) },
      stringFn: { inputString: prop("2") },
    })
    expect(x.numberFn.outputNumber.value).toBe(1)
    expect(x.stringFn.outputString.value).toBe("2")
  })

  it("all", async () => {
    const fn = all({ numberFn, stringFn })
    const x = await fn({
      numberFn: { inputNumber: prop(1) },
      stringFn: { inputString: prop("2") },
    })
    expect(x.numberFn.outputNumber.value).toBe(1)
    expect(x.stringFn.outputString.value).toBe("2")
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

    expect(x.numberFn.outputNumber.value).toBe(1)
    expect(x.stringFn.outputString.value).toBe("2")
    expect(x.otherFn.numberFn.outputNumber.value).toBe(1)
    expect(x.otherFn.stringFn.outputString.value).toBe("2")
  })
})
