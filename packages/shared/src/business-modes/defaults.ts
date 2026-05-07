import type { BusinessModeFlags } from "./schema";

/**
 * Default flag configurations per business mode.
 * This is the source of truth for feature enablement by vertical.
 */
export const BUSINESS_MODE_DEFAULTS: Record<string, BusinessModeFlags> = {
  polleria: {
    useTara: true,
    useNetWeight: true,
    useContainers: false,
    useDeposits: false,
    useSubscriptions: false,
    useFrequency: false,
    customCustomerFields: [],
    defaultUnit: "kg",
    suggestedProducts: [
      {
        name: "Pollo",
        variants: [
          { name: "Entero", unitQty: 1 },
          { name: "1/2", unitQty: 0.5 },
          { name: "1/4", unitQty: 0.25 },
        ],
      },
    ],
    closeFields: ["llevado", "vendido", "devuelto"],
    saleCalculatorTitle: "Venta de Pollo",
    showVisitStatus: true,
  },
  agua: {
    useTara: false,
    useNetWeight: false,
    useContainers: false,
    useDeposits: false,
    useSubscriptions: true,
    useFrequency: true,
    customCustomerFields: ["frequency", "deliveryDays", "defaultOrderQuantity"],
    defaultUnit: "unidad",
    suggestedProducts: [
      {
        name: "Bidón",
        variants: [
          { name: "20L", unitQty: 1 },
          { name: "10L", unitQty: 1 },
        ],
      },
      {
        name: "Recarga",
        variants: [
          { name: "20L", unitQty: 1 },
          { name: "10L", unitQty: 1 },
        ],
      },
    ],
    closeFields: ["entregado"],
    saleCalculatorTitle: "Entrega de Agua",
    showVisitStatus: true,
  },
  cochera: {
    useTara: false,
    useNetWeight: false,
    useContainers: false,
    useDeposits: false,
    useSubscriptions: false,
    useFrequency: false,
    customCustomerFields: [],
    defaultUnit: "unidad",
    suggestedProducts: [],
    closeFields: [],
    saleCalculatorTitle: "Nueva Venta",
    showVisitStatus: false,
  },
};

/**
 * Get default flags for a given business mode slug.
 * Falls back to a generic default if mode is unknown.
 */
export function getDefaultFlags(mode: string): BusinessModeFlags {
  return (
    BUSINESS_MODE_DEFAULTS[mode] ?? {
      useTara: false,
      useNetWeight: false,
      useContainers: false,
      useDeposits: false,
      useSubscriptions: false,
      useFrequency: false,
      customCustomerFields: [],
      defaultUnit: "unidad",
      suggestedProducts: [],
      closeFields: [],
      saleCalculatorTitle: "Nueva Venta",
      showVisitStatus: true,
    }
  );
}

/**
 * List of supported business mode slugs.
 */
export const SUPPORTED_BUSINESS_MODES = Object.keys(BUSINESS_MODE_DEFAULTS);
