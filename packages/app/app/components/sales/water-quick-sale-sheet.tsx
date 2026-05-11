import { useEffect, useMemo, useState } from "react";
import { Droplets, Loader2, Package, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerSelect } from "~/components/customers/customer-select";
import { PaymentMethodSelector } from "~/components/payments/payment-method-selector";
import { useAllVariants, type ProductVariantWithProduct } from "~/hooks/use-all-variants";
import { useBusiness } from "~/hooks/use-business";
import { useCreateSale } from "~/hooks/use-sales";
import type { PaymentMethod } from "~/hooks/use-payment-capture";
import { cn, formatCurrency } from "~/lib/utils";

interface WaterQuickSaleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
}

type SelectedCustomer = { id: string; name: string; phone?: string | null };

const PAYMENT_METHODS: PaymentMethod[] = [
  "efectivo",
  "yape",
  "plin",
  "transferencia",
  "tarjeta",
];

function getProductLabel(variant: ProductVariantWithProduct) {
  return variant.productName ?? variant.name;
}

function sortWaterVariants(a: ProductVariantWithProduct, b: ProductVariantWithProduct) {
  const aName = `${a.productName ?? ""} ${a.name}`.toLowerCase();
  const bName = `${b.productName ?? ""} ${b.name}`.toLowerCase();
  const aIsBidon = aName.includes("bidón") || aName.includes("bidon");
  const bIsBidon = bName.includes("bidón") || bName.includes("bidon");
  if (aIsBidon !== bIsBidon) return aIsBidon ? -1 : 1;
  return aName.localeCompare(bName, "es");
}

function isWaterContainerProduct(variant: ProductVariantWithProduct) {
  const label = `${variant.productName ?? ""} ${variant.name}`.toLowerCase();
  return label.includes("bidón") || label.includes("bidon");
}

function pickDefaultVariant(
  current: ProductVariantWithProduct | undefined,
  candidate: ProductVariantWithProduct,
) {
  if (!current) return candidate;

  const candidateName = candidate.name.toLowerCase();
  const currentName = current.name.toLowerCase();
  const candidateIsStandard = candidateName === "estándar" || candidateName === "estandar";
  const currentIsStandard = currentName === "estándar" || currentName === "estandar";

  if (candidateIsStandard && !currentIsStandard) return candidate;
  if (candidateIsStandard === currentIsStandard && candidate.sortOrder < current.sortOrder) {
    return candidate;
  }
  return current;
}

export function WaterQuickSaleSheet({
  open,
  onOpenChange,
  customerId,
}: WaterQuickSaleSheetProps) {
  const { data: business } = useBusiness();
  const { data: variants = [], isLoading } = useAllVariants();
  const createSale = useCreateSale();

  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");

  const productOptions = useMemo(() => {
    const byProduct = new Map<string, ProductVariantWithProduct>();
    for (const variant of variants.filter((item) => item.isActive && isWaterContainerProduct(item))) {
      byProduct.set(
        variant.productId,
        pickDefaultVariant(byProduct.get(variant.productId), variant),
      );
    }
    return Array.from(byProduct.values()).sort(sortWaterVariants);
  }, [variants]);

  const selectedVariant = productOptions.find((variant) => variant.id === selectedVariantId) ?? null;
  const numericQuantity = Math.max(0, Number.parseInt(quantity || "0", 10));
  const unitPrice = selectedVariant ? Number.parseFloat(selectedVariant.price || "0") : 0;
  const totalAmount = numericQuantity * unitPrice;

  useEffect(() => {
    if (!open) {
      setSelectedVariantId("");
      setQuantity("1");
      setPaymentMethod("efectivo");
      if (!customerId) {
        setSelectedCustomer(null);
      }
    }
  }, [customerId, open]);

  const handleSubmit = async () => {
    if (!business?.businessUserId) {
      toast.error("No se pudo identificar al vendedor");
      return;
    }
    if (!selectedVariant) {
      toast.error("Selecciona un producto de agua");
      return;
    }
    if (numericQuantity <= 0) {
      toast.error("Ingresa una cantidad válida");
      return;
    }

    try {
      await createSale.mutateAsync({
        sale: {
          sellerId: business.businessUserId,
          customerId: customerId ?? selectedCustomer?.id,
          type: "instant_sale",
          saleType: "contado",
          status: "active",
          totalAmount,
          amountPaid: totalAmount,
          paymentMode: "pago_total",
          paymentMethod,
        },
        items: [
          {
            productId: selectedVariant.productId,
            variantId: selectedVariant.id,
            productName: selectedVariant.productName ?? "Producto de agua",
            variantName: selectedVariant.name,
            quantity: numericQuantity,
            unitPrice,
            subtotal: totalAmount,
          },
        ],
      });

      toast.success("Venta rápida registrada", {
        description: "Pago completo al contado",
      });
      onOpenChange(false);
    } catch (error) {
      toast.error("No se pudo registrar la venta", {
        description: error instanceof Error ? error.message : "Inténtalo nuevamente",
      });
    }
  };

  const hasProducts = productOptions.length > 0;

  if (!open) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="shell-surface max-h-[92dvh] overflow-y-auto rounded-t-2xl border shell-divider px-4 pb-6 pt-5"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">Venta rápida de agua</SheetTitle>
          <SheetDescription>
            Registra una venta fuera de ruta sin usar calculadora.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {!customerId && (
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                Cliente opcional
              </div>
              <CustomerSelect
                value={selectedCustomer?.id ?? null}
                selectedCustomer={selectedCustomer}
                onChange={setSelectedCustomer}
                placeholder="Venta sin cliente"
              />
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Droplets className="h-4 w-4 text-sky-400" />
                Producto
              </div>
              {isLoading ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Cargando
                </span>
              ) : null}
            </div>

            {!isLoading && !hasProducts ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Configura productos de agua antes de vender.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {productOptions.map((variant) => {
                  const isSelected = selectedVariantId === variant.id;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                        isSelected
                          ? "border-orange-500/60 bg-orange-500/12 text-foreground"
                          : "border-border bg-background/40 hover:bg-muted/45",
                      )}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/12 text-sky-300">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {getProductLabel(variant)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          S/ {formatCurrency(Number.parseFloat(variant.price || "0"))}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <div className="space-y-2">
              <label htmlFor="water-quick-sale-quantity" className="text-sm font-medium">
                Bidones
              </label>
              <Input
                id="water-quick-sale-quantity"
                inputMode="numeric"
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="h-11 rounded-lg"
              />
            </div>
            <div className="pb-2 text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-semibold text-foreground">
                S/ {formatCurrency(totalAmount)}
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-sm font-medium">Método de pago</p>
            <PaymentMethodSelector
              methods={PAYMENT_METHODS}
              selectedMethod={paymentMethod}
              onSelect={setPaymentMethod}
              disabled={createSale.isPending}
            />
          </section>

        </div>

        <SheetFooter className="mt-6 flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-lg"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-11 flex-1 rounded-lg bg-orange-500 text-white hover:bg-orange-600"
            disabled={!selectedVariant || numericQuantity <= 0 || createSale.isPending}
            onClick={handleSubmit}
          >
            {createSale.isPending ? "Guardando..." : "Guardar venta"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
