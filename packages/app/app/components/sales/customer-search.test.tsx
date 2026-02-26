import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Customer } from "../../lib/db/schema";

import { CustomerSearch } from "./customer-search";

const now = new Date("2026-02-26T00:00:00.000Z");

function buildCustomer(partial: Partial<Customer> & Pick<Customer, "id" | "name">): Customer {
  return {
    id: partial.id,
    name: partial.name,
    dni: partial.dni ?? null,
    phone: partial.phone ?? null,
    address: partial.address ?? null,
    notes: partial.notes ?? null,
    businessId: partial.businessId ?? "biz-1",
    syncStatus: partial.syncStatus ?? "synced",
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

const juan = buildCustomer({ id: "c-1", name: "Juan Perez", dni: "11111111", phone: "999111222" });
const maria = buildCustomer({ id: "c-2", name: "Maria Lopez", dni: "22222222", phone: "999333444" });

describe("CustomerSearch", () => {
  const renderCustomerSearch = (selectedCustomer: Customer | null, onSelectCustomer = vi.fn()) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnMount: false,
        },
      },
    });

    queryClient.setQueryData(["customers"], [juan, maria]);

    render(
      <QueryClientProvider client={queryClient}>
        <CustomerSearch selectedCustomer={selectedCustomer} onSelectCustomer={onSelectCustomer} />
      </QueryClientProvider>
    );

    return { onSelectCustomer };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens drawer and selects a customer from browse list", async () => {
    const { onSelectCustomer } = renderCustomerSearch(null);

    fireEvent.click(screen.getByRole("button", { name: /seleccionar cliente/i }));

    const mariaOption = await screen.findByRole("button", { name: /maria lopez/i });
    fireEvent.click(mariaOption);

    expect(onSelectCustomer).toHaveBeenCalledWith(maria);
  });

  it("filters customers by search input", async () => {
    renderCustomerSearch(null);

    fireEvent.click(screen.getByRole("button", { name: /seleccionar cliente/i }));

    const searchInput = await screen.findByLabelText("Buscar clientes");
    fireEvent.change(searchInput, { target: { value: "maria" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /maria lopez/i })).toBeDefined();
      expect(screen.queryByRole("button", { name: /juan perez/i })).toBeNull();
    });
  });

  it("allows changing customer when one is already selected", async () => {
    const { onSelectCustomer } = renderCustomerSearch(juan);

    fireEvent.click(screen.getByRole("button", { name: /cambiar/i }));

    const mariaOption = await screen.findByRole("button", { name: /maria lopez/i });
    fireEvent.click(mariaOption);

    expect(onSelectCustomer).toHaveBeenCalledWith(maria);
  });

  it("clears selected customer with accessible button", () => {
    const { onSelectCustomer } = renderCustomerSearch(juan);

    fireEvent.click(screen.getByRole("button", { name: /limpiar cliente seleccionado/i }));

    expect(onSelectCustomer).toHaveBeenCalledWith(null);
  });
});
