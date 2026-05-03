import { useParams, useSearchParams } from "react-router";
import { useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  useAddItemToPublicSale,
  useCancelPublicSale,
  useConfirmPublicSale,
  useDeletePublicSaleItem,
  usePublicSalePage,
  useUpdatePublicSaleItem,
  type PublicCatalogProduct,
  type PublicCatalogVariant,
  type PublicSaleItem,
} from "~/hooks/use-public-sale";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { cn, formatCurrency } from "~/lib/utils";

const statusConfig = {
  draft: {
    label: "Borrador",
    description: "Puedes modificar tu pedido",
    className: "bg-amber-100 text-amber-800",
    icon: ClipboardList,
  },
  confirmed: {
    label: "Confirmado",
    description: "Tu pedido fue enviado al negocio",
    className: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle2,
  },
  active: {
    label: "Activo",
    description: "Tu pedido ya está activo",
    className: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle2,
  },
  delivered: {
    label: "Entregado",
    description: "Tu pedido fue entregado",
    className: "bg-blue-100 text-blue-800",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelado",
    description: "Este pedido fue cancelado",
    className: "bg-red-100 text-red-800",
    icon: XCircle,
  },
};

interface LocalCartItem {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
}

interface CartLine {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  source: "local" | "server";
}

function serverItemToCartLine(item: PublicSaleItem): CartLine {
  const quantity = Number(item.orderedQuantity ?? item.quantity ?? 0);
  const unitPrice = Number(item.unitPriceQuoted ?? item.unitPrice ?? 0);
  return {
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    productName: item.productName,
    variantName: item.variantName,
    quantity,
    unitPrice,
    subtotal: Number(item.subtotal),
    source: "server",
  };
}

function localItemToCartLine(item: LocalCartItem): CartLine {
  return {
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    productName: item.productName,
    variantName: item.variantName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.quantity * item.unitPrice,
    source: "local",
  };
}

function getDefaultDeliveryDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

