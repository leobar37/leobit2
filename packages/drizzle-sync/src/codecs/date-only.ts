import type { FieldCodec } from "./types";

function normalizeDateOnly(value: string): string {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`Invalid date-only value: ${value}`);
  }
  return trimmed;
}

export function dateOnly(options: { nullable?: boolean } = {}): FieldCodec<string, string, string, string> {
  const { nullable = false } = options;

  return {
    kind: "date-only",
    isNullable: nullable,
    defaultValue: nullable ? null : "1970-01-01",
    toStorage(value) {
      if (value === null || value === undefined || value === "") {
        if (nullable) return null;
        return "1970-01-01";
      }
      return normalizeDateOnly(value);
    },
    fromStorage(value) {
      if (value === null || value === undefined || value === "") {
        if (nullable) return null;
        return "1970-01-01";
      }
      return normalizeDateOnly(value);
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
