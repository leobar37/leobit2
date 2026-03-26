import { Link, useNavigate } from "react-router";
import { Package, TrendingUp, AlertCircle, ShoppingBag, Settings, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InventoryCard } from "~/components/inventory/inventory-card";
import { ToolbarActions } from "~/components/layout/toolbar-actions";
import { useSetLayout } from "~/components/layout/app-layout";
import { useMiDistribucion, useCloseDistribucion } from "~/hooks/use-distribuciones";
import { useBusiness } from "~/hooks/use-business";
import { useSales } from "~/hooks/use-sales";
import { useCreateSale } from "~/hooks/use-sales";
import { getSaleEditorPath } from "~/lib/sales/navigation";
import { formatKilos, formatCurrency } from "~/lib/utils";
import { BusinessUserRole } from "@avileo/shared";
import { useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useSync } from "~/components/sync/sync-status";
import { createModal } from "~/lib/modal/create-modal";
import { Loader2 } from "lucide-react";

type MiDistribucionWithItems = {
  puntoVenta: string;
  modo: string;
  estado: string;
  closedAt?: string | null;
  items?: Array<{
    id: string;
    cantidadAsignada: number;
    cantidadVendida: number;
    unidad: string;
    variant?: {
      name?: string | null;
      product?: {
        name?: string | null;
      } | null;
    } | null;
  }>;
};

// Simple Confirmation Dialog for Cierre
interface CierreConfirmData {
  distribucionId: string;
}

function CierreConfirmContent({
  close,
  distribucionId,
}: { close: () => void } & CierreConfirmData) {
  const { isOnline } = useSync();
  const closeDistribucion = useCloseDistribucion();

  const handleClose = async () => {
    try {
      await closeDistribucion.mutateAsync({ id: distribucionId });
      toast.success("Distribución cerrada exitosamente");
      close();
    } catch (error) {
      console.error("Error closing distribucion:", error);
      toast.error("Error al cerrar la distribución");
    }
  };

  return (
    <>
      <div className="px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <Lock className="h-6 w-6 text-orange-500" />
          <h2 className="text-lg font-semibold">Cerrar Distribución</h2>
        </div>
        <p className="text-muted-foreground">
          ¿Estás seguro de que deseas cerrar esta distribución? Esta acción no se puede deshacer.
        </p>
        {!isOnline && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            Se requiere conexión a internet para cerrar.
          </p>
        )}
      </div>
      <div className="flex gap-3 p-4 border-t">
        <Button
          variant="outline"
          onClick={close}
          disabled={closeDistribucion.isPending}
          className="flex-1 h-12 rounded-xl"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleClose}
          disabled={closeDistribucion.isPending || !isOnline}
          className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600"
        >
          {closeDistribucion.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cerrando...
            </>
          ) : (
            "Confirmar Cierre"
          )}
        </Button>
      </div>
    </>
  );
}

const [CierreConfirmDialog, useCierreConfirmDialog] = createModal<CierreConfirmData>(
  CierreConfirmContent,
  { type: "drawer" }
);

