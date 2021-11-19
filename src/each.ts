import {
  RecordType,
  RecordOutType,
  RecordInType,
} from "io-type"

export default function each<Obj extends RecordType>(
  obj: Obj
) {
  return async (
    input: RecordInType<Obj>
  ): Promise<RecordOutType<Obj>> => {
    const outputs: any = {}
    const keys = Object.keys(obj)

    for (const key of keys) {
      outputs[key] = await obj[key](input[key])
    }

    return outputs
  }
}
