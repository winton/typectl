import { pick } from "../typectl"
import expect from "expect"
import controlFlow from "./controlFlow"

describe("example", () => {
  it("runs control flow", async () => {
    const { times, timesPlusOneRecord } = controlFlow()

    expect(await times).toEqual([
      expect.any(Number),
      expect.any(Number),
    ])

    expect(await timesPlusOneRecord).toEqual({
      0: expect.any(Number),
      1: expect.any(Number),
    })

    expect(await pick(times, 0)).toEqual(
      (await pick(timesPlusOneRecord, 0)) - 1
    )
  })
})
