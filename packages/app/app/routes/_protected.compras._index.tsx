import { Link } from "react-router";
import { formatCurrency } from "~/lib/utils";
import { Search, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePurchases } from "~/hooks/use-purchases";
import { useListSearch } from "~/hooks/use-list-search";
import { useSetLayout } from "~/components/layout/app-layout";

import type { Purchase } from "~/lib/services/purchase-service";

function PurchaseCard({ purchase }: { purchase: Purchase }) {
  const statusLabels: Record<Purchase["status"], string> = {
    draft: "Borrador",
    pending: "Pendiente",
    received: "Recibido",
    cancelled: "Cancelado",
  };

  const statusColors: Record<Purchase["status"], string> = {
    draft: "bg-gray-100 text-gray-700",
    pending: "bg-yellow-100 text-yellow-700",
    received: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const displayDate = purchase.purchase_date
    ? new Date(purchase.purchase_date).toLocaleDateString("es-PE")
    : "Sin fecha";

  return (
    <Card className="rounded-[24px] border border-stone-200/80 bg-white/80 shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition-colors hover:border-stone-300/90">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px] bg-orange-100/90 ring-1 ring-orange-100">
            <ShoppingCart className="h-6 w-6 text-orange-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">
                  {purchase.supplier_id ? "Proveedor seleccionado" : "Sin proveedor"}
                </h3>
                <p className="text-sm text-muted-foreground">{displayDate}</p>
              </div>
              <Badge variant="secondary" className={statusColors[purchase.status]}>
                {statusLabels[purchase.status]}
              </Badge>
            </div>

            <div className="mt-2">
              <span className="font-medium">
                S/ {formatCurrency(purchase.total_amount)}
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

  const { data: purchases, isLoading } = usePurchases();

  const { filteredItems, search, setSearch } = useListSearch({
    items: purchases,
    searchFields: [
      (purchase) => purchase.id,
      (purchase) => purchase.invoice_number ?? undefined,
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
            className="h-12 rounded-[20px] border-stone-200/80 bg-white/75 pl-11 pr-4 shadow-[0_1px_6px_rgba(15,23,42,0.02)] placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-orange-200"
          />
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Cargando compras...</p>
          </div>
        )}

        {filteredItems?.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No se encontraron compras</p>
          </div>
        )}

        <div className="space-y-3">
          {filteredItems?.map((purchase) => (
            <Link
              key={purchase.id}
              to={`/compras/${purchase.id}`}
              className="block"
            >
              <PurchaseCard purchase={purchase} />
            </Link>
          ))}
        </div>
      </div>

      <Link
        to="/compras/nueva"
        className="fixed bottom-28 right-4 z-50"
      >
        <Button
          size="icon"
          className="h-14 w-14 rounded-full bg-orange-500 shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </>
  );
}
