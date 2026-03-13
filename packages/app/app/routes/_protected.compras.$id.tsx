import { useParams, useNavigate, Link } from "react-router";
import {
  ShoppingCart,
  Calendar,
  Receipt,
  FileText,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Package,
  ImageIcon,
} from "lucide-react";
import { useState } from "react";
import { formatCurrency, formatWeight } from "~/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  usePurchase,
  useUpdatePurchaseStatus,
  useDeletePurchase,
} from "~/hooks/use-purchases";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { useSetLayout } from "~/components/layout/app-layout";

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

const statusIcons = {
  pending: Calendar,
  received: CheckCircle2,
  cancelled: RotateCcw,
};

export default function PurchaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showImageModal, setShowImageModal] = useState(false);

  useSetLayout({
    title: "Detalle de Compra",
    showBackButton: true,
    backHref: "/compras",
  });

  const { data: purchaseData, isLoading } = usePurchase(id!);
  const purchaseRow = purchaseData?.[0];
  const purchase = purchaseRow?.purchase;
  const supplier = purchaseRow?.supplier;
  const updateStatus = useUpdatePurchaseStatus();
  const deletePurchase = useDeletePurchase();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const handleStatusChange = async (
    newStatus: "pending" | "received" | "cancelled"
  ) => {
    if (!id) return;

    const actionLabels = {
      pending: "marcar como pendiente",
      received: "marcar como recibida",
      cancelled: "cancelar",
    };

    const confirmed = await confirm({
      title: `Confirmar acción`,
      description: `¿Estás seguro de ${actionLabels[newStatus]} esta compra?`,
      confirmText: "Confirmar",
      cancelText: "Cancelar",
      variant: newStatus === "cancelled" ? "destructive" : "default",
    });

    if (confirmed) {
      await updateStatus.mutateAsync({ id, status: newStatus });
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    const confirmed = await confirm({
      title: "Eliminar compra",
      description:
        "¿Estás seguro de eliminar esta compra? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      await deletePurchase.mutateAsync(id);
      navigate("/compras");
    }
  };

  if (isLoading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <ShoppingCart className="h-5 w-5 animate-pulse" />
          <p>Cargando compra...</p>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            Compra no encontrada
          </p>
          <Link
            to="/compras"
            className="mt-4 text-orange-600 hover:text-orange-700 font-medium"
          >
            Volver a compras
          </Link>
        </div>
      </div>
    );
  }

  const StatusIcon = statusIcons[purchase.status];

  return (
    <div className="min-h-screen app-shell">
      <main className="px-3 py-4 sm:px-4 pb-32 space-y-4">
        <Card className="shell-card-flat overflow-hidden rounded-[30px]">
          <div className="border-b shell-divider bg-orange-50/80 p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] bg-orange-100/90 ring-1 ring-orange-100">
                <StatusIcon className="h-7 w-7 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="truncate text-lg font-bold text-foreground">
                  {purchase.supplier?.name || "Sin proveedor"}
                </h2>
                <Badge
                  className={`mt-2 ${statusColors[purchase.status]}`}
                >
                  {statusLabels[purchase.status]}
                </Badge>
              </div>
            </div>
          </div>

          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Fecha</span>
                </div>
                <p className="font-medium">
                  {new Date(purchase.purchaseDate).toLocaleDateString("es-PE")}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Receipt className="h-4 w-4" />
                  <span>Factura</span>
                </div>
                <p className="font-medium">
                  {purchase.invoiceNumber || "—"}
                </p>
              </div>
            </div>

            <div className="shell-block-muted flex items-center justify-between rounded-[20px] p-4">
              <span className="font-medium">Total:</span>
              <span className="text-xl font-bold text-orange-600">
                S/ {formatCurrency(purchase.totalAmount)}
              </span>
            </div>

            {purchase.notes && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Notas</span>
                </div>
                <p className="text-sm">{purchase.notes}</p>
              </div>
            )}

            {/* Receipt Image */}
            {purchase.receiptImage && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  <span>Comprobante</span>
                </div>
                <div
                  className="relative cursor-pointer group"
                  onClick={() => setShowImageModal(true)}
                >
                  <img
                    src={purchase.receiptImage.url}
                    alt="Comprobante de compra"
                    className="w-full h-32 object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium drop-shadow-lg">
                      Ver completo
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shell-card-flat overflow-hidden rounded-[30px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              Productos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {purchase.items?.map((item, index) => (
                <div
                  key={item.id}
                  className="shell-card-soft flex items-center justify-between rounded-[20px] p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {index + 1}. {item.product?.name || "Producto"}
                    </p>
                    {item.variant?.name && (
                      <p className="text-sm text-muted-foreground">
                        {item.variant.name}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formatWeight(item.quantity)} unidades × S/{" "}
                      {formatCurrency(item.unitCost)}
                    </p>
                  </div>
                  <span className="font-medium text-orange-600">
                    S/ {formatCurrency(item.totalCost)}
                  </span>
                </div>
              ))}

              {(!purchase.items || purchase.items.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  No hay productos en esta compra
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {purchase.status === "pending" && (
            <Button
              onClick={() => handleStatusChange("received")}
              className="w-full bg-green-500 hover:bg-green-600 rounded-xl"
              disabled={updateStatus.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Marcar como Recibido
            </Button>
          )}

          {purchase.status === "received" && (
            <Button
              onClick={() => handleStatusChange("cancelled")}
              variant="outline"
              className="w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50"
              disabled={updateStatus.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Cancelar Compra
            </Button>
          )}

          {purchase.status !== "received" && (
            <Button
              onClick={handleDelete}
              variant="ghost"
              className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
              disabled={deletePurchase.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Compra
            </Button>
          )}
        </div>
      </main>

      {/* Image Modal */}
      {showImageModal && purchase?.receiptImage?.url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl w-full">
            <img
              src={purchase.receiptImage.url}
              alt="Comprobante de compra"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
            <button
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2"
              onClick={() => setShowImageModal(false)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog />
    </div>
  );
}
