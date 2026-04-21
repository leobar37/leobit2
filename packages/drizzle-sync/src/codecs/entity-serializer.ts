import type { FieldCodec, FieldCodecMap } from "./types";

function transformWithCodec(
  source: Record<string, unknown>,
  codecs: FieldCodecMap,
  transformer: (codec: FieldCodec, value: unknown) => unknown
): Record<string, unknown> {
  const output: Record<string, unknown> = { ...source };

  for (const [field, codec] of Object.entries(codecs)) {
    if (!(field in source)) continue;
    output[field] = transformer(codec, source[field]);
  }

  return output;
}

export function serializeEntityInput<T extends Record<string, unknown>>(
  input: T,
  codecs: FieldCodecMap
): T {
  return transformWithCodec(input, codecs, (codec, value) => codec.toStorage(value)) as T;
}

export function deserializeEntityRow<T extends Record<string, unknown>>(
  row: T,
  codecs: FieldCodecMap
): T {
  return transformWithCodec(row, codecs, (codec, value) => codec.fromStorage(value)) as T;
}

export function serializeSyncPayload<T extends Record<string, unknown>>(
  payload: T,
  codecs: FieldCodecMap
): T {
  return transformWithCodec(payload, codecs, (codec, value) =>
    codec.toSync ? codec.toSync(value) : codec.toStorage(value)
  ) as T;
}

export function deserializeSyncPayload<T extends Record<string, unknown>>(
  payload: T,
  codecs: FieldCodecMap
): T {
  return transformWithCodec(payload, codecs, (codec, value) =>
    codec.fromSync ? codec.fromSync(value) : codec.fromStorage(value)
  ) as T;
}
