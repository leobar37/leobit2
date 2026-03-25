import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  CreditCard,
  Wallet,
  Receipt,
  Trash2,
  Package,
  Check,
  Calculator as CalculatorIcon,
  Plus,
  Loader2,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerSelect } from "~/components/customers/customer-select";
import { CalculatorInput } from "~/components/calculator/calculator-input";
import { AmountPaidInput } from "~/components/sales/amount-paid-input";
import { useProducts } from "~/hooks/use-products";
import { useVariantsByProduct } from "~/hooks/use-product-variants";
import { useSmartCalculator } from "~/hooks/use-smart-calculator";
import {
  useSale,
  useFinalizeSale,
  useSaleItems,
  useAddSaleItem,
  useRemoveSaleItem,
  useUpdateSaleItem,
} from "~/hooks/use-sales-db";
import { useUpdateSale } from "~/hooks/use-sales";
import { useSaleCalculations } from "~/hooks/use-sale-calculations";
import { formatCurrency, formatKilos, formatNumber, cn } from "~/lib/utils";
import type { PaymentMode } from "~/lib/sales/types";
import { useBusinessSettings } from "~/hooks/use-business-settings";
import { getSaleEditorPath } from "~/lib/sales/navigation";
import { useNewSaleContext } from "./new-sale-context";
import { useToast } from "~/hooks/use-toast";


export function CustomerSection() {
  const { saleId, visitaId } = useNewSaleContext();
  const { data: sale, refetch } = useSale(saleId);
  const { data: items = [] } = useSaleItems(saleId);
  const updateSale = useUpdateSale();
  const { toast } = useToast();

  const calculations = useSaleCalculations(sale, items);

  const isFromVisita = !!visitaId;

  const handleSelectCustomer = async (
    customer: { id: string; name: string; phone?: string | null } | null,
  ) => {
    if (!saleId || !updateSale) return;

    try {
      await updateSale.mutateAsync({
        id: saleId,
        input: {
          customerId: customer?.id ?? null,
        },
      });
    } catch (error) {
      console.error("[CustomerSection] Error updating customer:", error);
      toast.error("Error al seleccionar cliente", {
        description: "No se pudo actualizar el cliente de la venta",
      });
    }
  };

  // Handle both camelCase and snake_case from DB
  const customerId = sale?.customerId ?? (sale as any)?.customer_id ?? null;
  const customer = sale?.customer ?? (sale as any)?.customer ?? null;

  return (
    <CustomerSelect
      value={customerId}
      selectedCustomer={customer}
      onChange={handleSelectCustomer}
      disabled={isFromVisita}
      placeholder={isFromVisita ? "Cliente de la visita" : "Seleccionar cliente"}
      helperText={
        calculations.requiresCustomer
          ? "Requerido para venta a crédito"
          : isFromVisita
            ? "El cliente no se puede cambiar en ventas de visita"
            : undefined
      }
    />
  );
}

// ============================================
// Payment Mode Section Component
// ============================================

const paymentModes: {
  value: PaymentMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    value: "pago_total",
    label: "Pago Total",
    icon: <Wallet className="h-5 w-5" />,
    description: "El cliente paga todo en efectivo",
  },
  {
    value: "a_cuenta",
    label: "A Cuenta",
    icon: <CreditCard className="h-5 w-5" />,
    description: "El cliente da un adelanto",
  },
  {
    value: "debe_todo",
    label: "Debe Todo",
    icon: <Receipt className="h-5 w-5" />,
    description: "El cliente paga después",
  },
];

