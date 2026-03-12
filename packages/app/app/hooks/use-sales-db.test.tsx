import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { saleCollection } from "../lib/db/collections/sale.collection";
import type { Sale } from "../lib/db/schemas/sale";
import { useCreateSale, useUpdateSale } from "./use-sales-db";

function createTransactionMock(promise: Promise<unknown>) {
  return {
    isPersisted: {
      promise,
    },
  };
}

function createWrapper() {
  const queryClient = new QueryClient();

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("use-sales-db", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("waits for the local insert before resolving the created sale id", async () => {
    let resolveInsert: (() => void) | null = null;
    const insertSpy = vi
      .spyOn(saleCollection, "insert")
      .mockImplementation(
        () =>
          createTransactionMock(
            new Promise<void>((resolve) => {
              resolveInsert = resolve;
            })
          ) as never
      );

    const { result } = renderHook(() => useCreateSale(), {
      wrapper: createWrapper(),
    });

    let mutationPromise!: Promise<string>;
    let resolvedSaleId: string | undefined;

    act(() => {
      mutationPromise = result.current.mutateAsync({
        businessId: "biz-1",
        sellerId: "seller-1",
        type: "instant_sale",
        saleType: "contado",
        totalAmount: 0,
        amountPaid: 0,
        items: [],
      });

      mutationPromise.then((saleId) => {
        resolvedSaleId = saleId;
      });
    });

    await Promise.resolve();

    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(resolvedSaleId).toBeUndefined();

    resolveInsert?.();
    const saleId = await mutationPromise;

    expect(typeof saleId).toBe("string");
    expect(resolvedSaleId).toBe(saleId);
  });

  it("retries a local update when the draft is not available yet", async () => {
    vi.useFakeTimers();

    const updateSpy = vi
      .spyOn(saleCollection, "update")
      .mockImplementationOnce(
        () =>
          createTransactionMock(
            Promise.reject(new Error("El registro no existe o fue eliminado."))
          ) as never
      )
      .mockImplementationOnce(
        () => createTransactionMock(Promise.resolve(undefined)) as never
      );

    const updateSale = useUpdateSale();
    const promise = updateSale("sale-1", {
      customerId: "customer-1",
    } as Partial<Sale>);

    await vi.advanceTimersByTimeAsync(120);
    await expect(promise).resolves.toBeUndefined();
    expect(updateSpy).toHaveBeenCalledTimes(2);
  });

  it("surfaces a clearer error when the local draft never becomes ready", async () => {
    vi.useFakeTimers();

    const updateSpy = vi
      .spyOn(saleCollection, "update")
      .mockImplementation(
        () =>
          createTransactionMock(
            Promise.reject(new Error("El registro no existe o fue eliminado."))
          ) as never
      );

    const updateSale = useUpdateSale();
    const promise = updateSale("sale-1", {
      customerId: "customer-1",
    } as Partial<Sale>);

    const assertion = expect(promise).rejects.toThrow(
      "La venta aún se está preparando localmente. Intenta de nuevo."
    );

    await vi.advanceTimersByTimeAsync(480);
    await assertion;
    expect(updateSpy).toHaveBeenCalledTimes(5);
  });
});
