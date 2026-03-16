import { Link } from "react-router";
import { Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityList } from "~/components/list";
import { PurchaseCard } from "~/components/compras/purchase-card";
import { usePurchases } from "~/hooks/use-purchases";
import { useSetLayout } from "~/components/layout/app-layout";

export default function ComprasPage() {
  useSetLayout({ title: "Compras" });

  const { data: purchases, isLoading, error } = usePurchases();

  return (
    <>
      <EntityList
        items={purchases}
        searchFields={[
          (purchase) => purchase.id,
          (purchase) => purchase.invoice_number ?? undefined,
          (purchase) => purchase.status,
        ]}
        renderItem={(purchase) => (
          <Link key={purchase.id} to={`/compras/${purchase.id}`} className="block">
            <PurchaseCard purchase={purchase} />
          </Link>
        )}
        searchPlaceholder="Buscar compra..."
        emptyIcon={ShoppingCart}
        emptyTitle="No se encontraron compras"
        emptyDescription="No hay compras registradas"
        isLoading={isLoading}
        loadingMessage="Cargando compras..."
        error={error}
        errorMessage="Error al cargar compras"
      />

      <Link to="/compras/nueva" className="fixed bottom-28 right-4 z-50">
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
