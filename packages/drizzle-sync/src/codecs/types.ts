import type { z } from "zod";

export interface CodecZodFactories {
  create?: () => z.ZodTypeAny;
  update?: () => z.ZodTypeAny;
  persisted?: () => z.ZodTypeAny;
  sync?: () => z.ZodTypeAny;
}

/**
 * FieldCodec normalizes values across storage/sync boundaries.
 *
 * It complements Zod instead of replacing it:
 * - Zod validates shape and business constraints
 * - Codec serializes/deserializes field representations
 */
export interface FieldCodec<
  TInput = any,
  TStored = any,
  TSync = TStored,
  TOutput = TInput,
> {
  kind: string;
  toStorage(value: TInput | TStored | null | undefined): TStored | null | undefined;
  fromStorage(value: TStored | null | undefined): TOutput | null | undefined;
  toSync?(value: TInput | TStored | null | undefined): TSync | null | undefined;
  fromSync?(value: TSync | null | undefined): TOutput | null | undefined;
  toPatch?(value: TInput | TStored | null | undefined): TStored | undefined;
  isNullable?: boolean;
  defaultValue?: TStored | null;
  zod?: CodecZodFactories;
}

export type FieldCodecMap = Record<string, FieldCodec<any, any, any, any>>;
