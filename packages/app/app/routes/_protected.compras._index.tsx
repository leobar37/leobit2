import { Link } from "react-router";
import { Search, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePurchases } from "~/hooks/use-purchases";
import { useSetLayout } from "~/components/layout/app-layout";

function PurchaseCard({ purchase }: { purchase: {
  id: string;
  purchaseDate: string;
  totalAmount: string;
  status: "pending" | "received" | "cancelled";
  supplier?: { name: string };
} }) {
  const statusLabels = {
    pending: "Pendiente",
    received: "Recibido",
    cancelled: "Cancelado",
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    received: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <Card className="border-0 shadow-md rounded-2xl hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="h-6 w-6 text-orange-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{purchase.supplier?.name || "Sin proveedor"}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(purchase.purchaseDate).toLocaleDateString("es-PE")}
                </p>
              </div>
              <Badge variant="secondary" className={statusColors[purchase.status]}>
                {statusLabels[purchase.status]}
              </Badge>
            </div>

            <div className="mt-2">
              <span className="font-medium">
                S/ {parseFloat(purchase.totalAmount).toFixed(2)}
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

  const [search, setSearch] = useState("");
  const { data: purchases, isLoading, error } = usePurchases();

  const filteredPurchases = purchases?.filter((purchase) =>
    purchase.supplier?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar compra..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Cargando compras...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">Error al cargar compras</p>
          </div>
        )}

        {filteredPurchases?.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No se encontraron compras</p>
          </div>
        )}

        <div className="space-y-3">
          {filteredPurchases?.map((purchase) => (
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
        className="fixed bottom-20 right-4 z-50"
      >
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </>
  );
}
