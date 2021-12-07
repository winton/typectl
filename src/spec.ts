import expect from "expect"
import { all, any, each, prop } from "./typectl"

const incrementNumber = ({
  num,
  increment,
}: {
  num: number
  increment: number
}) => {
  return { num: num + increment }
}

describe("typectl", () => {
  it("your first control flow", async () => {
    // control flow builder
    const increment = all({
      incrementNumberBy1: incrementNumber,
      incrementNumberBy2: incrementNumber,
    })

    // create props (see next section)
    const num1 = prop<number>()
    const num2 = prop<number>()

    // execute control flow
    await increment({
      incrementNumberBy1: [
        // argument mapping
        { num: 0, increment: 1 },
        // return mapping
        { num: num1 },
      ],
      incrementNumberBy2: [
        // argument mapping
        { num: num1, increment: 2 },
        // return mapping
        { num: num2 },
      ],
    })

    // drumroll please...
    expect(num1.value).toBe(1)
    expect(num2.value).toBe(3)
  })

  it("freezes props", async () => {
    const hello = prop("hello")

    expect(() => {
      hello.value = "hi" // error!
    }).toThrow()

    const hi = prop()
    hi.value = "hi" // no error!
  })

  it("awaits props", async () => {
    const hello = prop<string>()
    setTimeout(() => (hello.value = "hello"), 10)
    expect(await hello.promise).toBe("hello")
  })

  it("control flow builder chains", async () => {
    // nested control flow builders
    const caller = all({
      incrementNumberBy1: incrementNumber,
      incrementNumbersInSuccession: each({
        incrementNumberBy2: incrementNumber,
        incrementNumberBy3: incrementNumber,
        incrementAnyNumber: any({
          incrementNumberBy4: incrementNumber,
          incrementNumberBy5: incrementNumber,
        }),
      }),
    })

    // create props
    const num = prop<number>()
    const num2 = prop<number>()
    const num3 = prop<number>()
    const num4 = prop<number>()

    // call control flow
    await caller({
      // input & output mappings
      incrementNumberBy1: [
        { num: 0, increment: 1 },
        { num },
      ],
      incrementNumbersInSuccession: [
        {
          incrementNumberBy2: [
            { num, increment: 2 },
            { num: num2 },
          ],
          incrementNumberBy3: [
            { num: num2, increment: 3 },
            { num: num3 },
          ],
          incrementAnyNumber: [
            {
              incrementNumberBy4: [
                { num: num3, increment: 4 },
                { num: num4 },
              ],
              incrementNumberBy5: false,
            },
          ],
        },
      ],
    })

    // drumroll please...
    expect(num.value).toBe(1)
    expect(num2.value).toBe(3)
    expect(num3.value).toBe(6)
    expect(num4.value).toBe(10)
  })
})
