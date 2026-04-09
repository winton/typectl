type ReadableStreamType = typeof ReadableStream

/**
 * Returns the native `ReadableStream` constructor, falling
 * back to the `web-streams-polyfill` package in environments
 * where it is unavailable (e.g. older Node.js versions).
 */
export async function getReadableStream() {
  if (typeof ReadableStream === "undefined") {
    return (await import("web-streams-polyfill"))
      .ReadableStream as unknown as ReadableStreamType
  } else {
    return ReadableStream
  }
}
