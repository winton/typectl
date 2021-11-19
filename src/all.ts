import {
  RecordType,
  RecordOutType,
  RecordInType,
} from "io-type"

export default function all<Obj extends RecordType>(
  obj: Obj
) {
  return async (
    input: RecordInType<Obj>
  ): Promise<RecordOutType<Obj>> => {
    const outputs: any = {}
    const keys = Object.keys(obj)

    for (const key of keys) {
      outputs[key] = obj[key](input[key])
    }

    await Promise.all(Object.values(outputs))

    for (const key of keys) {
      outputs[key] = await outputs[key]
    }

    return outputs
  }
}
