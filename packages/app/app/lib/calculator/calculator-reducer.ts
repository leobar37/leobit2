/**
 * Reducer para el estado de la calculadora de ventas
 * Maneja: selección de producto/variante, búsqueda, filtros, modo edición
 */
import { useReducer, useCallback } from "react";

export interface CalculatorState {
  // Selección
  selectedProductId: string | null;
  selectedVariantId: string | null;
  
  // Búsqueda y filtros
  productSearch: string;
  productFilter: string;
  
  // Modo edición
  isEditMode: boolean;
  editingItemId: string | null;
}

export type CalculatorAction =
  | { type: "SELECT_PRODUCT"; productId: string }
  | { type: "SELECT_VARIANT"; variantId: string }
  | { type: "SET_SEARCH"; search: string }
  | { type: "SET_FILTER"; filter: string }
  | { type: "START_EDIT"; itemId: string; productId: string; variantId: string }
  | { type: "CLEAR_EDIT" }
  | { type: "CLEAR_SELECTION" }
  | { type: "RESET" };

export const initialCalculatorState: CalculatorState = {
  selectedProductId: null,
  selectedVariantId: null,
  productSearch: "",
  productFilter: "all",
  isEditMode: false,
  editingItemId: null,
};

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction
): CalculatorState {
  switch (action.type) {
    case "SELECT_PRODUCT":
      return {
        ...state,
        selectedProductId: action.productId,
        selectedVariantId: null,
        isEditMode: false,
        editingItemId: null,
      };

    case "SELECT_VARIANT":
      return {
        ...state,
        selectedVariantId: action.variantId,
      };

    case "SET_SEARCH":
      return {
        ...state,
        productSearch: action.search,
      };

    case "SET_FILTER":
      return {
        ...state,
        productFilter: action.filter,
      };

    case "START_EDIT":
      return {
        ...state,
        isEditMode: true,
        editingItemId: action.itemId,
        selectedProductId: action.productId,
        selectedVariantId: action.variantId,
      };

    case "CLEAR_EDIT":
      return {
        ...state,
        isEditMode: false,
        editingItemId: null,
      };

    case "CLEAR_SELECTION":
      return {
        ...state,
        selectedProductId: null,
        selectedVariantId: null,
        isEditMode: false,
        editingItemId: null,
      };

    case "RESET":
      return initialCalculatorState;

    default:
      return state;
  }
}

export function useCalculatorState(initialState?: Partial<CalculatorState>) {
  const [state, dispatch] = useReducer(calculatorReducer, {
    ...initialCalculatorState,
    ...initialState,
  });

  const selectProduct = useCallback(
    (productId: string) => dispatch({ type: "SELECT_PRODUCT", productId }),
    []
  );

  const selectVariant = useCallback(
    (variantId: string) => dispatch({ type: "SELECT_VARIANT", variantId }),
    []
  );

  const setSearch = useCallback(
    (search: string) => dispatch({ type: "SET_SEARCH", search }),
    []
  );

  const setFilter = useCallback(
    (filter: string) => dispatch({ type: "SET_FILTER", filter }),
    []
  );

  const startEdit = useCallback(
    (itemId: string, productId: string, variantId: string) =>
      dispatch({ type: "START_EDIT", itemId, productId, variantId }),
    []
  );

  const clearEdit = useCallback(
    () => dispatch({ type: "CLEAR_EDIT" }),
    []
  );

  const clearSelection = useCallback(
    () => dispatch({ type: "CLEAR_SELECTION" }),
    []
  );

  return {
    state,
    dispatch,
    actions: {
      selectProduct,
      selectVariant,
      setSearch,
      setFilter,
      startEdit,
      clearEdit,
      clearSelection,
    },
  };
}
