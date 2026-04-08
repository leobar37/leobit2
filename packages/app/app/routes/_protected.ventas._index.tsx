import { useNavigate } from "react-router";
import { ShoppingCart, Search, Plus, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { BackgroundSyncBadge } from "~/components/sync/background-sync-badge";
import { usePaginatedSales } from "~/hooks/use-sales";
import { useMiDistribucion } from "~/hooks/use-distribuciones";
import { useSaleFilters } from "~/hooks/use-sale-filters";
import { SaleCard } from "~/components/sales/sale-card";
import { useSetLayout } from "~/components/layout/app-layout";
import { CreateSaleTypeSheet } from "~/components/sales/create-sale-type-sheet";
import type { Sale as SaleCardData } from "~/lib/db/schemas/sale";

export default function SalesPage() {
  useSetLayout({ title: "Ventas", actions: <BackgroundSyncBadge /> });

  const { data: miDistribucion } = useMiDistribucion();
  const navigate = useNavigate();
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [page, setPage] = useState(1);

  const {
    tab,
    setTab,
    tipo,
    setTipo,
    search,
    setSearch,
    debouncedSearch,
    isFiltering,
  } = useSaleFilters({ miDistribucionId: miDistribucion?.id });

  const pageSize = 100;
  const offset = (page - 1) * pageSize;

  const distribucionId = tab === "mine"
    ? miDistribucion?.id
    : tab === "free"
      ? "none"
      : "all";

  const status = tab === "drafts" ? "draft" : undefined;
  const type = tipo === "ventas" ? "instant_sale" : tipo === "pedidos" ? "pre_order" : undefined;

  const { data: salesPage, isLoading, error } = usePaginatedSales({
    limit: pageSize,
    offset,
    distribucionId,
    status,
    type,
    search: debouncedSearch || undefined,
  });

  const sales = salesPage?.items ?? [];
  const totalSales = salesPage?.total ?? 0;

  // Reset to 'all' if on 'mine' tab but no distribution exists
  useEffect(() => {
    if (tab === "mine" && !miDistribucion?.id) {
      setTab("all");
    }
  }, [tab, miDistribucion?.id, setTab]);

  useEffect(() => {
    setPage(1);
  }, [tab, tipo, debouncedSearch]);

  // Log any query errors for debugging
  useEffect(() => {
    if (error) {
      console.error("[SalesPage] Error loading sales:", error);
    }
  }, [error]);

  return (
    <>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar venta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 rounded-[20px] border-stone-200/80 bg-white/75 pl-11 pr-4 shadow-[0_1px_6px_rgba(15,23,42,0.02)] placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-orange-200"
          />
        </div>

        {/* Filter Tabs */}
        <div className="-mx-3 overflow-x-auto px-3 pb-1 hide-scrollbar sm:-mx-4 sm:px-4">
          <div className="flex min-w-max gap-2">
            <button
              onClick={() => {
                setTab("all");
                setTipo("");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                tab === "all" && !tipo
                  ? "bg-orange-100 text-orange-700"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Todas
            </button>
            {miDistribucion?.id && (
              <button
                onClick={() => setTab("mine")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === "mine"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                Mi Dist.
              </button>
            )}
            <button
              onClick={() => setTab("free")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                tab === "free"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Libres
            </button>
            <button
              onClick={() => setTab("drafts")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                tab === "drafts"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Borradores
            </button>

            <div className="mx-0.5 h-5 w-px self-center bg-stone-200/80" />

            <button
              onClick={() => setTipo(tipo === "ventas" ? "" : "ventas")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                tipo === "ventas"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Ventas
            </button>
            <button
              onClick={() => setTipo(tipo === "pedidos" ? "" : "pedidos")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                tipo === "pedidos"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Pedidos
            </button>
          </div>
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

        {sales.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {search
                ? "No se encontraron ventas"
                : "No hay ventas registradas"}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {sales.map((sale) => (
            <SaleCard
              key={sale.id}
              sale={sale as unknown as SaleCardData}
              onClick={() => {
                // Draft sales and confirmed pre_orders go to editor
                // Others go to detail view
                const isDraft = sale.status === "draft";
                const isConfirmedPreOrder =
                  sale.type === "pre_order" && sale.status === "confirmed";
                if (isDraft || isConfirmedPreOrder) {
                  navigate(`/ventas/${sale.id}/editar`);
                } else {
                  navigate(`/ventas/${sale.id}`);
                }
              }}
            />
          ))}

          {totalSales > pageSize && (
            <PaginationControls
              page={page}
              pageSize={pageSize}
              totalItems={totalSales}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>

      <Button
        size="icon"
        className="fixed right-4 bottom-28 z-50 h-14 w-14 rounded-full bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
        onClick={() => setCreateSheetOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <CreateSaleTypeSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
      />
    </>
  );
}
