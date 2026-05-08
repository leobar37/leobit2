import { useLocation, useNavigate } from "react-router";
import { ShoppingCart, Search, Plus, MapPin, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePaginatedSales } from "~/hooks/use-sales";
import { useMiDistribucion } from "~/hooks/use-distribuciones";
import { useSaleFilters } from "~/hooks/use-sale-filters";
import { SaleCard } from "~/components/sales/sale-card";
import { SaleFilterSection } from "~/components/sales/sale-filter-section";
import { useSetLayout } from "~/components/layout/app-layout";
import { MobileShell } from "~/components/mobile";
import { CreateSaleTypeSheet } from "~/components/sales/create-sale-type-sheet";
import { formatDisplayDate } from "~/lib/date-utils";
import {
  getSaleDetailPathWithReturn,
  getSaleEditorPathWithReturn,
} from "~/lib/sales/navigation";
import type { Sale as SaleCardData } from "~/hooks/use-sales";

export default function SalesPage() {
  useSetLayout({ title: "Ventas" });

  const { data: miDistribucion } = useMiDistribucion();
  const isDistribucionActiva = miDistribucion?.estado === "activo";
  const navigate = useNavigate();
  const location = useLocation();
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
    saleType,
    setSaleType,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    hasBalanceDue,
    setHasBalanceDue,
    clearAdvancedFilters,
    activeFilterCount,
  } = useSaleFilters({ miDistribucionId: miDistribucion?.id });

  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const distribucionId = tab === "mine"
    ? (isDistribucionActiva ? miDistribucion?.id : undefined)
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
    saleType: saleType || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    hasBalanceDue: hasBalanceDue || undefined,
  });

  const sales = salesPage?.items ?? [];
  const totalSales = salesPage?.total ?? 0;

  // Reset to 'all' if on 'mine' tab but no active distribution exists
  useEffect(() => {
    if (tab === "mine" && !isDistribucionActiva) {
      setTab("all");
    }
  }, [tab, isDistribucionActiva, setTab]);

  useEffect(() => {
    setPage(1);
  }, [tab, tipo, debouncedSearch, saleType, startDate, endDate, hasBalanceDue]);



  return (
    <>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar venta, cliente o producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="shell-search-field pl-11 pr-4"
          />
        </div>

        <SaleFilterSection
          saleType={saleType}
          onSaleTypeChange={setSaleType}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          hasBalanceDue={hasBalanceDue}
          onHasBalanceDueChange={setHasBalanceDue}
          activeFilterCount={activeFilterCount}
          onClearAll={clearAdvancedFilters}
        />

        {activeFilterCount > 0 && (
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-0.5 hide-scrollbar sm:-mx-4 sm:px-4">
            {startDate && (
              <button
                type="button"
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-200/60 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20"
              >
                {formatDisplayDate(startDate)}
                {endDate && endDate !== startDate && ` - ${formatDisplayDate(endDate)}`}
                <X className="h-3 w-3" />
              </button>
            )}
            {saleType && (
              <button
                type="button"
                onClick={() => setSaleType("")}
                className="flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-200/60 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20"
              >
                {saleType === "contado" ? "Contado" : "Crédito"}
                <X className="h-3 w-3" />
              </button>
            )}
            {hasBalanceDue && (
              <button
                type="button"
                onClick={() => setHasBalanceDue(false)}
                className="flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-200/60 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20"
              >
                Con deuda
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="-mx-3 overflow-x-auto px-3 pb-1 hide-scrollbar sm:-mx-4 sm:px-4">
          <div className="flex min-w-max gap-2">
            <button
              onClick={() => {
                setTab("all");
                setTipo("");
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ring-1 ring-transparent",
                tab === "all" && !tipo
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-500/[0.15] dark:text-orange-300 dark:ring-orange-400/[0.20]"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-white/[0.08] dark:text-muted-foreground dark:hover:bg-white/[0.12] dark:hover:text-foreground dark:ring-white/[0.06]"
              )}
            >
              Todas
            </button>
            {isDistribucionActiva && (
              <button
                onClick={() => setTab("mine")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ring-1 ring-transparent",
                  tab === "mine"
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-500/[0.15] dark:text-orange-300 dark:ring-orange-400/[0.20]"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-white/[0.08] dark:text-muted-foreground dark:hover:bg-white/[0.12] dark:hover:text-foreground dark:ring-white/[0.06]"
                )}
              >
                <MapPin className="h-3.5 w-3.5" />
                Mi Dist.
              </button>
            )}
            <button
              onClick={() => setTab("free")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ring-1 ring-transparent",
                tab === "free"
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-500/[0.15] dark:text-orange-300 dark:ring-orange-400/[0.20]"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-white/[0.08] dark:text-muted-foreground dark:hover:bg-white/[0.12] dark:hover:text-foreground dark:ring-white/[0.06]"
              )}
            >
              Libres
            </button>
            <button
              onClick={() => setTab("drafts")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ring-1 ring-transparent",
                tab === "drafts"
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-500/[0.15] dark:text-orange-300 dark:ring-orange-400/[0.20]"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-white/[0.08] dark:text-muted-foreground dark:hover:bg-white/[0.12] dark:hover:text-foreground dark:ring-white/[0.06]"
              )}
            >
              Borradores
            </button>

            <div className="mx-0.5 h-5 w-px self-center bg-stone-200/80 dark:bg-white/[0.10]" />

            <button
              onClick={() => setTipo(tipo === "ventas" ? "" : "ventas")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ring-1 ring-transparent",
                tipo === "ventas"
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-500/[0.15] dark:text-orange-300 dark:ring-orange-400/[0.20]"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-white/[0.08] dark:text-muted-foreground dark:hover:bg-white/[0.12] dark:hover:text-foreground dark:ring-white/[0.06]"
              )}
            >
              Ventas
            </button>
            <button
              onClick={() => setTipo(tipo === "pedidos" ? "" : "pedidos")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ring-1 ring-transparent",
                tipo === "pedidos"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/[0.15] dark:text-indigo-300 dark:ring-indigo-400/[0.20]"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-white/[0.08] dark:text-muted-foreground dark:hover:bg-white/[0.12] dark:hover:text-foreground dark:ring-white/[0.06]"
              )}
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
            <p className="text-red-500 dark:text-red-300">Error al cargar ventas</p>
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
                const isDraft = sale.status === "draft";
                const isConfirmedPreOrder =
                  sale.type === "pre_order" && sale.status === "confirmed";
                if (isDraft || isConfirmedPreOrder) {
                  navigate(getSaleEditorPathWithReturn(sale.id, location));
                } else {
                  navigate(getSaleDetailPathWithReturn(sale.id, location));
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

      <MobileShell.FloatingAction>
        <Button
          size="icon"
          aria-label="Nueva venta"
          className="h-14 w-14 rounded-full bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
          onClick={() => setCreateSheetOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </MobileShell.FloatingAction>

      <CreateSaleTypeSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
      />
    </>
  );
}
