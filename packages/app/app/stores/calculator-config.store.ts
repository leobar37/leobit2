import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CalculatorUnitType = "kg" | "unidad" | "paquete";
export type CalculatorField = "price" | "quantity" | "total";

export interface CalculatorConfig {
  unitType: CalculatorUnitType;
  autoCalculateField: CalculatorField;
}

interface CalculatorConfigState {
  configs: Record<CalculatorUnitType, CalculatorField>;
  getConfig: (unitType: CalculatorUnitType) => CalculatorField;
  setConfig: (unitType: CalculatorUnitType, field: CalculatorField) => void;
  resetToDefaults: () => void;
}

// Default configuration per unit type
const defaultConfigs: Record<CalculatorUnitType, CalculatorField> = {
  kg: "total",      // Price × Kilos = Total
  unidad: "total",  // Price × Units = Total
  paquete: "quantity", // Total ÷ Price = Packs
};

export const useCalculatorConfigStore = create<CalculatorConfigState>()(
  persist(
    (set, get) => ({
      configs: { ...defaultConfigs },

      getConfig: (unitType) => {
        return get().configs[unitType] ?? defaultConfigs[unitType];
      },

      setConfig: (unitType, field) => {
        set((state) => ({
          configs: {
            ...state.configs,
            [unitType]: field,
          },
        }));
      },

      resetToDefaults: () => {
        set({ configs: { ...defaultConfigs } });
      },
    }),
    {
      name: "avileo-calculator-config",
      partialize: (state) => ({ configs: state.configs }),
    }
  )
);

// Helper to get field labels per unit type
export function getFieldLabels(unitType: CalculatorUnitType): Record<CalculatorField, string> {
  switch (unitType) {
    case "kg":
      return {
        price: "Precio/kg",
        quantity: "Kilos",
        total: "Total",
      };
    case "unidad":
      return {
        price: "Precio/unidad",
        quantity: "Unidades",
        total: "Total",
      };
    case "paquete":
      return {
        price: "Precio/pack",
        quantity: "Packs",
        total: "Total",
      };
    default:
      return {
        price: "Precio",
        quantity: "Cantidad",
        total: "Total",
      };
  }
}

// Helper to determine unit type from product
export function getUnitTypeFromProduct(
  unit: string,
  hasPacks: boolean
): CalculatorUnitType {
  if (unit === "kg") return "kg";
  if (hasPacks) return "paquete";
  return "unidad";
}
