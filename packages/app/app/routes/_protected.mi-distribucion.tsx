import { Link, useNavigate } from "react-router";
import { Package, TrendingUp, AlertCircle, ShoppingBag, Settings, Lock, CheckCircle2, Receipt, Route, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InventoryCard } from "~/components/inventory/inventory-card";
import { ToolbarActions } from "~/components/layout/toolbar-actions";
import { useSetLayout } from "~/components/layout/app-layout";
import { useMiDistribucion, useCloseDistribucion } from "~/hooks/use-distribuciones";
import { useBusiness } from "~/hooks/use-business";
import { useSales } from "~/hooks/use-sales";
import { useExpenses } from "~/hooks/use-expenses";
import { useCreateSale } from "~/hooks/use-sales";
import { useCompleteWaterDelivery, useVisitas } from "~/hooks/use-visitas";
import { useAllVariants } from "~/hooks/use-all-variants";
import { getSaleEditorPath } from "~/lib/sales/navigation";
import { formatKilos, formatCurrency } from "~/lib/utils";
import { BusinessUserRole, decimalToNumber } from "@avileo/shared";
import { useMemo, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { createModal } from "~/lib/modal/create-modal";
import { Loader2 } from "lucide-react";
import type { DistribucionWithItems } from "~/hooks/use-distribuciones";

function useBrowserOnline() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

// Simple Confirmation Dialog for Cierre
interface CierreConfirmData {
  distribucionId: string;
}

function CierreConfirmContent({
  close,
  distribucionId,
}: { close: () => void } & CierreConfirmData) {
  const isOnline = useBrowserOnline();
  const closeDistribucion = useCloseDistribucion();
  const [notaCierre, setNotaCierre] = useState("");

  const handleClose = async () => {
    try {
      await closeDistribucion.mutateAsync({
        id: distribucionId,
        notaCierre: notaCierre.trim() || undefined,
      });
      toast.success("Distribución cerrada exitosamente");
      setNotaCierre("");
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
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-3 rounded-lg">
            Se requiere conexión a internet para cerrar.
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="nota-cierre-vendedor">Nota al cerrar</Label>
          <Textarea
            id="nota-cierre-vendedor"
            value={notaCierre}
            onChange={(event) => setNotaCierre(event.target.value)}
            placeholder="Observaciones finales de la distribución..."
            className="min-h-[120px] resize-none rounded-xl"
            disabled={closeDistribucion.isPending}
          />
        </div>
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

const paymentMethodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  saldo: "Saldo",
  sin_metodo: "Sin método",
};

const waterStopStatusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  entregado: "Entregado",
  no_atendido: "No atendió",
  reprogramado: "Reprogramado",
};

function formatWaterStopStatus(status?: string | null) {
  return waterStopStatusLabels[status ?? "pendiente"] ?? status ?? "Pendiente";
}

function WaterRouteSummary({
  routeName,
  estado,
  metrics,
  totalAmount,
}: {
  routeName: string;
  estado: string;
  metrics: {
    deliveredContainers: number;
    pendingStops: number;
    completedStops: number;
    totalStops: number;
  };
  totalAmount: number;
}) {
  const statusLabel = estado === "cerrado" ? "Cerrada" : estado === "en_ruta" ? "En ruta" : "Activa";

  return (
    <section className="border-b border-border/60 pb-4 dark:border-white/[0.07]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-sky-600 dark:text-sky-300">
            <Route className="h-4 w-4" />
            Ruta de hoy
          </div>
          <h2 className="mt-1 truncate text-xl font-semibold text-foreground">{routeName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Stock descontado desde el inventario del negocio.
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className={estado === "cerrado" ? "h-2 w-2 rounded-full bg-emerald-500" : "h-2 w-2 rounded-full bg-sky-500"} />
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Paradas</p>
          <p className="font-semibold text-foreground">
            {metrics.completedStops}/{metrics.totalStops}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Pendientes</p>
          <p className="font-semibold text-foreground">{metrics.pendingStops}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Bidones vendidos</p>
          <p className="font-semibold text-foreground">{metrics.deliveredContainers}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Recaudado</p>
          <p className="font-semibold text-foreground">S/ {formatCurrency(totalAmount)}</p>
        </div>
      </div>
    </section>
  );
}

export default function MiDistribucionPage() {
  const navigate = useNavigate();
  const { data: distribucion, isLoading, error } = useMiDistribucion();
  const { data: business } = useBusiness();
  const isOnline = useBrowserOnline();
  const createSale = useCreateSale();
  const completeWaterDelivery = useCompleteWaterDelivery();
  const cierreConfirm = useCierreConfirmDialog();
  const isWaterMode = business?.businessMode === "agua";
  const { data: waterVisits = [] } = useVisitas(isWaterMode ? distribucion?.id : undefined);
  const { data: allVariants = [], isLoading: isLoadingVariants, isError: hasVariantsError } = useAllVariants();
  const [waterCompletionDrafts, setWaterCompletionDrafts] = useState<Record<string, {
    delivered: number;
    collected: number;
    damaged: number;
    lost: number;
    notes: string;
    variantId: string;
    paymentMethod: "efectivo" | "yape" | "plin" | "transferencia" | "tarjeta";
  }>>({});

  // Fetch sales for this distribution
  const { data: distribucionSales } = useSales(
    distribucion?.id ? { distribucionId: distribucion.id } : undefined
  );

  // Fetch expenses for this distribution
  const { data: distribucionExpenses = [] } = useExpenses(
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

  const waterRouteMetrics = useMemo(() => {
    const stops = waterVisits.map((visit) => visit.waterStop).filter(Boolean);
    const deliveredContainers = stops.reduce(
      (sum, stop) => sum + (stop?.deliveredContainerQuantity ?? 0),
      0
    );
    const pendingStops = stops.filter((stop) => stop?.status === "pendiente").length;
    const completedStops = stops.length - pendingStops;
    const validSales = (distribucionSales ?? []).filter(
      (sale) => sale.status === "active" || sale.status === "confirmed" || sale.status === "delivered"
    );
    const byPaymentMethod = validSales.reduce<Record<string, number>>((acc, sale) => {
      const key = sale.paymentMethod ?? "sin_metodo";
      acc[key] = (acc[key] ?? 0) + parseFloat(sale.totalAmount || "0");
      return acc;
    }, {});

    return {
      deliveredContainers,
      pendingStops,
      completedStops,
      totalStops: stops.length,
      byPaymentMethod,
    };
  }, [waterVisits, distribucionSales]);

  // Expenses for this distribution
  const totalExpenses = useMemo(() => {
    return distribucionExpenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
  }, [distribucionExpenses]);

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
      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
        Cerrado
      </span>
    ) : undefined,
  });

  const handleNewSale = async () => {
    if (!isOnline) {
      toast.error("Se requiere conexión a internet para registrar una venta");
      return;
    }

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

  const handleWaterDraftChange = (
    visitId: string,
    patch: Partial<{ delivered: number; collected: number; damaged: number; lost: number; notes: string; variantId: string; paymentMethod: "efectivo" | "yape" | "plin" | "transferencia" | "tarjeta" }>
  ) => {
    const expected = waterVisits.find((visit) => visit.id === visitId)?.waterStop?.expectedContainerQuantity ?? 0;
    setWaterCompletionDrafts((drafts) => ({
      ...drafts,
      [visitId]: {
        delivered: drafts[visitId]?.delivered ?? expected,
        collected: drafts[visitId]?.collected ?? 0,
        damaged: drafts[visitId]?.damaged ?? 0,
        lost: drafts[visitId]?.lost ?? 0,
        notes: drafts[visitId]?.notes ?? "",
        variantId: drafts[visitId]?.variantId ?? "",
        paymentMethod: drafts[visitId]?.paymentMethod ?? "efectivo",
        ...patch,
      },
    }));
  };

  const handleCompleteWaterStop = async (
    visitId: string,
    status: "entregado" | "no_atendido" | "reprogramado",
    expected: number
  ) => {
    if (!isOnline) {
      toast.error("Se requiere conexión a internet para completar la entrega");
      return;
    }

    const draft = waterCompletionDrafts[visitId];
    if (status === "entregado" && !draft?.variantId) {
      toast.error("Selecciona un producto para registrar la venta");
      return;
    }
    await completeWaterDelivery.mutateAsync({
      id: visitId,
      status,
      delivered: status === "entregado" ? (draft?.delivered ?? expected) : 0,
      collected: 0,
      damaged: 0,
      lost: 0,
      notes: draft?.notes?.trim() || null,
      variantId: draft?.variantId,
      paymentMethod: draft?.paymentMethod,
    });
  };

  if (!usarDistribucion) {
    return (
      <Card className="border rounded-xl">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">
            {isWaterMode ? "Ruta no configurada" : "Modo Libre"}
          </h2>
          <p className="text-muted-foreground">
            {isWaterMode
              ? "Activa el control de rutas para organizar entregas y registrar bidones vendidos."
              : "Tu negocio no utiliza control de distribución. Puedes registrar ventas sin asignación de kilos."}
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
      <Card className="border rounded-xl">
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
              {isWaterMode
                ? "Contacta a tu administrador para que te asigne una ruta."
                : "Contacta a tu administrador para que te asigne kilos."}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const distribucionWithItems = distribucion as DistribucionWithItems;

  return (
    <>
      <div className="space-y-4 pb-52">
        {isWaterMode ? (
          <WaterRouteSummary
            routeName={distribucionWithItems.puntoVenta}
            estado={distribucionWithItems.estado}
            metrics={waterRouteMetrics}
            totalAmount={salesBreakdown.total}
          />
        ) : (
          <InventoryCard
            puntoVenta={distribucionWithItems.puntoVenta}
            modo={"libre" as const}
            estado={distribucionWithItems.estado as "activo" | "cerrado" | "en_ruta"}
            cantidadItems={distribucionWithItems.items?.length || 0}
          />
        )}

        {isWaterMode && (
          <Card className="border rounded-xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                Entregas de agua
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isOnline && (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  Estás sin conexión. Puedes revisar la ruta guardada, pero las entregas se registran al reconectarte.
                </p>
              )}
              {waterVisits.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay paradas en esta ruta.
                </p>
              ) : (
                waterVisits.map((visit) => {
                  const stop = visit.waterStop;
                  const expected = stop?.expectedContainerQuantity ?? 0;
                  const draft = waterCompletionDrafts[visit.id] ?? {
                    delivered: expected,
                    collected: 0,
                    damaged: 0,
                    lost: 0,
                    notes: "",
                    variantId: "",
                    paymentMethod: "efectivo" as const,
                  };
                  const completed = stop?.status && stop.status !== "pendiente";
                  const missingProduct = !draft.variantId;
                  return (
                    <div
                      key={visit.id}
                      data-testid="water-delivery-stop"
                      className="border-b border-border/60 py-4 last:border-b-0 dark:border-white/[0.07]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-semibold leading-5">{visit.customer?.name ?? "Cliente"}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {visit.customer?.address || "Sin dirección registrada"}
                          </p>
                        </div>
                        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <span className={completed ? "h-2 w-2 rounded-full bg-emerald-500" : "h-2 w-2 rounded-full bg-amber-500"} />
                          {formatWaterStopStatus(stop?.status)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <span className="text-muted-foreground">
                          Esperados: <strong className="font-semibold text-foreground">{expected}</strong>
                        </span>
                        <span className="text-muted-foreground">
                          Venta: <strong className="font-semibold text-foreground">Unidad</strong>
                        </span>
                      </div>

                      {!completed && (
                        <div className="mt-4 space-y-3">
                          <label className="space-y-1 text-xs text-muted-foreground">
                            Bidones entregados
                            <input
                              data-testid={`water-delivered-input-${visit.id}`}
                              type="number"
                              min={0}
                              value={draft.delivered}
                              onChange={(event) =>
                                handleWaterDraftChange(visit.id, {
                                  delivered: Math.max(0, Number(event.target.value) || 0),
                                })
                              }
                              className="shell-field h-11 w-full rounded-lg px-3 text-sm"
                            />
                          </label>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Producto</Label>
                            <Select
                              value={draft.variantId}
                              onValueChange={(value) => handleWaterDraftChange(visit.id, { variantId: value })}
                              disabled={isLoadingVariants || allVariants.length === 0}
                            >
                              <SelectTrigger data-testid={`water-product-select-${visit.id}`} className="h-11 rounded-lg text-sm">
                                <SelectValue placeholder={isLoadingVariants ? "Cargando productos..." : "Seleccionar producto..."} />
                              </SelectTrigger>
                              <SelectContent>
                                {allVariants.map((variant) => (
                                  <SelectItem key={variant.id} value={variant.id}>
                                    {variant.productName} — {variant.name} (S/ {variant.price})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {(hasVariantsError || (!isLoadingVariants && allVariants.length === 0)) && (
                              <div className="mt-2 border-l-2 border-amber-500 pl-3 text-xs text-muted-foreground">
                                <p className="font-medium text-foreground">No hay bidones configurados para vender.</p>
                                {isAdmin ? (
                                  <Link to="/productos" className="mt-1 inline-block text-sky-600 hover:underline dark:text-sky-300">
                                    Ir a productos
                                  </Link>
                                ) : (
                                  <p className="mt-1">Pide al administrador configurar el producto de agua.</p>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Método de pago</Label>
                            <Select
                              value={draft.paymentMethod}
                              onValueChange={(value) =>
                                handleWaterDraftChange(visit.id, {
                                  paymentMethod: value as "efectivo" | "yape" | "plin" | "transferencia" | "tarjeta",
                                })
                              }
                            >
                              <SelectTrigger data-testid={`water-payment-select-${visit.id}`} className="h-11 rounded-lg text-sm">
                                <SelectValue placeholder="Efectivo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="efectivo">Efectivo</SelectItem>
                                <SelectItem value="yape">Yape</SelectItem>
                                <SelectItem value="plin">Plin</SelectItem>
                                <SelectItem value="transferencia">Transferencia</SelectItem>
                                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Textarea
                            value={draft.notes}
                            onChange={(event) => handleWaterDraftChange(visit.id, { notes: event.target.value })}
                            placeholder="Nota de entrega..."
                            className="min-h-[76px] rounded-lg"
                          />
                          {missingProduct && (
                            <p className="text-xs text-muted-foreground">
                              Selecciona un producto para registrar la venta.
                            </p>
                          )}
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              data-testid={`water-delivery-complete-${visit.id}`}
                              type="button"
                              onClick={() => handleCompleteWaterStop(visit.id, "entregado", expected)}
                              disabled={completeWaterDelivery.isPending || !isOnline || !draft.variantId}
                              className="rounded-lg bg-sky-600 hover:bg-sky-700"
                            >
                              Entregado
                            </Button>
                            <Button
                              data-testid={`water-delivery-no-atendido-${visit.id}`}
                              type="button"
                              variant="outline"
                              onClick={() => handleCompleteWaterStop(visit.id, "no_atendido", expected)}
                              disabled={completeWaterDelivery.isPending || !isOnline}
                              className="rounded-lg"
                            >
                              No atendió
                            </Button>
                            <Button
                              data-testid={`water-delivery-reprogramar-${visit.id}`}
                              type="button"
                              variant="outline"
                              onClick={() => handleCompleteWaterStop(visit.id, "reprogramado", expected)}
                              disabled={completeWaterDelivery.isPending || !isOnline}
                              className="rounded-lg"
                            >
                              Reprogramar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}

        {!isWaterMode && (!distribucionWithItems.items || distribucionWithItems.items.length === 0) && (
          <Card className="border rounded-xl">
            <CardContent className="p-6 text-center">
              <Package className="h-10 w-10 text-orange-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Distribución Libre</h3>
              <p className="text-sm text-muted-foreground">
                Los productos se registrarán al cerrar la distribución
              </p>
            </CardContent>
          </Card>
        )}

        {!isWaterMode && distribucionWithItems.items && distribucionWithItems.items.length > 0 && (
          <Card className="border rounded-xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Productos Asignados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {distribucionWithItems.items.map((item) => {
                const asignada = decimalToNumber(item.cantidadAsignada);
                const vendida = decimalToNumber(item.cantidadVendida);
                const cantidadDisponible = asignada - vendida;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/40 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.productName || "Producto"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.variantName || "Variante"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                          {formatKilos(cantidadDisponible)} {item.unidad}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          de {formatKilos(asignada)} {item.unidad}
                        </p>
                      </div>
                      {vendida > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {Math.round((vendida / asignada) * 100)}%
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
        <Card className="border rounded-xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {isCerrado ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" /> : <TrendingUp className="h-4 w-4" />}
              {isCerrado ? "Resumen de Cierre" : "Resumen del Día"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sales count */}
            <div className="flex justify-between items-center p-4 bg-orange-50 dark:bg-orange-950/40 rounded-xl">
              <span className="text-sm text-muted-foreground">Ventas</span>
              <span className="text-xl font-bold text-orange-600 dark:text-orange-400">{totalSalesCount}</span>
            </div>

            {/* Total amount */}
            <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-950/40 rounded-xl">
              <span className="text-sm text-muted-foreground">Total Recaudado</span>
              <span className="text-xl font-bold text-green-600 dark:text-green-400">
                S/ {formatCurrency(salesBreakdown.total)}
              </span>
            </div>

            {/* Contado / Crédito breakdown - only show if there are sales */}
            {isWaterMode && salesBreakdown.total > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recaudación por método
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(waterRouteMetrics.byPaymentMethod).map(([method, amount]) => (
                    <div key={method} className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-center">
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                        {paymentMethodLabels[method] ?? method}
                      </p>
                      <p className="font-bold text-blue-700 dark:text-blue-300">S/ {formatCurrency(amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : salesBreakdown.total > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Contado</p>
                  <p className="font-bold text-blue-700 dark:text-blue-300">S/ {formatCurrency(salesBreakdown.contado)}</p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-center">
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Crédito</p>
                  <p className="font-bold text-amber-700 dark:text-amber-300">S/ {formatCurrency(salesBreakdown.credito)}</p>
                </div>
              </div>
            )}

            {isWaterMode && (
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-sky-50 p-3 text-center dark:bg-sky-950/40">
                  <p className="text-xs text-sky-600 dark:text-sky-400">Bidones</p>
                  <p className="text-lg font-bold text-sky-700 dark:text-sky-300">
                    {waterRouteMetrics.deliveredContainers}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-950/40">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Completadas</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                    {waterRouteMetrics.completedStops}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3 text-center dark:bg-amber-950/40">
                  <p className="text-xs text-amber-600 dark:text-amber-400">Pendientes</p>
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                    {waterRouteMetrics.pendingStops}
                  </p>
                </div>
              </div>
            )}

            {/* Expenses */}
            {distribucionExpenses.length > 0 && (
              <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-950/40 rounded-xl">
                <span className="text-sm text-muted-foreground">Gastos</span>
                <span className="text-xl font-bold text-red-600 dark:text-red-400">
                  S/ {formatCurrency(totalExpenses)}
                </span>
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
            {!isWaterMode && (
            <Button
              onClick={handleNewSale}
              disabled={createSale.isPending || !isOnline}
              className="h-14 w-full rounded-2xl bg-orange-500 hover:bg-orange-600"
            >
              <Package className="mr-2 h-5 w-5" />
              Nueva Venta
            </Button>
            )}

            <Button
              onClick={() => navigate(`/gastos/nuevo?distribucion=${distribucion?.id}`)}
              variant="outline"
              className="h-12 w-full rounded-lg border-border/70 text-muted-foreground hover:text-foreground"
            >
              <Receipt className="mr-2 h-5 w-5" />
              Registrar Gasto
            </Button>

            <Button
              onClick={handleOpenCierreConfirm}
              disabled={!isOnline}
              variant="outline"
              className="h-12 w-full rounded-lg border-border/70 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-950/30"
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
