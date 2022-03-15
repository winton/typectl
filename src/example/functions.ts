export function time() {
  return new Date().getTime()
}

export function plusOne(value: number | undefined) {
  if (value === undefined) {
    throw new Error("value cannot be undefined")
  }
  return value + 1
}
