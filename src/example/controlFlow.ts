import { all, pick, toArray, toRecord, wrap } from "typectl"

export default function () {
  const functions = import("./functions")
  const time = wrap(pick(functions, "time"))
  const plusOne = wrap(pick(functions, "plusOne"))
  const times = all([time, time])
  const timesPlusOne = toArray(times, plusOne)
  const timesPlusOneRecord = toRecord(
    timesPlusOne,
    (v, i) => ({ [i]: v })
  )
  return { times, timesPlusOneRecord }
}
