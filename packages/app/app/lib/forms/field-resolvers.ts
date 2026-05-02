export interface FieldResolverContext {
  signal?: AbortSignal;
}

export interface FieldResolver<TValue = unknown, TServerValue = unknown> {
  kind: string;
  toServer(value: TValue, context: FieldResolverContext): Promise<TServerValue>;
}

export type WrapperFieldMap<TValues> = Partial<
  Record<keyof TValues, FieldResolver>
>;

export type ResolvedFieldValue =
  | string
  | { id: string }
  | File
  | null
  | undefined;

export function isResolvedMediaObject(value: unknown): value is { id: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as Record<string, unknown>).id === "string"
  );
}
