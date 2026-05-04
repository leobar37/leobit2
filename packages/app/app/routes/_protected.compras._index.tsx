import { Link, useNavigate } from "react-router";
import { formatCurrency } from "~/lib/utils";
import { ArrowRight, Plus, Receipt, Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePurchases } from "~/hooks/use-purchases";
import { useListSearch } from "~/hooks/use-list-search";
import { useSetLayout } from "~/components/layout/app-layout";
import { MobileShell } from "~/components/mobile";
import { useSuppliers } from "~/hooks/use-suppliers";

import type { Purchase } from "~/hooks/use-purchases";
import type { Supplier } from "~/hooks/use-suppliers";

function getPurchaseDisplayTotal(purchase: Purchase) {
  return parseFloat(purchase.totalAmount) || 0;
}

function PurchaseCard({
  purchase,
  supplier,
}: {
  purchase: Purchase;
  supplier: Supplier | null;
}) {
  const statusLabels: Record<Purchase["status"], string> = {
    pending: "Pendiente",
    received: "Recibido",
    cancelled: "Cancelado",
  };

  const statusColors: Record<Purchase["status"], string> = {
    pending: "bg-yellow-100 text-yellow-700",
    received: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const displayDate = purchase.purchaseDate
    ? new Date(purchase.purchaseDate).toLocaleDateString("es-PE")
    : "Sin fecha";

  return (
    <Card className="shell-card-flat rounded-[24px] border-0 bg-white/85 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-colors hover:bg-white/95 dark:bg-[#171922] dark:shadow-[0_18px_40px_rgba(0,0,0,0.32)] dark:hover:bg-[#1c1f29]">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px] bg-orange-100/90 ring-1 ring-orange-100 dark:bg-[#2a241c] dark:ring-0">
            <ShoppingCart className="h-6 w-6 text-orange-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground">
                  {supplier?.name || "Compra sin proveedor"}
                </h3>
                <p className="text-sm text-muted-foreground">{displayDate}</p>
              </div>
              <Badge
                variant="secondary"
                className={`${statusColors[purchase.status]} dark:border-0 dark:bg-white/10 dark:text-white`}
              >
                {statusLabels[purchase.status]}
              </Badge>
            </div>

            <div className="mt-2">
              <span className="font-medium text-foreground">
                S/ {formatCurrency(getPurchaseDisplayTotal(purchase))}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ComprasPage() {
  useSetLayout({ title: "Compras" });

  const navigate = useNavigate();
  const { data: purchases, isLoading } = usePurchases();
  const { data: suppliers = [] } = useSuppliers();

  const handleCreatePurchase = () => {
    navigate("/compras/nueva");
  };

  const { filteredItems, search, setSearch } = useListSearch({
    items: purchases,
    searchFields: [
      (purchase) => purchase.id,
      (purchase) => purchase.invoiceNumber ?? undefined,
      (purchase) => purchase.status,
    ],
  });

  return (
    <>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar compra..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="shell-search-field pl-11 pr-4"
          />
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Cargando compras...</p>
          </div>
        )}

        {filteredItems?.length === 0 && !isLoading && (
          <div className="shell-card-flat rounded-[28px] px-5 py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] bg-orange-100/90 ring-1 ring-orange-100">
              <Receipt className="h-7 w-7 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Todavía no hay compras</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Registra tu primera compra para llevar control de proveedor, productos y comprobantes.
            </p>
            <Button
              type="button"
              onClick={handleCreatePurchase}
              className="mt-5 h-11 rounded-xl bg-orange-500 px-5 font-semibold hover:bg-orange-600"
            >
              Nueva compra
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {filteredItems?.map((purchase) => (
            <Link
              key={purchase.id}
              to={`/compras/${purchase.id}`}
              className="block"
            >
              <PurchaseCard
                purchase={purchase}
                supplier={
                  purchase.supplierId
                    ? suppliers.find((supplier) => supplier.id === purchase.supplierId) || null
                    : null
                }
              />
            </Link>
          ))}
        </div>
      </div>

      <MobileShell.FloatingAction>
        <Button
          size="icon"
          className="h-14 w-14 rounded-full bg-orange-500 shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
          onClick={handleCreatePurchase}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </MobileShell.FloatingAction>
    </>
  );
}
