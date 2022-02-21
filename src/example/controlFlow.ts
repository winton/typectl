import { all, pick, toArray, toRecord } from "typectl"

export default function () {
  const functions = import("./functions")
  const time = pick(functions, "time")
  const plusOne = pick(functions, "plusOne")
  const times = all([time, time])
  const timesPlusOne = toArray(times, plusOne)
  const timesPlusOneRecord = toRecord(
    timesPlusOne,
    (v, i) => ({ [i]: v })
  )
  return { times, timesPlusOneRecord }
}
