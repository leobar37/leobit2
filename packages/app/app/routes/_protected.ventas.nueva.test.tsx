import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

// Mock dependencies
vi.mock("~/hooks/use-products-live", () => ({
  useProducts: () => ({ data: [], isLoading: false }),
}));

vi.mock("~/hooks/use-product-variants", () => ({
  useVariantsByProduct: () => ({ data: [], isLoading: false }),
}));

vi.mock("~/hooks/use-chicken-calculator", () => ({
  useChickenCalculator: () => ({
    values: { totalAmount: "", pricePerKg: "", kilos: "", tara: "" },
    kgNeto: 0,
    handleReset: vi.fn(),
    handleChange: vi.fn(),
    persistSelection: vi.fn(),
  }),
  getPersistedCalculatorSelection: () => null,
}));

vi.mock("~/hooks/use-sales", () => ({
  useCreateSale: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("~/components/sales/customer-search", () => ({
  CustomerSearch: () => <div>Customer Search Mock</div>,
}));

vi.mock("~/components/sales/variant-selector", () => ({
  VariantSelector: () => null,
}));

import NewSalePage from "./_protected.ventas.nueva";

describe("NewSalePage", () => {
  it("renders with NewSaleProvider and shows all sections", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <NewSalePage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    // Verify main sections render
    expect(screen.getByText("Nueva Venta")).toBeDefined();
    expect(screen.getByText("Cliente")).toBeDefined();
    expect(screen.getByText("Tipo de Cobro")).toBeDefined();
    expect(screen.getByText("Calcular Producto")).toBeDefined();
  });

  it("shows payment mode buttons", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <NewSalePage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /pago total/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /a cuenta/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /debe/i })).toBeDefined();
  });
});
