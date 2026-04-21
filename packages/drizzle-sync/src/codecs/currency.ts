import type { FieldCodec } from "./types";
import { decimalCodec, type DecimalCodecOptions } from "./decimal";

type CurrencyOptions = Omit<DecimalCodecOptions, "scale" | "kind">;

export function currency(options: CurrencyOptions = {}): FieldCodec<string | number, string, string, string> {
  return decimalCodec({
    scale: 2,
    kind: "currency",
    ...options,
  });
}
