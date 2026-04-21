import type { FieldCodec } from "./types";
import { decimalCodec, type DecimalCodecOptions } from "./decimal";

type WeightOptions = Omit<DecimalCodecOptions, "scale" | "kind">;

export function weight(options: WeightOptions = {}): FieldCodec<string | number, string, string, string> {
  return decimalCodec({
    scale: 3,
    kind: "weight",
    ...options,
  });
}
