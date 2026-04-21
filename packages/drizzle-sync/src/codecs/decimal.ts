import type { FieldCodec } from "./types";

export interface DecimalCodecOptions {
  scale: number;
  nullable?: boolean;
  defaultValue?: string | null;
  kind?: string;
}

function toFiniteNumber(value: string | number): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = value.trim();
  if (!normalized) return null;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDecimalString(value: string | number, scale: number): string {
  const parsed = toFiniteNumber(value);
  if (parsed === null) {
    throw new Error(`Invalid decimal value: ${String(value)}`);
  }
  return parsed.toFixed(scale);
}

export function decimalCodec(
  options: DecimalCodecOptions
): FieldCodec<string | number, string, string, string> {
  const { scale, nullable = false, defaultValue = nullable ? null : "0", kind = "decimal" } = options;

  return {
    kind,
    isNullable: nullable,
    defaultValue,
    toStorage(value) {
      if (value === null || value === undefined || value === "") {
        if (nullable) return null;
        return normalizeDecimalString(defaultValue ?? "0", scale);
      }
      return normalizeDecimalString(value, scale);
    },
    fromStorage(value) {
      if (value === null || value === undefined || value === "") {
        if (nullable) return null;
        return normalizeDecimalString(defaultValue ?? "0", scale);
      }
      return normalizeDecimalString(value, scale);
    },
    toSync(value) {
      return this.toStorage(value);
    },
    fromSync(value) {
      return this.fromStorage(value);
    },
    toPatch(value) {
      if (value === undefined) return undefined;
      const normalized = this.toStorage(value);
      return normalized === null ? undefined : normalized;
    },
  };
}
