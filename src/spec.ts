import expect from "expect"
import {
  all,
  each,
  mapToArray,
  prop,
  RecordKeyType,
} from "./typectl"
import { call, mapToStream } from "./typectl"
import { ReadableStream } from "web-streams-polyfill/ponyfill"

const fakeDynamicImport = Promise.resolve({
  default: ({ hi }: { hi: boolean }) => {
    return { hello: hi }
  },
})

describe("typectl", () => {
  describe("all", () => {
    it("wait for calls in parallel", async () => {
      const x = await all(Promise.resolve(1), 2)
      expect(x).toEqual([1, 2])
    })
  })

  describe("each", () => {
    it("wait for calls in serial", async () => {
      const x = await each(
        () => Promise.resolve(1),
        () => 2
      )
      expect(x).toEqual([1, 2])
    })
  })

  describe("call", () => {
    it("calls dynamic import", async () => {
      const hello = prop<boolean>()
      await call(fakeDynamicImport, { hi: true }, { hello })
      expect(hello.value).toBe(true)
    })

    it("waits for prop args", async () => {
      const hi = prop<boolean>()
      const hello = prop<boolean>()
      setTimeout(() => (hi.value = true), 10)
      await call(fakeDynamicImport, { hi: true }, { hello })
      expect(hello.value).toBe(true)
    })

    it("works with all", async () => {
      const hello = prop<boolean>()
      const hello2 = prop<boolean>()
      const out = await all(
        call(fakeDynamicImport, { hi: true }, { hello }),
        call(
          fakeDynamicImport,
          { hi: hello },
          { hello: hello2 }
        )
      )
      expect(out).toEqual([undefined, undefined])
      expect(hello.value).toBe(true)
      expect(hello2.value).toBe(true)
    })

    it("works with each", async () => {
      const hello = prop<boolean>()
      const hello2 = prop<boolean>()
      const out = await each(
        () =>
          call(fakeDynamicImport, { hi: true }, { hello }),
        () =>
          call(
            fakeDynamicImport,
            { hi: hello },
            { hello: hello2 }
          )
      )
      expect(out).toEqual([undefined, undefined])
      expect(hello.value).toBe(true)
      expect(hello2.value).toBe(true)
    })
  })

  describe("mapToStream", () => {
    it("from array", async () => {
      const output = prop<ReadableStream<string>>()

      await mapToStream(["blah"], output, (v) => v)

      const reader = output.value.getReader()

      expect(await reader.read()).toEqual({
        value: "blah",
        done: false,
      })

      expect(await reader.read()).toEqual({ done: true })
    })

    it("from stream", async () => {
      let streamController: ReadableStreamController<string>

      const stream = new ReadableStream({
        start(controller) {
          streamController = controller
        },
      })

      streamController.enqueue("blah")
      streamController.close()

      const output = prop<ReadableStream<string>>()

      await mapToStream(stream, output, (v) => v)

      const reader = output.value.getReader()

      expect(await reader.read()).toEqual({
        value: "blah",
        done: false,
      })

      expect(await reader.read()).toEqual({ done: true })
    })

    it("from record", async () => {
      const output =
        prop<ReadableStream<[string, string]>>()

      await mapToStream({ hi: "blah" }, output, (v, k) => [
        k,
        v,
      ])

      const reader = output.value.getReader()

      expect(await reader.read()).toEqual({
        value: ["hi", "blah"],
        done: false,
      })

      expect(await reader.read()).toEqual({ done: true })
    })
  })

  describe("mapToArray", () => {
    it("from array", async () => {
      const output = prop<string[]>()

      await mapToArray(["blah"], output, (v) => v)

      expect(output.value).toEqual(["blah"])
    })

    it("from prop array", async () => {
      const output = prop<string[]>()

      await mapToArray(prop(["blah"]), output, (v) => v)

      expect(output.value).toEqual(["blah"])
    })

    it("from stream", async () => {
      let streamController: ReadableStreamController<string>

      const stream = new ReadableStream({
        start(controller) {
          streamController = controller
        },
      })

      streamController.enqueue("blah")
      streamController.close()

      const output = prop<string[]>()

      await mapToArray(stream, output, (v) => v)

      expect(output.value).toEqual(["blah"])
    })

    it("from record", async () => {
      const output = prop<[string, RecordKeyType][]>()

      await mapToArray({ hi: "blah" }, output, (v, k) => [
        k,
        v,
      ])

      expect(output.value).toEqual([["hi", "blah"]])
    })
  })
})