export function PaymentModeSection() {
  const { saleId } = useNewSaleContext();
  const { data: sale } = useSale(saleId);
  const { data: items = [] } = useSaleItems(saleId);
  const updateSale = useUpdateSale();
  const { toast } = useToast();

  const calculations = useSaleCalculations(sale, items);

  // Define callback before guard clause to ensure hooks are always called in same order
  const handleUpdateAmountPaid = useCallback(
    async (amount: string, balanceDue: string) => {
      if (!saleId) return;
      await updateSale.mutateAsync({
        id: saleId,
        input: { amountPaid: amount, balanceDue },
      });
    },
    [saleId, updateSale]
  );

  // Guard clause: ensure we have required data before rendering
  // Note: Must be after all hook calls to maintain hook order consistency
  if (!saleId || items.length === 0) {
    return null;
  }

  const handleSetPaymentMode = async (mode: PaymentMode) => {
    if (!saleId) return;

    const totalAmount = formatNumber(calculations.totalAmount);
    const amountPaid =
      mode === "pago_total"
        ? totalAmount
        : mode === "debe_todo"
          ? "0.00"
          : sale?.amountPaid || "0.00";

    try {
      await updateSale.mutateAsync({
        id: saleId,
        input: {
          paymentMode: mode,
          saleType: mode === "pago_total" ? "contado" : "credito",
          totalAmount,
          amountPaid,
          balanceDue: formatNumber(calculations.balanceDue),
        },
      });
    } catch {
      toast.error("Error al cambiar modo de pago", {
        description: "No se pudo actualizar el modo de pago",
      });
    }
  };

  return (
    <Card className="shell-card rounded-3xl border-0">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          {paymentModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => handleSetPaymentMode(mode.value)}
              className={cn(
                "w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                sale?.paymentMode === mode.value
                  ? "shell-card-muted border-orange-300 bg-orange-50/90"
                  : "border-white/70 bg-white/60 hover:bg-white/82",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl",
                  sale?.paymentMode === mode.value
                    ? "bg-orange-500 text-white shadow-sm"
                    : "shell-card-muted bg-white/72 text-gray-600",
                )}
              >
                {mode.icon}
              </div>
              <div className="flex-1">
                <p
                  className={cn(
                    "font-medium",
                    sale?.paymentMode === mode.value && "text-orange-900",
                  )}
                >
                  {mode.label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {mode.description}
                </p>
              </div>
              {sale?.paymentMode === mode.value && (
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {sale?.paymentMode === "a_cuenta" && saleId && (
          <AmountPaidInput
            saleId={saleId}
            totalAmount={calculations.totalAmount}
            initialAmount={sale?.amountPaid || ""}
            onUpdate={handleUpdateAmountPaid}
          />
        )}

        {sale?.paymentMode === "debe_todo" && calculations.totalAmount > 0 && (
          <div className="border-t pt-3 shell-divider">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total a deber:</span>
              <span className="font-medium text-orange-600">
                S/ {formatCurrency(calculations.totalAmount)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Cart Item Component
// ============================================

function CartItemRow({ itemId }: { itemId: string }) {
  const navigate = useNavigate();
  const { saleId, setEditingItemId } = useNewSaleContext();
  const { data: items = [] } = useSaleItems(saleId);
  const removeItem = useRemoveSaleItem();

  const item = items.find((i) => i.id === itemId);
  if (!item) return null;

  const handleEdit = () => {
    setEditingItemId(item.id);
    navigate(`/ventas/${saleId}/editar/calculadora?itemId=${item.id}`);
  };

  return (
    <div className="shell-card-muted flex items-center gap-3 rounded-2xl p-3.5">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/80">
        <Package className="h-5 w-5 text-orange-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.productName}</p>
        <p className="text-sm text-muted-foreground">
          {item.variantName} · {formatKilos(parseFloat(item.quantity ?? "0"))}{" "}
          kg × S/ {formatCurrency(parseFloat(item.unitPrice ?? "0"))}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold">
          S/ {formatCurrency(parseFloat(item.subtotal))}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleEdit}
        className="flex-shrink-0 rounded-2xl text-muted-foreground hover:bg-white/70 hover:text-orange-600"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => removeItem.mutate({ saleId: saleId!, itemId: item.id })}
        className="flex-shrink-0 rounded-2xl text-muted-foreground hover:bg-white/70 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ============================================
// Cart Section Component
// ============================================

export function CartSection() {
  const { saleId } = useNewSaleContext();
  const { data: items = [] } = useSaleItems(saleId);

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="shell-card rounded-3xl border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Productos ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <CartItemRow key={item.id} itemId={item.id} />
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================
// Sale Summary Card Component
// ============================================

export function SaleSummaryCard() {
  const { saleId } = useNewSaleContext();
  const { data: sale } = useSale(saleId);
  const { data: items = [] } = useSaleItems(saleId);

  const calculations = useSaleCalculations(sale, items);

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="rounded-3xl border border-orange-300/50 bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 text-white shadow-[0_22px_48px_rgba(249,115,22,0.24)]">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-orange-100">Total productos:</span>
          <span className="font-semibold">{items.length}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-orange-100">Monto total:</span>
          <span className="text-2xl font-bold">
            S/ {formatCurrency(calculations.totalAmount)}
          </span>
        </div>

        {sale?.paymentMode === "a_cuenta" && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-orange-100">Pagado:</span>
              <span className="font-semibold">
                S/ {formatCurrency(calculations.amountPaidValue)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-orange-300/70">
              <span className="text-orange-100">Saldo:</span>
              <span className="font-bold">
                S/ {formatCurrency(calculations.balanceDue)}
              </span>
            </div>
          </>
        )}

        {sale?.paymentMode === "debe_todo" && (
          <div className="flex justify-between items-center pt-2 border-t border-orange-300/70">
            <span className="text-orange-100">Total a deber:</span>
            <span className="font-bold">
              S/ {formatCurrency(calculations.totalAmount)}
            </span>
          </div>
        )}

        {!calculations.canSubmit && (
          <div className="rounded-2xl bg-white/18 p-3 text-center text-sm backdrop-blur-sm">
            {items.length === 0
              ? "Agrega productos para continuar"
              : calculations.requiresCustomer && !sale?.customerId
                ? "Selecciona un cliente para venta a crédito"
                : "Revisa el monto pagado"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Sale Submit Bar Component (Combined Summary + Button)
// ============================================

export function SaleSubmitBar() {
  const navigate = useNavigate();
  const { saleId, returnTo } = useNewSaleContext();
  const { data: sale } = useSale(saleId);
  const { data: items = [] } = useSaleItems(saleId);
  const { toast } = useToast();
  const finalizeSale = useFinalizeSale();

  const calculations = useSaleCalculations(sale, items);

  // Check if we're in delivery mode (confirmed pre_order)
  const isDeliveryMode = sale?.type === "pre_order" && sale?.status === "confirmed";

  const handleSubmit = async () => {
    if (!calculations.canSubmit || !saleId || !sale) return;

    try {
      if (isDeliveryMode) {
        // In delivery mode, pass the items with their final values
        const deliveryItems = items.map(item => ({
          itemId: item.id,
          deliveredQuantity: parseFloat(item.quantity || item.orderedQuantity || "0"),
          unitPriceFinal: parseFloat(item.unitPrice || item.unitPriceQuoted || "0"),
          subtotal: parseFloat(item.subtotal),
        }));

        await finalizeSale.mutateAsync({
          id: saleId,
          type: sale.type,
          version: sale.version,
          isDeliveryMode: true,
          deliveryItems,
          amountPaid: parseFloat(sale.amountPaid || "0"),
          paymentMode: sale.paymentMode || undefined,
        });

        toast.success("Pedido entregado exitosamente");
      } else {
        // Normal confirmation flow
        await finalizeSale.mutateAsync({
          id: saleId,
          type: sale.type,
          version: sale.version,
        });
      }

      navigate(returnTo);
    } catch (error) {
      console.error("[SaleSubmitBar] Error finalizing sale:", error);
      const message = error instanceof Error ? error.message : "No se pudo completar la venta";
      toast.error(isDeliveryMode ? "Error al confirmar entrega" : "Error al finalizar venta", {
        description: message,
      });
    }
  };

  const buttonText = useMemo(() => {
    if (finalizeSale.isPending) return "Procesando...";
    if (isDeliveryMode) return "Confirmar Entrega";
    if (sale?.type === "pre_order") return "Confirmar Pedido";
    return "Finalizar Venta";
  }, [finalizeSale.isPending, sale?.type, isDeliveryMode]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-0 right-0 border-t shell-surface px-4 py-3 z-50">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? 'producto' : 'productos'}
          </span>
          <span className="text-lg font-bold text-orange-600">
            S/ {formatCurrency(calculations.totalAmount)}
          </span>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!calculations.canSubmit || finalizeSale.isPending}
          className={cn(
            "h-11 px-6 rounded-xl text-sm font-semibold shadow-md whitespace-nowrap disabled:opacity-100",
            isDeliveryMode
              ? "bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300"
              : "bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300"
          )}
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Calculator Content Component
// ============================================

interface CalculatorContentProps {
  returnPath?: string;
}

export function CalculatorContent({ returnPath }: CalculatorContentProps) {
  const navigate = useNavigate();
  const { saleId, editingItemId, setEditingItemId } = useNewSaleContext();
  const { data: saleItems = [] } = useSaleItems(saleId);
  
  const editingItem = editingItemId ? saleItems.find((i) => i.id === editingItemId) : null;
  const isEditMode = !!editingItem;
  
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Sync product/variant selection when editing item loads
  useEffect(() => {
    if (isEditMode && editingItem) {
      setSelectedProductId(editingItem.productId);
      setSelectedVariantId(editingItem.variantId);
    }
  }, [isEditMode, editingItem]);

  const { toast } = useToast();
  const addItem = useAddSaleItem();
  const updateItem = useUpdateSaleItem();
  const { settings } = useBusinessSettings();

  const {
    data: products = [],
    isLoading: isProductsLoading,
    isFetching: isProductsFetching,
  } = useProducts();
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const {
    data: variants = [],
    isLoading: isVariantsLoading,
    isFetching: isVariantsFetching,
  } = useVariantsByProduct(selectedProductId || "", {
    isActive: true,
  });
  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  const calculatorSettings = settings?.calculators?.sales;
  const hideTara = calculatorSettings?.hideTara ?? true;
  const autoFillPrice = calculatorSettings?.autoFillPrice ?? true;

  const editingInitialValues = isEditMode && editingItem ? {
    quantity: String(editingItem.quantity),
    unitPrice: String(editingItem.unitPrice),
    subtotal: String(editingItem.subtotal),
  } : undefined;

  const {
    form,
    isValid,
    isKgProduct,
    values,
    toggleAutoCalculateField,
    isFieldAutoCalculated,
    setFieldValue,
    calculation,
    handleClear,
  } = useSmartCalculator({
    product: selectedProduct,
    variant: selectedVariant,
    autoFillPrice,
    hideTara,
    initialValues: editingInitialValues,
  });

  // Populate calculator values when editing and product/variant loads
  useEffect(() => {
    if (!isEditMode || !editingItem || !selectedProduct || !selectedVariant) return;

    // Reset form with editing item values
    const quantity = String(editingItem.quantity);
    const unitPrice = String(editingItem.unitPrice);
    const subtotal = String(editingItem.subtotal);

    if (isKgProduct) {
      form.reset({
        totalAmount: subtotal,
        pricePerKg: unitPrice,
        kilos: quantity,
        tara: "0",
        pricePerPack: "",
        packs: "",
        units: "",
      });
    } else {
      form.reset({
        totalAmount: subtotal,
        pricePerKg: "",
        kilos: "",
        tara: "0",
        pricePerPack: unitPrice,
        packs: quantity,
        units: "",
      });
    }
  }, [isEditMode, editingItem, selectedProduct, selectedVariant, isKgProduct, form]);

  const handleSave = async () => {
    if (
      !selectedProduct ||
      !selectedVariant ||
      !calculation.isValid ||
      !saleId
    ) {
      return;
    }

    try {
      if (isEditMode && editingItem) {
        // Update existing item
        await updateItem.mutateAsync({
          saleId,
          itemId: editingItem.id,
          data: {
            quantity: calculation.quantity,
            unitPrice: calculation.unitPrice,
            subtotal: calculation.subtotal,
          },
        });
        setEditingItemId(null);
      } else {
        // Add new item
        await addItem.mutateAsync({
          saleId,
          item: {
            productId: selectedProduct.id,
            variantId: selectedVariant.id,
            quantity: Number(calculation.quantity),
            price: Number(calculation.unitPrice),
            subtotal: Number(calculation.subtotal),
          },
        });
      }

      navigate(returnPath ?? getSaleEditorPath(saleId));
    } catch (error) {
      console.error("[CalculatorContent] Error saving item:", error);
      const message = error instanceof Error ? error.message : "No se pudo agregar el producto";
      toast.error("Error al agregar producto", {
        description: message,
      });
    }
  };

  const handleCancel = () => {
    setEditingItemId(null);
    navigate(returnPath || getSaleEditorPath(saleId!));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Product Selection */}
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Product Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Producto</label>
          {isProductsLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="shell-card rounded-2xl p-3 space-y-2"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : products.filter((product) => product.isActive).length === 0 ? (
            <Card className="shell-card rounded-3xl border-0">
              <CardContent className="p-4 text-sm text-muted-foreground">
                No hay productos activos para vender.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {products
                  .filter((p) => p.isActive)
                  .map((product) => {
                    const isInCart = saleItems.some((item) => item.productId === product.id);
                    return (
                      <button
                        key={product.id}
                        onClick={() => {
                          setSelectedProductId(product.id);
                          setSelectedVariantId(null);
                          handleClear();
                        }}
                        disabled={isInCart}
                        className={cn(
                          "rounded-2xl border p-3 text-left transition-colors",
                          isInCart
                            ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                            : selectedProductId === product.id
                              ? "shell-card-muted border-orange-300 bg-orange-50/90"
                              : "border-white/70 bg-white/60 hover:bg-white/82",
                        )}
                      >
                        <p className="font-medium text-sm">{product.name}</p>
                        <Badge variant="secondary" className="mt-1">
                          {product.unit === "kg" ? "Por kilo" : "Por unidad"}
                        </Badge>
                        {isInCart && (
                          <Badge variant="outline" className="mt-1 ml-1 text-xs">
                            Agregado
                          </Badge>
                        )}
                      </button>
                    );
                  })}
              </div>
              {isProductsFetching && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Actualizando productos...
                </div>
              )}
            </>
          )}
        </div>

        {/* Variant Selector */}
        {selectedProduct && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Presentación</label>
            {isVariantsLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="shell-card rounded-2xl p-3 space-y-2"
                  >
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                ))}
              </div>
            ) : variants.length === 0 ? (
              <Card className="shell-card rounded-3xl border-0">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Este producto no tiene presentaciones activas.
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                        handleClear();
                      }}
                      className={cn(
                        "rounded-2xl border p-3 text-left transition-colors",
                        selectedVariantId === variant.id
                          ? "shell-card-muted border-orange-300 bg-orange-50/90"
                          : "border-white/70 bg-white/60 hover:bg-white/82",
                      )}
                    >
                      <p className="font-medium text-sm">{variant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        S/ {formatCurrency(variant.price)}
                      </p>
                    </button>
                  ))}
                </div>
                {isVariantsFetching && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Actualizando presentaciones...
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Calculator Form */}
        {selectedVariant && (
          <div className="space-y-4 border-t pt-4 shell-divider">
            <div className="flex items-center gap-2">
              <CalculatorIcon className="h-5 w-5 text-orange-600" />
              <span className="font-medium">Calculadora</span>
            </div>

            {isKgProduct ? (
              // KG Product Calculator
              <div className="space-y-3">
                {!hideTara && (
                  <CalculatorInput
                    name="tara"
                    label="Tara (kg)"
                    value={values.tara}
                    placeholder="0.000"
                    onChange={(value) => setFieldValue("tara", value)}
                    fieldType="quantity"
                    isAutoCalculateTarget={false}
                    onToggleAutoCalculate={() => {}}
                    decimals={3}
                  />
                )}
                <CalculatorInput
                  name="kilos"
                  label="Kilos netos"
                  value={values.quantity}
                  placeholder="0.000"
                  onChange={(value) => setFieldValue("kilos", value)}
                  fieldType="quantity"
                  isAutoCalculateTarget={isFieldAutoCalculated("quantity")}
                  onToggleAutoCalculate={() =>
                    toggleAutoCalculateField("quantity")
                  }
                  decimals={3}
                />
                <CalculatorInput
                  name="pricePerKg"
                  label="Precio por kg (S/)"
                  value={values.price}
                  placeholder={selectedVariant?.price || "0.00"}
                  onChange={(value) => setFieldValue("pricePerKg", value)}
                  fieldType="price"
                  isAutoCalculateTarget={isFieldAutoCalculated("price")}
                  onToggleAutoCalculate={() =>
                    toggleAutoCalculateField("price")
                  }
                  decimals={2}
                  helperText={
                    selectedVariant?.price
                      ? `Precio base: S/ ${selectedVariant.price}`
                      : undefined
                  }
                  helperValue={selectedVariant?.price}
                  onApplyHelperValue={(value) => setFieldValue("pricePerKg", value)}
                />
                <CalculatorInput
                  name="totalAmount"
                  label="Total (S/)"
                  value={values.total}
                  placeholder="0.00"
                  onChange={(value) => setFieldValue("totalAmount", value)}
                  fieldType="total"
                  isAutoCalculateTarget={isFieldAutoCalculated("total")}
                  onToggleAutoCalculate={() =>
                    toggleAutoCalculateField("total")
                  }
                  decimals={2}
                />
              </div>
            ) : (
              // Unit Product Calculator
              <div className="space-y-3">
                <CalculatorInput
                  name="packs"
                  label="Packs"
                  value={values.quantity}
                  placeholder="0"
                  onChange={(value) => setFieldValue("packs", value)}
                  fieldType="quantity"
                  isAutoCalculateTarget={isFieldAutoCalculated("quantity")}
                  onToggleAutoCalculate={() =>
                    toggleAutoCalculateField("quantity")
                  }
                  decimals={0}
                />
                <CalculatorInput
                  name="pricePerPack"
                  label="Precio por pack (S/)"
                  value={values.price}
                  placeholder={selectedVariant?.price || "0.00"}
                  onChange={(value) => setFieldValue("pricePerPack", value)}
                  fieldType="price"
                  isAutoCalculateTarget={isFieldAutoCalculated("price")}
                  onToggleAutoCalculate={() =>
                    toggleAutoCalculateField("price")
                  }
                  decimals={2}
                  helperText={
                    selectedVariant?.price
                      ? `Precio base: S/ ${selectedVariant.price}`
                      : undefined
                  }
                  helperValue={selectedVariant?.price}
                  onApplyHelperValue={(value) => setFieldValue("pricePerPack", value)}
                />
                <CalculatorInput
                  name="totalAmount"
                  label="Total (S/)"
                  value={values.total}
                  placeholder="0.00"
                  onChange={(value) => setFieldValue("totalAmount", value)}
                  fieldType="total"
                  isAutoCalculateTarget={isFieldAutoCalculated("total")}
                  onToggleAutoCalculate={() =>
                    toggleAutoCalculateField("total")
                  }
                  decimals={2}
                />
              </div>
            )}

            {/* Calculation Summary */}
            {calculation.isValid && (
              <div className="shell-card-muted space-y-2 rounded-2xl p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Cantidad:
                  </span>
                  <span className="font-medium">
                    {isKgProduct
                      ? `${formatKilos(calculation.quantity)} kg`
                      : `${Math.round(calculation.quantity)} unidades`}
                  </span>
                </div>
                {isKgProduct && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Precio unitario:
                    </span>
                    <span className="font-medium">
                      S/ {formatCurrency(calculation.unitPrice)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-orange-200/70 pt-2">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-bold text-lg">
                    S/ {formatCurrency(calculation.subtotal)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {selectedVariant && (
        <div className="space-y-2 border-t px-4 py-4 shell-surface shell-divider">
          <Button
            onClick={handleSave}
            disabled={!isValid || updateItem.isPending || addItem.isPending}
            className="h-12 w-full rounded-2xl bg-orange-500 shadow-[0_14px_28px_rgba(249,115,22,0.2)] hover:bg-orange-600 disabled:bg-orange-300"
          >
            {isEditMode
              ? `Actualizar · S/ ${formatCurrency(calculation.subtotal)}`
              : `Agregar al carrito · S/ ${formatCurrency(calculation.subtotal)}`}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            className="h-12 w-full rounded-2xl border-white/70 bg-white/76 shadow-sm hover:bg-white"
          >
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
