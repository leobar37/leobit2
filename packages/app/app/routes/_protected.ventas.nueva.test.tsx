import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewSalePage from "./_protected.ventas.nueva";

const { navigateMock, mutateAsyncMock } = vi.hoisted(() => {
  return {
    navigateMock: vi.fn(),
    mutateAsyncMock: vi.fn().mockResolvedValue({}),
  };
});

const product = {
  id: "p-1",
  name: "Pollo Entero",
  type: "pollo",
  unit: "kg",
  basePrice: "18.50",
  isActive: true,
  imageId: null,
  createdAt: new Date(),
} as const;

const variantA = {
  id: "v-1",
  productId: "p-1",
  name: "Entero",
  sku: "E-001",
  unitQuantity: "1",
  price: "18.50",
  sortOrder: 1,
  isActive: true,
  syncStatus: "synced",
  syncAttempts: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as const;

const variantB = {
  id: "v-2",
  productId: "p-1",
  name: "Pierna",
  sku: "P-001",
  unitQuantity: "1",
  price: "17.80",
  sortOrder: 2,
  isActive: true,
  syncStatus: "synced",
  syncAttempts: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as const;

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("~/hooks/use-sales", () => ({
  useCreateSale: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock("~/hooks/use-products-live", () => ({
  useProducts: () => ({
    data: [product],
    isLoading: false,
  }),
}));

vi.mock("~/hooks/use-product-variants", () => ({
  useVariantsByProduct: (productId: string) => ({
    data: productId === product.id ? [variantA, variantB] : [],
    isLoading: false,
  }),
}));

vi.mock("~/components/sales/customer-search", () => ({
  CustomerSearch: ({ onSelectCustomer }: { onSelectCustomer: (customer: { id: string; name: string }) => void }) => (
    <div data-testid="customer-search">
      <button
        type="button"
        onClick={() => onSelectCustomer({ id: "c-1", name: "Cliente Test" })}
      >
        Seleccionar cliente
      </button>
    </div>
  ),
}));

async function addCartItem() {
  fireEvent.click(screen.getByRole("button", { name: /^seleccionar producto$/i }));
  fireEvent.click(screen.getByText("Pollo Entero"));

  const dialog = await screen.findByRole("dialog");
  const addVariantButton = await within(dialog).findByRole("button", {
    name: /agregar al carrito/i,
  });
  fireEvent.click(addVariantButton);

  fireEvent.change(screen.getByPlaceholderText("0.000"), {
    target: { value: "2" },
  });

  fireEvent.click(screen.getByRole("button", { name: /^agregar al carrito$/i }));
}

describe("NewSalePage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    mutateAsyncMock.mockReset();
    mutateAsyncMock.mockResolvedValue({});
    localStorage.clear();
  });

  it("auto-selects first variant and completes quick-sale flow", async () => {
    render(
      <MemoryRouter>
        <NewSalePage />
      </MemoryRouter>,
    );

    await addCartItem();

    expect(screen.getByText(/Pollo Entero - Entero/i)).toBeTruthy();

    expect(screen.getByText(/Carrito \(1 items\)/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /completar venta/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    const payload = mutateAsyncMock.mock.calls[0][0] as {
      saleType: "contado" | "credito";
      amountPaid: number;
      totalAmount: number;
      items: Array<{ variantId: string; productId: string; quantity: number }>;
    };

    expect(payload.items[0].productId).toBe("p-1");
    expect(payload.items[0].variantId).toBe("v-1");
    expect(payload.items[0].quantity).toBeGreaterThan(0);
    expect(payload.saleType).toBe("contado");
    expect(payload.amountPaid).toBe(payload.totalAmount);
  });

  it("blocks credito sale without customer", async () => {
    render(
      <MemoryRouter>
        <NewSalePage />
      </MemoryRouter>,
    );

    await addCartItem();

    fireEvent.click(screen.getByRole("button", { name: /^a cuenta$/i }));
    fireEvent.change(screen.getByLabelText(/abono inicial/i), {
      target: { value: "10" },
    });

    fireEvent.click(screen.getByRole("button", { name: /completar venta/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).not.toHaveBeenCalled();
    });

    expect(screen.getByText(/selecciona un cliente para registrar venta a credito/i)).toBeTruthy();
  });

  it("submits credito a cuenta with selected customer", async () => {
    render(
      <MemoryRouter>
        <NewSalePage />
      </MemoryRouter>,
    );

    await addCartItem();

    fireEvent.click(screen.getByRole("button", { name: /seleccionar cliente/i }));
    fireEvent.click(screen.getByRole("button", { name: /^a cuenta$/i }));
    fireEvent.change(screen.getByLabelText(/abono inicial/i), {
      target: { value: "10" },
    });

    fireEvent.click(screen.getByRole("button", { name: /completar venta/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    const payload = mutateAsyncMock.mock.calls[0][0] as {
      clientId?: string;
      saleType: "contado" | "credito";
      amountPaid: number;
      totalAmount: number;
    };

    expect(payload.clientId).toBe("c-1");
    expect(payload.saleType).toBe("credito");
    expect(payload.amountPaid).toBe(10);
    expect(payload.totalAmount).toBeGreaterThan(payload.amountPaid);
  });

  it("submits credito sin pago when mode is debe", async () => {
    render(
      <MemoryRouter>
        <NewSalePage />
      </MemoryRouter>,
    );

    await addCartItem();

    fireEvent.click(screen.getByRole("button", { name: /seleccionar cliente/i }));
    fireEvent.click(screen.getByRole("button", { name: /^debe$/i }));
    fireEvent.click(screen.getByRole("button", { name: /completar venta/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    const payload = mutateAsyncMock.mock.calls[0][0] as {
      clientId?: string;
      saleType: "contado" | "credito";
      amountPaid: number;
    };

    expect(payload.clientId).toBe("c-1");
    expect(payload.saleType).toBe("credito");
    expect(payload.amountPaid).toBe(0);
  });
});
