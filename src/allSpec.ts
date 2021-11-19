import expect from "expect"
import all from "./all"
import each from "./each"
import prop, { PropType } from "./prop"

const numberFn = (input: {
  inputNumber: PropType<number>
}): { outputNumber: PropType<number> } => ({
  outputNumber: input.inputNumber,
})

const stringFn = (input: {
  inputString: PropType<string>
}): { outputString: PropType<string> } => ({
  outputString: input.inputString,
})

describe("all", () => {
  it("runs", async () => {
    const inputNumber = prop<number>()
    const inputString = prop("2")

    inputNumber.set(1)

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

    expect(x.numberFn.outputNumber.get()).toBe(1)
    expect(x.stringFn.outputString.get()).toBe("2")
    expect(x.otherFn.numberFn.outputNumber.get()).toBe(1)
    expect(x.otherFn.stringFn.outputString.get()).toBe("2")
  })
})