export default function MiDistribucionPage() {
  const navigate = useNavigate();
  const { data: distribucion, isLoading, error } = useMiDistribucion();
  const { data: business } = useBusiness();
  const { isOnline } = useSync();
  const createSale = useCreateSale();
  const cierreConfirm = useCierreConfirmDialog();

  // Fetch sales for this distribution
  const { data: distribucionSales } = useSales(
    distribucion?.id ? { distribucionId: distribucion.id } : undefined
  );

  // Calculate metrics from sales
  const montoRecaudado = useMemo(() => {
    if (!distribucionSales || distribucionSales.length === 0) return 0;
    return distribucionSales
      .filter((sale) =>
        sale.status === "active" || sale.status === "confirmed" || sale.status === "delivered"
      )
      .reduce((sum, sale) => sum + parseFloat(sale.totalAmount || "0"), 0);
  }, [distribucionSales]);

  // Sales count
  const totalSalesCount = useMemo(() => {
    if (!distribucionSales) return 0;
    return distribucionSales.filter(
      (sale) => sale.status === "active" || sale.status === "confirmed" || sale.status === "delivered"
    ).length;
  }, [distribucionSales]);

  // Contado vs Credito breakdown
  const salesBreakdown = useMemo(() => {
    if (!distribucionSales) return { contado: 0, credito: 0, total: 0 };
    const validSales = distribucionSales.filter(
      (sale) => sale.status === "active" || sale.status === "confirmed" || sale.status === "delivered"
    );
    const contado = validSales
      .filter((s) => s.saleType === "contado")
      .reduce((sum, s) => sum + parseFloat(s.totalAmount || "0"), 0);
    const credito = validSales
      .filter((s) => s.saleType === "credito")
      .reduce((sum, s) => sum + parseFloat(s.totalAmount || "0"), 0);
    return { contado, credito, total: contado + credito };
  }, [distribucionSales]);

  const handleOpenCierreConfirm = useCallback(() => {
    if (!isOnline) {
      toast.error("Se requiere conexión a internet para cerrar la distribución");
      return;
    }
    if (!distribucion?.id) return;
    cierreConfirm.open({ distribucionId: distribucion.id });
  }, [isOnline, distribucion?.id, cierreConfirm]);

  const usarDistribucion = business?.usarDistribucion ?? true;
  const isAdmin = business?.role === BusinessUserRole.ADMIN_NEGOCIO;
  const isCerrado = distribucion?.estado === "cerrado";

  useSetLayout({
    title: "Mi Distribución",
    showBackButton: true,
    backHref: "/dashboard",
    actions: isCerrado ? (
      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
        Cerrado
      </span>
    ) : undefined,
  });

  const handleNewSale = async () => {
    if (!business?.id || !business.businessUserId || createSale.isPending) {
      return;
    }

    if (!distribucion?.id) {
      console.error("No distribucion available");
      return;
    }

    try {
      const sale = await createSale.mutateAsync({
        sale: {
          sellerId: business.businessUserId,
          customerId: undefined,
          distribucionId: distribucion.id,
          type: "instant_sale",
          saleType: "contado",
          totalAmount: 0,
        },
        items: [],
      });

      if (!sale?.id) {
        console.error("Could not get saleId from result!");
        return;
      }

      navigate(getSaleEditorPath(sale.id));
    } catch (error) {
      console.error("Failed to create draft sale:", error);
    }
  };

  if (!usarDistribucion) {
    return (
      <Card className="border border-gray-100 rounded-xl">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Modo Libre</h2>
          <p className="text-muted-foreground">
            Tu negocio no utiliza control de distribución. Puedes registrar ventas sin asignación de kilos.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center">Cargando...</div>
    );
  }

  if (error || !distribucion) {
    return (
      <Card className="border border-gray-100 rounded-xl">
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Sin Asignación</h2>
          <p className="text-muted-foreground mb-4">
            No tienes una distribución asignada para hoy.
          </p>
          {isAdmin ? (
            <Link to="/distribuciones">
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Settings className="mr-2 h-4 w-4" />
                Asignar Distribución
              </Button>
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              Contacta a tu administrador para que te asigne kilos.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const distribucionWithItems = distribucion as MiDistribucionWithItems;

  return (
    <>
      <div className="space-y-4 pb-24">
        <InventoryCard
          puntoVenta={distribucionWithItems.puntoVenta}
          modo={distribucionWithItems.modo as "estricto" | "acumulativo" | "libre"}
          estado={distribucionWithItems.estado as "activo" | "cerrado" | "en_ruta"}
          cantidadItems={distribucionWithItems.items?.length || 0}
        />

        {distribucionWithItems.modo === "libre" && (!distribucionWithItems.items || distribucionWithItems.items.length === 0) && (
          <Card className="border border-gray-100 rounded-xl">
            <CardContent className="p-6 text-center">
              <Package className="h-10 w-10 text-orange-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Distribución Libre</h3>
              <p className="text-sm text-muted-foreground">
                Los productos se registrarán al cerrar la distribución
              </p>
            </CardContent>
          </Card>
        )}

        {distribucionWithItems.items && distribucionWithItems.items.length > 0 && (
          <Card className="border border-gray-100 rounded-xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Productos Asignados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {distribucionWithItems.items.map((item) => {
                const cantidadDisponible = item.cantidadAsignada - item.cantidadVendida;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-orange-50 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.variant?.product?.name || "Producto"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.variant?.name || "Variante"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-orange-600">
                          {formatKilos(cantidadDisponible)} {item.unidad}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          de {formatKilos(item.cantidadAsignada)} {item.unidad}
                        </p>
                      </div>
                      {item.cantidadVendida > 0 && (
                        <Badge variant="secondary" className="bg-white text-xs">
                          {Math.round((item.cantidadVendida / item.cantidadAsignada) * 100)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Resumen del Día - Shows for both active and closed distributions */}
        <Card className="border border-gray-100 rounded-xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {isCerrado ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <TrendingUp className="h-4 w-4" />}
              {isCerrado ? "Resumen de Cierre" : "Resumen del Día"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sales count */}
            <div className="flex justify-between items-center p-4 bg-orange-50 rounded-xl">
              <span className="text-sm text-muted-foreground">Ventas</span>
              <span className="text-xl font-bold text-orange-600">{totalSalesCount}</span>
            </div>

            {/* Total amount */}
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl">
              <span className="text-sm text-muted-foreground">Total Recaudado</span>
              <span className="text-xl font-bold text-green-600">
                S/ {formatCurrency(salesBreakdown.total)}
              </span>
            </div>

            {/* Contado / Crédito breakdown - only show if there are sales */}
            {salesBreakdown.total > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded-xl text-center">
                  <p className="text-xs text-blue-600 mb-1">Contado</p>
                  <p className="font-bold text-blue-700">S/ {formatCurrency(salesBreakdown.contado)}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-center">
                  <p className="text-xs text-amber-600 mb-1">Crédito</p>
                  <p className="font-bold text-amber-700">S/ {formatCurrency(salesBreakdown.credito)}</p>
                </div>
              </div>
            )}

            {/* Closed date - only show if closed */}
            {isCerrado && distribucionWithItems.closedAt && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                Cerrado el {new Date(distribucionWithItems.closedAt).toLocaleDateString("es-PE", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {!isCerrado && (
        <ToolbarActions>
          <div className="space-y-2">
            <Button
              onClick={handleNewSale}
              disabled={createSale.isPending}
              className="h-14 w-full rounded-2xl bg-orange-500 hover:bg-orange-600"
            >
              <Package className="mr-2 h-5 w-5" />
              Nueva Venta
            </Button>

            <Button
              onClick={handleOpenCierreConfirm}
              disabled={!isOnline}
              variant="outline"
              className="h-14 w-full rounded-2xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Lock className="mr-2 h-5 w-5" />
              {!isOnline ? "Sin conexión" : "Cerrar Distribución"}
            </Button>
          </div>
        </ToolbarActions>
      )}

      {/* Cierre Confirmation Dialog */}
      <CierreConfirmDialog />
    </>
  );
}
