import { useParams, useNavigate } from "react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ShoppingCart,
  Calendar,
  User,
  DollarSign,
  Scale,
  Loader2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useSale, useCancelSale } from "~/hooks/use-sales";
import type { CancelSaleInput } from "~/hooks/use-sales";
import { useCustomers } from "~/hooks/use-customers-live";
import { useProducts } from "~/hooks/use-products-live";
import { useBusinessSettings } from "~/hooks/use-business-settings";
import { useBusiness } from "~/hooks/use-business";
import { Package } from "lucide-react";
import { formatCurrency, formatKilos } from "~/lib/utils";
import { BusinessUserRole } from "@avileo/shared";

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sale, isLoading, error } = useSale(id || "");
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();
  const { settings } = useBusinessSettings();
  const { data: business } = useBusiness();
  const cancelSale = useCancelSale();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [hasRefund, setHasRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState<"efectivo" | "yape" | "plin" | "transferencia" | "saldo">("efectivo");
  const [refundReference, setRefundReference] = useState("");

  const isAdmin = business?.role === BusinessUserRole.ADMIN_NEGOCIO;
  const isCancelled = sale?.status === "cancelled";
  const canCancel = isAdmin && !isCancelled && sale;

  const customer = customers?.find((c) => c.id === sale?.clientId);
  const paidAmount = Number(sale?.amountPaid ?? 0);
  const dueAmount = Number(sale?.balanceDue ?? 0);
  const hideTara = settings?.calculators?.sales?.hideTara ?? true;
  const saleStatus = sale
    ? sale.saleType === "contado"
      ? "Pago total"
      : paidAmount <= 0
        ? "Debe todo"
        : dueAmount > 0
          ? "A cuenta"
          : "Sin deuda"
    : "";
  const formattedDate = sale
    ? new Date(sale.saleDate).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const handleCancel = async () => {
    if (!id || !cancelReason) return;

    const cancelData: CancelSaleInput = {
      reason: cancelReason,
    };

    if (hasRefund && paidAmount > 0) {
      const refund = parseFloat(refundAmount) || paidAmount;
      cancelData.refundAmount = refund;
      cancelData.refundMethod = refundMethod;
      if (refundReference) {
        cancelData.refundReference = refundReference;
      }
    }

    try {
      await cancelSale.mutateAsync({ id, ...cancelData });
      setShowCancelModal(false);
      setCancelReason("");
      setHasRefund(false);
      setRefundAmount("");
      setRefundMethod("efectivo");
      setRefundReference("");
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const openCancelModal = () => {
    setRefundAmount(paidAmount.toString());
    setShowCancelModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto mt-20 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Venta no encontrada</h2>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "La venta que buscas no existe"}
          </p>
          <Button onClick={() => navigate("/ventas")}>Volver a ventas</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-4 gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ventas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg flex-1">Detalle de Venta</h1>
          {canCancel && (
            <Button variant="destructive" size="sm" onClick={openCancelModal}>
              <XCircle className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          )}
        </div>
      </header>

      <main className="p-4 pb-24 space-y-4">
        {isCancelled && (
          <Card className="border-red-200 bg-red-50 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-700">Venta Cancelada</p>
                  <p className="text-sm text-red-600">
                    Cancelada el {sale.cancelledAt ? new Date(sale.cancelledAt).toLocaleDateString("es-PE") : ""}
                    {sale.cancelReason && ` - ${sale.cancelReason}`}
                  </p>
                  {sale.refundAmount && Number(sale.refundAmount) > 0 && (
                    <p className="text-sm font-medium text-red-600 mt-1">
                      Reembolso: S/ {formatCurrency(sale.refundAmount)}
                      {sale.refundMethod && ` vía ${sale.refundMethod}`}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center">
                <ShoppingCart className="h-7 w-7 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground text-sm">Venta #{sale.id.slice(-6)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={sale.saleType === "contado" ? "default" : "secondary"}
                    className={
                      sale.saleType === "contado"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }
                  >
                    {saleStatus}
                  </Badge>
                  {sale.saleType === "credito" && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      Credito
                    </Badge>
                  )}
                  <Badge
                    variant={sale.syncStatus === "synced" ? "default" : "outline"}
                  >
                    {sale.syncStatus === "synced" ? "Sincronizado" : "Pendiente"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información General</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formattedDate}</span>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{customer?.name || "Cliente general"}</span>
            </div>

            {sale.tara && !hideTara && (
              <div className="flex items-center gap-3">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <span>Tara: {formatCurrency(sale.tara)} kg</span>
              </div>
            )}

            {sale.netWeight && (
              <div className="flex items-center gap-3">
                <Scale className="h-4 w-4 text-orange-600" />
                <span className="font-medium">Neto: {formatCurrency(sale.netWeight)} kg</span>
              </div>
            )}
          </CardContent>
        </Card>

        {sale.items && sale.items.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Productos Vendidos</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {sale.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between py-3 border-b last:border-0 first:pt-0"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {item.productName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.quantity)} x S/{" "}
                        {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-foreground ml-4">
                    S/ {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-muted-foreground">
                  {sale.items.length} producto
                  {sale.items.length > 1 ? "s" : ""}
                </span>
                <span className="font-semibold text-lg">
                  S/ {formatCurrency(sale.totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumen de Pago</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold text-lg">
                S/ {formatCurrency(sale.totalAmount)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Abono inicial</span>
              <span>S/ {formatCurrency(paidAmount)}</span>
            </div>

            {dueAmount > 0 && (
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-red-600 font-medium">Pendiente</span>
                <span className="text-red-600 font-semibold">
                  S/ {formatCurrency(dueAmount)}
                </span>
              </div>
            )}

            {dueAmount === 0 && (
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-green-600 font-medium">Estado</span>
                <Badge className="bg-green-100 text-green-700">Sin deuda</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar venta #{sale.id.slice(-6)}</DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer. El saldo del cliente se ajustará automáticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="reason">Motivo de cancelación *</Label>
                <Input
                  id="reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ej: Error en el monto, cliente canceló..."
                />
              </div>

              {paidAmount > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasRefund"
                      checked={hasRefund}
                      onChange={(e) => setHasRefund(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="hasRefund" className="font-medium">
                      La venta tiene pagos - registrar reembolso o saldo
                    </Label>
                  </div>

                  {hasRefund && (
                    <>
                      <div>
                        <Label htmlFor="refundAmount">Monto del reembolso</Label>
                        <Input
                          id="refundAmount"
                          type="number"
                          step="0.01"
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          max={paidAmount}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Máximo: S/ {formatCurrency(paidAmount)}
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="refundMethod">Método de reembolso</Label>
                        <div className="flex gap-2 mt-2">
                          {(["efectivo", "yape", "plin", "transferencia", "saldo"] as const).map((method) => (
                            <Button
                              key={method}
                              variant={refundMethod === method ? "default" : "outline"}
                              size="sm"
                              onClick={() => setRefundMethod(method)}
                              className="flex-1"
                            >
                              {method === "efectivo" ? "Efectivo" : 
                               method === "yape" ? "Yape" : 
                               method === "plin" ? "Plin" : 
                               method === "transferencia" ? "Transferencia" : "Saldo"}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {(refundMethod === "yape" || refundMethod === "plin") && (
                        <div>
                          <Label htmlFor="refundReference">Número de operación</Label>
                          <Input
                            id="refundReference"
                            value={refundReference}
                            onChange={(e) => setRefundReference(e.target.value)}
                            placeholder="Ej: 123456789"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelModal(false)}>
                Cerrar
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={!cancelReason || cancelSale.isPending}
              >
                {cancelSale.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar cancelación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
