import { useNavigate } from "react-router";
import { formatCurrency } from "~/lib/utils";
import { ShoppingCart, Search, Plus, TrendingUp } from "lucide-react";
import { useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SyncStatus } from "~/components/sync/sync-status";
import { useCreateDraftSale, useSales } from "~/hooks/use-sales";
import { useListSearch } from "~/hooks/use-list-search";
import { useBusiness } from "~/hooks/use-business";
import { SaleCard } from "~/components/sales/sale-card";
import { useSetLayout } from "~/components/layout/app-layout";
import { showError } from "~/lib/errors";

export default function SalesPage() {
  useSetLayout({ title: "Ventas", actions: <SyncStatus /> });

  const { data: allSales, isLoading, error } = useSales();
  const { data: business, isLoading: businessLoading } = useBusiness();
  const createDraftSale = useCreateDraftSale();
  const navigate = useNavigate();

  // Log any query errors for debugging
  useEffect(() => {
    if (error) {
      console.error("[SalesPage] Error loading sales:", error);
    }
  }, [error]);

  const handleCreateSale = async () => {
    console.log("[SalesPage] handleCreateSale called");
    console.log("[SalesPage] createDraftSale.isPending:", createDraftSale.isPending);
    console.log("[SalesPage] businessLoading:", businessLoading);
    console.log("[SalesPage] business:", business);
    console.log("[SalesPage] business?.businessUserId:", business?.businessUserId);

    // Prevent duplicate clicks while mutation is pending
    if (createDraftSale.isPending) {
      console.log("[SalesPage] Early return: isPending is true");
      return;
    }

    // Wait until business membership finishes loading to avoid a false disabled look
    if (businessLoading) {
      console.log("[SalesPage] Early return: businessLoading is true");
      return;
    }

    // Prevent if business is not ready
    if (!business?.businessUserId) {
      console.log("[SalesPage] Early return: no businessUserId");
      showError(
        "Error al crear venta",
        new Error("Business seller is not available")
      );
      return;
    }

    try {
      console.log("[SalesPage] Calling createDraftSale.mutateAsync...");
      const sale = await createDraftSale.mutateAsync();
      console.log("[SalesPage] Sale created successfully:", sale.id);
      navigate(`/ventas/${sale.id}/editar`);
    } catch (err) {
      console.error("[SalesPage] Failed to create sale:", err);
      showError("Error al crear venta", err);
    }
  };

  // Sort sales by saleDate descending (most recent first)
  const sortedByDate = useMemo(() => {
    if (!allSales) return [];
    return [...allSales].sort((a, b) => {
      const dateA = new Date(a.saleDate).getTime();
      const dateB = new Date(b.saleDate).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
  }, [allSales]);

  // Use centralized search hook with customer name support
  const { filteredItems: sortedSales, search, setSearch } = useListSearch({
    items: sortedByDate,
    searchFields: [
      (sale) => sale.id,
      (sale) => sale.customer?.name ?? undefined,
      (sale) => sale.saleType,
    ],
  });

  const stats = useMemo(() => {
    if (!allSales?.length) return null;
    const total = allSales.reduce((sum, sale) => {
      return sum + Number(sale.totalAmount || 0);
    }, 0);
    return { count: allSales.length, total: formatCurrency(total) };
  }, [allSales]);

  return (
    <>
      <div className="space-y-4">
        {stats && (
          <div className="shell-card-flat rounded-[24px] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Total de ventas</p>
                <p className="mt-1 whitespace-nowrap text-[clamp(1.7rem,6.8vw,2rem)] font-bold tracking-[-0.04em] text-foreground">
                  S/ {formatCurrency(stats.total)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Cantidad</p>
                  <p className="text-xl font-bold leading-none text-foreground">{stats.count}</p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-orange-100 text-orange-600">
                  <TrendingUp className="h-[18px] w-[18px]" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar venta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 rounded-[20px] border-stone-200/80 bg-white/75 pl-11 pr-4 shadow-[0_1px_6px_rgba(15,23,42,0.02)] placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-orange-200"
          />
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Cargando ventas...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">Error al cargar ventas</p>
          </div>
        )}

        {sortedSales?.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {search ? "No se encontraron ventas" : "No hay ventas registradas"}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {sortedSales?.map((sale) => (
            <SaleCard
              key={sale.id}
              sale={sale as unknown as { id: string; businessId: string; customerId: string | null; sellerId: string; type: "instant_sale" | "pre_order"; saleType: "contado" | "credito"; totalAmount: string; amountPaid: string; balanceDue: string; tara: string | null; netWeight: string | null; saleDate: Date; deliveryDate: Date | null; orderDate: Date | null; status: "draft" | "confirmed" | "active" | "delivered" | "cancelled"; version: number; confirmedSnapshot: Record<string, unknown> | null; deliveredSnapshot: Record<string, unknown> | null; allowCustomerEdit: boolean; syncStatus: "pending" | "synced" | "error"; syncAttempts: number; cancelledAt: Date | null; cancelledBy: string | null; cancelReason: string | null; refundAmount: string | null; refundDate: Date | null; refundMethod: "efectivo" | "yape" | "plin" | "transferencia" | "saldo" | null; refundReference: string | null; refundNotes: string | null; advancePaymentMethod: string | null; advanceReferenceNumber: string | null; advanceProofImageId: string | null; createdAt: Date; updatedAt: Date; }}
              onClick={() => navigate(`/ventas/${sale.id}`)}
            />
          ))}
        </div>
      </div>

      <Button
        size="icon"
        className="fixed right-4 bottom-28 z-50 h-14 w-14 rounded-full bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
        onClick={handleCreateSale}
        disabled={createDraftSale.isPending}
      >
        {createDraftSale.isPending ? (
          <ShoppingCart className="h-6 w-6 animate-spin" />
        ) : (
          <Plus className="h-6 w-6" />
        )}
      </Button>
    </>
  );
}