function formatPublicDate(value: unknown) {
  if (!value) return null;

  if (value instanceof Date) {
    const [year, month, day] = value.toISOString().slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
  }

  if (typeof value === "string") {
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnlyMatch) {
      return `${dateOnlyMatch[3]}/${dateOnlyMatch[2]}/${dateOnlyMatch[1]}`;
    }
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ProductCard({
  product,
  onAddVariant,
  disabled,
}: {
  product: PublicCatalogProduct;
  onAddVariant: (product: PublicCatalogProduct, variant: PublicCatalogVariant) => void;
  disabled: boolean;
}) {
  return (
    <article className="rounded-[28px] border border-orange-100 bg-white p-4 shadow-[0_14px_34px_rgba(124,45,18,0.08)]">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-orange-100 text-orange-700">
          <Package className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-[-0.03em] text-stone-950">
            {product.name}
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Elige una presentación para agregarla a tu pedido.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {product.variants.map((variant) => {
          const stock = Number(variant.stockQuantity);
          const isOutOfStock = stock <= 0;

          return (
            <div
              key={variant.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-stone-100 bg-orange-50/45 px-3 py-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-stone-900">{variant.name}</p>
                <p className="text-sm text-stone-500">
                  Stock: {formatCurrency(variant.stockQuantity, 3)} {product.unit}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <p className="text-right text-base font-black text-orange-600">
                  S/ {formatCurrency(variant.price)}
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full bg-stone-950 px-4 text-white hover:bg-stone-800 disabled:bg-stone-300"
                  disabled={disabled || isOutOfStock}
                  onClick={() => onAddVariant(product, variant)}
                >
                  <Plus className="h-4 w-4" />
                  Agregar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function PublicSalePage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [localItems, setLocalItems] = useState<LocalCartItem[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(getDefaultDeliveryDate);
  const [notes, setNotes] = useState("");
  const [confirmedSaleId, setConfirmedSaleId] = useState<string | null>(null);

  const { data, isLoading, error } = usePublicSalePage(slug, token);
  const addItem = useAddItemToPublicSale();
  const updateItem = useUpdatePublicSaleItem();
  const deleteItem = useDeletePublicSaleItem();
  const cancelSale = useCancelPublicSale();
  const confirmSale = useConfirmPublicSale();

  const sale = data?.sale ?? null;
  const business = data?.business ?? null;
  const catalog = data?.catalog ?? [];
  const isTokenMode = !!token;
  const canEdit = isTokenMode ? sale?.status === "draft" && sale.allowCustomerEdit : !confirmedSaleId;
  const cartLines = isTokenMode
    ? sale?.items.map(serverItemToCartLine) ?? []
    : localItems.map(localItemToCartLine);
  const totalAmount = isTokenMode
    ? Number(sale?.totalAmount ?? 0)
    : cartLines.reduce((sum, item) => sum + item.subtotal, 0);
  const deliveryDateLabel = formatPublicDate(sale?.deliveryDate);

  const addLocalVariant = (product: PublicCatalogProduct, variant: PublicCatalogVariant) => {
    setLocalItems((items) => {
      const existing = items.find((item) => item.variantId === variant.id);
      if (existing) {
        return items.map((item) =>
          item.variantId === variant.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...items,
        {
          id: variant.id,
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          variantName: variant.name,
          quantity: 1,
          unitPrice: Number(variant.price),
        },
      ];
    });
  };

  const handleAddVariant = (product: PublicCatalogProduct, variant: PublicCatalogVariant) => {
    if (!canEdit) return;

    if (isTokenMode) {
      if (!slug || !token) return;
      addItem.mutate({
        slug,
        token,
        productId: product.id,
        variantId: variant.id,
        quantity: 1,
      });
      return;
    }

    addLocalVariant(product, variant);
    toast.success("Producto agregado", {
      description: "El producto fue agregado a tu pedido",
    });
  };

  const handleUpdateQuantity = (line: CartLine, quantity: number) => {
    if (!canEdit || quantity < 0) return;

    if (line.source === "server") {
      if (!slug || !token || !sale) return;
      updateItem.mutate({
        slug,
        token,
        itemId: line.id,
        quantity,
        baseVersion: sale.version,
      });
      return;
    }

    setLocalItems((items) =>
      quantity <= 0
        ? items.filter((item) => item.id !== line.id)
        : items.map((item) => (item.id === line.id ? { ...item, quantity } : item))
    );
  };

  const handleDeleteItem = async (line: CartLine) => {
    if (!canEdit) return;
    const confirmed = await confirm({
      title: "Eliminar producto",
      description: "¿Eliminar este producto del pedido?",
      confirmText: "Eliminar",
      cancelText: "Volver",
      variant: "destructive",
    });

    if (!confirmed) return;

    if (line.source === "server") {
      if (!slug || !token || !sale) return;
      deleteItem.mutate({ slug, token, itemId: line.id, baseVersion: sale.version });
      return;
    }

    setLocalItems((items) => items.filter((item) => item.id !== line.id));
  };

  const handleCancel = async () => {
    if (!isTokenMode) {
      setLocalItems([]);
      return;
    }

    if (!slug || !token) return;
    const confirmed = await confirm({
      title: "Cancelar pedido",
      description: "¿Cancelar este pedido? Esta acción no se puede deshacer.",
      confirmText: "Cancelar pedido",
      cancelText: "Volver",
      variant: "destructive",
    });

    if (confirmed) {
      cancelSale.mutate({ slug, token });
    }
  };

  const handleConfirm = () => {
    if (!slug || cartLines.length === 0) return;
    confirmSale.mutate(
      {
        slug,
        token,
        customerName,
        customerPhone,
        deliveryDate,
        notes,
        items: isTokenMode
          ? undefined
          : localItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
            })),
      },
      {
        onSuccess: (result) => {
          setShowConfirmDialog(false);
          if (!isTokenMode) {
            setLocalItems([]);
            setConfirmedSaleId(result.saleId);
          }
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-orange-50 p-6 text-stone-950">
        <div className="text-center">
          <ShoppingBag className="mx-auto mb-4 h-12 w-12 animate-pulse text-orange-500" />
          <p className="font-semibold">Cargando catálogo...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-orange-50 p-6 text-stone-950">
        <div className="w-full max-w-md rounded-[30px] border border-red-100 bg-white p-6 text-center shadow-xl">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="text-xl font-bold">Catálogo no disponible</h1>
          <p className="mt-2 text-sm text-stone-500">
            Este enlace no existe, expiró o el catálogo público está desactivado.
          </p>
        </div>
      </div>
    );
  }

  const status = sale ? statusConfig[sale.status] : null;
  const StatusIcon = status?.icon;

  return (
    <div className="min-h-screen bg-[#fff7ed] text-stone-950">
      <header className="border-b border-orange-100 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:py-8">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg">
              {business.logoUrl ? (
                <img src={business.logoUrl} alt={business.name} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-8 w-8" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-600">
                Catálogo público
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.06em] text-stone-950 sm:text-5xl">
                {business.name}
              </h1>
              <p className="mt-2 max-w-xl text-base text-stone-600">
                Agrega tus productos y confirma tu pedido en línea.
              </p>
            </div>
          </div>

          {status && StatusIcon ? (
            <div className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold", status.className)}>
              <StatusIcon className="h-4 w-4" />
              {status.label}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 pb-32 sm:px-6 lg:grid-cols-[1fr_360px] lg:pb-10">
        <section className="space-y-4">
          {confirmedSaleId ? (
            <div className="rounded-[30px] border border-emerald-100 bg-white p-5 shadow-[0_14px_34px_rgba(6,95,70,0.08)]">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-[-0.04em]">Pedido confirmado</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Tu pedido fue enviado. Código interno: {confirmedSaleId.slice(-6)}.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {deliveryDateLabel ? (
            <div className="flex items-center gap-3 rounded-[24px] border border-orange-100 bg-white px-4 py-3 text-stone-700 shadow-sm">
              <CalendarDays className="h-5 w-5 text-orange-600" />
              <span className="font-medium">Fecha de entrega: {deliveryDateLabel}</span>
            </div>
          ) : null}

          {status ? (
            <div className="rounded-[24px] border border-stone-100 bg-white px-4 py-3 text-sm text-stone-600 shadow-sm">
              {status.description}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {catalog.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-orange-200 bg-white p-8 text-center md:col-span-2">
                <Package className="mx-auto mb-3 h-10 w-10 text-orange-300" />
                <p className="font-semibold text-stone-700">No hay productos publicados todavía.</p>
              </div>
            ) : (
              catalog.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  disabled={!canEdit || addItem.isPending}
                  onAddVariant={handleAddVariant}
                />
              ))
            )}
          </div>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-[32px] border border-orange-100 bg-white p-4 shadow-[0_18px_44px_rgba(124,45,18,0.10)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-600">Tu pedido</p>
                <h2 className="text-2xl font-black tracking-[-0.05em]">Carrito</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-950 text-white">
                <ShoppingBag className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {cartLines.length === 0 ? (
                <div className="rounded-2xl bg-orange-50 p-5 text-center text-sm text-stone-500">
                  Agrega productos del catálogo para empezar.
                </div>
              ) : (
                cartLines.map((line) => (
                  <div key={line.id} className="rounded-2xl border border-stone-100 bg-stone-50/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-stone-900">{line.productName}</p>
                        <p className="text-sm text-stone-500">{line.variantName}</p>
                        <p className="mt-1 text-sm font-bold text-orange-600">
                          S/ {formatCurrency(line.subtotal)}
                        </p>
                      </div>
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleDeleteItem(line)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-stone-200 bg-white">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full text-stone-700 hover:bg-orange-50"
                          disabled={!canEdit}
                          onClick={() => handleUpdateQuantity(line, Math.max(0, line.quantity - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center text-sm font-black">{formatCurrency(line.quantity, 3)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full text-stone-700 hover:bg-orange-50"
                          disabled={!canEdit}
                          onClick={() => handleUpdateQuantity(line, line.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-stone-500">S/ {formatCurrency(line.unitPrice)} c/u</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 rounded-[24px] bg-stone-950 p-4 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white/70">Total</span>
                <span className="text-3xl font-black text-orange-400">S/ {formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {canEdit ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-2xl border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={cartLines.length === 0 || cancelSale.isPending}
                  onClick={handleCancel}
                >
                  {isTokenMode ? "Cancelar" : "Vaciar"}
                </Button>
                <Button
                  type="button"
                  className="h-12 rounded-2xl bg-orange-500 font-bold text-white hover:bg-orange-600"
                  disabled={cartLines.length === 0 || confirmSale.isPending}
                  onClick={() => setShowConfirmDialog(true)}
                >
                  Confirmar
                </Button>
              </div>
            ) : null}
          </div>
        </aside>
      </main>

      {canEdit ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-orange-100 bg-white/95 p-3 shadow-[0_-12px_32px_rgba(124,45,18,0.10)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Total</p>
              <p className="text-2xl font-black text-stone-950">S/ {formatCurrency(totalAmount)}</p>
            </div>
            <Button
              type="button"
              className="h-12 rounded-2xl bg-orange-500 px-5 font-bold text-white hover:bg-orange-600"
              disabled={cartLines.length === 0 || confirmSale.isPending}
              onClick={() => setShowConfirmDialog(true)}
            >
              Confirmar
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="rounded-[28px] border-orange-100 bg-white text-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-[-0.05em]">Confirmar pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-stone-800">Nombre completo *</Label>
              <Input
                id="name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Tu nombre"
                className="h-12 rounded-2xl border-stone-200 bg-white text-stone-950"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-stone-800">Teléfono *</Label>
              <Input
                id="phone"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="999 999 999"
                className="h-12 rounded-2xl border-stone-200 bg-white text-stone-950"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery" className="text-stone-800">Fecha de entrega *</Label>
              <Input
                id="delivery"
                type="date"
                value={deliveryDate}
                onChange={(event) => setDeliveryDate(event.target.value)}
                className="h-12 rounded-2xl border-stone-200 bg-white text-stone-950"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-stone-800">Notas (opcional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Alguna indicación especial..."
                className="h-12 rounded-2xl border-stone-200 bg-white text-stone-950"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
              onClick={() => setShowConfirmDialog(false)}
            >
              Volver
            </Button>
            <Button
              type="button"
              className="h-11 rounded-2xl bg-orange-500 font-bold text-white hover:bg-orange-600"
              disabled={!customerName || !customerPhone || !deliveryDate || confirmSale.isPending}
              onClick={handleConfirm}
            >
              {confirmSale.isPending ? "Confirmando..." : "Confirmar pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
}
