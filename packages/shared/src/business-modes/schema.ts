import { z } from "zod";

/**
 * Business Mode Flags Schema
 * Defines all configurable flags per business vertical.
 * Used as the source of truth for feature enablement.
 */
export const BusinessModeFlagsSchema = z.object({
  // Sale / Calculator flags
  useTara: z.boolean().default(false),
  useNetWeight: z.boolean().default(false),
  useContainers: z.boolean().default(false),
  useDeposits: z.boolean().default(false),

  // Customer flags
  useSubscriptions: z.boolean().default(false),
  useFrequency: z.boolean().default(false),
  customCustomerFields: z.array(z.string()).default([]),

  // Product flags
  defaultUnit: z.enum(["kg", "unidad"]).default("kg"),
  suggestedProducts: z
    .array(
      z.object({
        name: z.string(),
        variants: z.array(
          z.object({
            name: z.string(),
            unitQty: z.number(),
          })
        ),
      })
    )
    .default([]),

  // Distribution / Close flags
  closeFields: z
    .array(
      z.enum([
        "llevado",
        "vendido",
        "devuelto",
        "entregado",
        "recogido",
        "danado",
      ])
    )
    .default([]),

  // UI labels
  saleCalculatorTitle: z.string().default("Nueva Venta"),
  showVisitStatus: z.boolean().default(true),

  // Settlement capabilities
  supportsCreditSettlement: z.boolean().default(true),
  supportsPartialSettlement: z.boolean().default(true),
});

export type BusinessModeFlags = z.infer<typeof BusinessModeFlagsSchema>;

/**
 * Business Mode identifier
 */
export const BusinessModeSlugSchema = z.enum(["polleria", "agua", "cochera"]);
export type BusinessModeSlug = z.infer<typeof BusinessModeSlugSchema>;

/**
 * Validates and merges overrides with defaults
 */
export function mergeBusinessModeFlags(
  defaults: BusinessModeFlags,
  overrides: Partial<BusinessModeFlags> | Record<string, unknown> | null | undefined
): BusinessModeFlags {
  const merged = { ...defaults, ...overrides };
  return BusinessModeFlagsSchema.parse(merged);
}
