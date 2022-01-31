import expect from "expect"
import {
  all,
  call,
  each,
  map,
  prop,
  RecordKeyType,
} from "./typectl"
import { ReadableStream } from "web-streams-polyfill/ponyfill"

const fakeDynamicImport = Promise.resolve({
  default: ({ hi }: { hi: boolean }) => {
    return { hello: hi }
  },
})

describe("typectl", () => {
  describe("all", () => {
    it("wait for calls in parallel", async () => {
      const x = await all([Promise.resolve(1), 2])
      expect(x).toEqual([1, 2])
    })
  })

  describe("each", () => {
    it("wait for calls in serial", async () => {
      const x = await each([
        () => Promise.resolve(1),
        () => 2,
      ])
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
      const out = await all([
        call(fakeDynamicImport, { hi: true }, { hello }),
        call(
          fakeDynamicImport,
          { hi: hello },
          { hello: hello2 }
        ),
      ])
      expect(out).toEqual([undefined, undefined])
      expect(hello.value).toBe(true)
      expect(hello2.value).toBe(true)
    })

    it("works with each", async () => {
      const hello = prop<boolean>()
      const hello2 = prop<boolean>()
      const out = await each([
        () =>
          call(fakeDynamicImport, { hi: true }, { hello }),
        () =>
          call(
            fakeDynamicImport,
            { hi: hello },
            { hello: hello2 }
          ),
      ])
      expect(out).toEqual([undefined, undefined])
      expect(hello.value).toBe(true)
      expect(hello2.value).toBe(true)
    })
  })

  describe("map to stream", () => {
    it("from array", async () => {
      const output = prop<ReadableStream<string>>()

      await map(["blah", undefined], {
        compress: true,
        stream: output,
      })

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
      streamController.enqueue(undefined)
      streamController.close()

      const output = prop<ReadableStream<string>>()

      await map(stream, { compress: true, stream: output })

      const reader = output.value.getReader()

      expect(await reader.read()).toEqual({
        value: "blah",
        done: false,
      })

      expect(await reader.read()).toEqual({ done: true })
    })

    it("from record", async () => {
      const output =
        prop<ReadableStream<[RecordKeyType, string]>>()

      await map(
        { hi: "blah", no: undefined },
        { compress: true, stream: output }
      )

      const reader = output.value.getReader()

      expect(await reader.read()).toEqual({
        value: ["hi", "blah"],
        done: false,
      })

      expect(await reader.read()).toEqual({ done: true })
    })
  })

  describe("map to array", () => {
    it("from array", async () => {
      const output = prop<string[]>()

      await map(["blah", undefined], {
        array: output,
        compress: true,
      })

      expect(output.value).toEqual(["blah"])
    })

    it("from prop array", async () => {
      const output = prop<string[]>()

      await map(prop(["blah"]), { array: output })

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
      streamController.enqueue(undefined)
      streamController.close()

      const output = prop<string[]>()

      await map(stream, { array: output, compress: true })

      expect(output.value).toEqual(["blah"])
    })

    it("from record", async () => {
      const output = prop<[RecordKeyType, string][]>()

      await map(
        { hi: "blah", no: undefined },
        { array: output, compress: true }
      )

      expect(output.value).toEqual([["hi", "blah"]])
    })
  })

  describe("map to record", () => {
    it("from array", async () => {
      const output = prop<Record<string, string>>()

      await map(
        ["blah", undefined],
        { compress: true, record: output },
        (v) => ["hi", v]
      )

      expect(output.value).toEqual({ hi: "blah" })
    })

    it("from prop array", async () => {
      const output = prop<Record<string, string>>()

      await map(
        prop(["blah", undefined]),
        { compress: true, record: output },
        (v) => ["hi", v]
      )

      expect(output.value).toEqual({ hi: "blah" })
    })

    it("from stream", async () => {
      let streamController: ReadableStreamController<string>

      const stream = new ReadableStream<string>({
        start(controller) {
          streamController = controller
        },
      })

      streamController.enqueue("blah")
      streamController.enqueue(undefined)
      streamController.close()

      const output = prop<Record<string, boolean>>()

      await map(
        stream,
        { compress: true, record: output },
        (v) => [v, v ? true : undefined]
      )

      expect(output.value).toEqual({ blah: true })
    })

    it("from record", async () => {
      const output = prop<Record<string, string>>()

      await map(
        { hi: "blah", no: undefined },
        { compress: true, record: output }
      )

      expect(output.value).toEqual({ hi: "blah" })
    })
  })

  describe("map to value", () => {
    it("from array", async () => {
      const output = prop<string>()

      await map([undefined, "blah"], {
        compress: true,
        value: output,
      })

      expect(output.value).toEqual("blah")
    })

    it("from prop array", async () => {
      const output = prop<string>()

      await map(prop([undefined, "blah"]), {
        compress: true,
        value: output,
      })

      expect(output.value).toEqual("blah")
    })

    it("from stream", async () => {
      let streamController: ReadableStreamController<string>

      const stream = new ReadableStream<string>({
        start(controller) {
          streamController = controller
        },
      })

      streamController.enqueue(undefined)
      streamController.enqueue("blah")
      streamController.close()

      const output = prop<string>()

      await map(stream, { compress: true, value: output })

      expect(output.value).toEqual("blah")
    })

    it("from record", async () => {
      const output = prop<[string, string]>()

      await map(
        { hi: "blah", no: undefined },
        { compress: true, value: output }
      )

      expect(output.value).toEqual(["hi", "blah"])
    })
  })
})
