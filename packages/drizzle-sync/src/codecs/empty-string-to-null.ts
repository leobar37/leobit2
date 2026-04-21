import type { FieldCodec } from "./types";

export function emptyStringToNull(): FieldCodec<string, string | null, string | null, string | null> {
  return {
    kind: "empty-string-to-null",
    isNullable: true,
    defaultValue: null,
    toStorage(value) {
      if (value === null || value === undefined) return null;
      return value === "" ? null : value;
    },
    fromStorage(value) {
      if (value === null || value === undefined) return null;
      return value;
    },
    toSync(value) {
      return this.toStorage(value);
    },
    fromSync(value) {
      return this.fromStorage(value);
    },
    toPatch(value) {
      if (value === undefined) return undefined;
      return this.toStorage(value) ?? undefined;
    },
  };
}
