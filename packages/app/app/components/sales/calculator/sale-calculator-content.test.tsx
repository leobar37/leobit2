import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalculatorContent } from "./sale-calculator-content";
import { useSaleCalculator } from "./sale-calculator-context";

vi.mock("~/components/business-mode", () => ({
  BusinessMode: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("./sale-calculator-context", () => ({
  useSaleCalculator: vi.fn(),
}));

const selectedProduct = {
  id: "product-1",
  name: "Pollo",
  unit: "kg",
};

const selectedVariant = {
  id: "variant-1",
  productId: "product-1",
  name: "Entero",
  price: "12.50",
  unitQuantity: "1",
};

function mockCalculatorContext(overrides: {
  hideTara?: boolean;
  hidePrices?: boolean;
  price?: string;
} = {}) {
  vi.mocked(useSaleCalculator).mockReturnValue({
    urlState: {
      search: "",
      setSearch: vi.fn(),
      filter: "all",
      setFilter: vi.fn(),
      productId: selectedProduct.id,
      variantId: selectedVariant.id,
    },
    picker: {
      selectedProduct,
      selectedVariant,
      activeProducts: [selectedProduct],
      isFetching: false,
      showProductDiscovery: false,
      categories: [],
      isLoading: false,
      filteredProducts: [selectedProduct],
      isProductInCart: vi.fn(() => false),
      selectProduct: vi.fn(),
      variants: [selectedVariant],
      isVariantsLoading: false,
      selectVariant: vi.fn(),
      isVariantsFetching: false,
    },
    calculator: {
      form: {},
      isValid: false,
      isKgProduct: true,
      values: {
        quantity: "",
        price: overrides.price ?? "",
        total: "",
        tara: "0",
      },
      toggleAutoCalculateField: vi.fn(),
      isFieldAutoCalculated: vi.fn(() => false),
      setFieldValue: vi.fn(),
      calculation: {
        kgNeto: 0,
        unitPrice: 0,
        quantity: 0,
        subtotal: 0,
        isValid: false,
      },
      handleClear: vi.fn(),
    },
    settings: {
      hideTara: overrides.hideTara ?? false,
      autoFillPrice: false,
      hidePrices: overrides.hidePrices ?? false,
    },
    editing: {
      item: null,
      isEditMode: false,
    },
  } as unknown as ReturnType<typeof useSaleCalculator>);
}

describe("CalculatorContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides the tara input when hideTara is enabled", () => {
    mockCalculatorContext({ hideTara: true });

    render(<CalculatorContent />);

    expect(screen.queryByLabelText("Tara (kg)")).toBeNull();
    expect(screen.getByLabelText("Kilos netos")).toBeTruthy();
  });

  it("hides base price helpers when hidePrices is enabled", () => {
    mockCalculatorContext({ hidePrices: true });

    render(<CalculatorContent />);

    expect(screen.queryByText("S/ 12.50")).toBeNull();
    expect(screen.queryByText("Precio base: S/ 12.50")).toBeNull();
    expect(screen.queryByRole("button", { name: "Usar" })).toBeNull();
    expect(
      screen.getByLabelText("Precio por kg (S/)").getAttribute("placeholder"),
    ).toBe("0.00");
  });

  it("renders an auto-filled variant price in the price input", () => {
    mockCalculatorContext({ price: "12.50" });

    render(<CalculatorContent />);

    expect(
      (screen.getByLabelText("Precio por kg (S/)") as HTMLInputElement).value,
    ).toBe("12.50");
    expect(screen.getByText("Precio base: S/ 12.50")).toBeTruthy();
  });
});
