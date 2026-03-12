import { useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerSelect } from "~/components/customers/customer-select";
import { CalculatorInput } from "~/components/calculator/calculator-input";
import { useProducts } from "~/hooks/use-products";
import { useVariantsByProduct } from "~/hooks/use-product-variants";
import { useSmartCalculator } from "~/hooks/use-smart-calculator";
import {
  useSale,
  useUpdateSale,
  useFinalizeSale,
  useSaleItems,
  useAddSaleItem,
  useRemoveSaleItem,
} from "~/hooks/use-sales-db";
import { useSaleCalculations } from "~/hooks/use-sale-calculations";
import { formatCurrency, formatKilos, cn } from "~/lib/utils";
import type { PaymentMode } from "~/lib/sales/types";
import { useBusinessSettings } from "~/hooks/use-business-settings";
import { getSaleEditorPath } from "~/lib/sales/navigation";
import { useNewSaleContext } from "./new-sale-context";

const isSaleEditorDebugEnabled = import.meta.env.DEV;

function debugSaleEditor(message: string, payload?: unknown) {
  if (!isSaleEditorDebugEnabled) return;

  if (payload === undefined) {
    console.log(`[SaleEditorDebug] ${message}`);
    return;
  }

  console.log(`[SaleEditorDebug] ${message}`, payload);
}

export function CustomerSection() {
  const { saleId } = useNewSaleContext();
  const { data: sales } = useSale(saleId);
  const { data: items = [] } = useSaleItems(saleId);
  const updateSale = useUpdateSale();

  const sale = sales?.[0] || null;
  const calculations = useSaleCalculations(sale, items);

  const handleSelectCustomer = (customer: { id: string; name: string; phone?: string | null } | null) => {
    if (!saleId) {
      debugSaleEditor("Skipped customer selection because saleId is missing");
      return;
    }

    debugSaleEditor("Selecting customer for sale", {
      saleId,
      customerId: customer?.id ?? null,
      hasLocalSale: Boolean(sale),
    });

    void updateSale(saleId, {
      customerId: customer?.id ?? null,
    }).catch((error) => {
      debugSaleEditor("Failed to update sale customer", {
        saleId,
        customerId: customer?.id ?? null,
        error,
      });
      console.error(error);
    });
  };

  return (
    <CustomerSelect
      value={sale?.customerId ?? null}
      selectedCustomer={sale?.customer ?? null}
      onChange={handleSelectCustomer}
      placeholder="Seleccionar cliente"
      helperText={calculations.requiresCustomer ? "Requerido para venta a crédito" : undefined}
    />
  );
}

// ============================================
// Payment Mode Section Component
// ============================================

const paymentModes: { value: PaymentMode; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "pago_total",
    label: "Pago Total",
    icon: <Wallet className="h-5 w-5" />,
    description: "El cliente paga todo en efectivo"
  },
  {
    value: "a_cuenta",
    label: "A Cuenta",
    icon: <CreditCard className="h-5 w-5" />,
    description: "El cliente da un adelanto"
  },
  {
    value: "debe_todo",
    label: "Debe Todo",
    icon: <Receipt className="h-5 w-5" />,
    description: "El cliente paga después"
  },
];

export function PaymentModeSection() {
  const { saleId } = useNewSaleContext();
  const { data: sales } = useSale(saleId);
  const { data: items = [] } = useSaleItems(saleId);
  const updateSale = useUpdateSale();

  const sale = sales?.[0] || null;
  const calculations = useSaleCalculations(sale, items);

  if (items.length === 0) {
    return null;
  }

  const handleSetPaymentMode = (mode: PaymentMode) => {
    if (saleId) {
      const totalAmount = calculations.totalAmount.toFixed(2);
      const amountPaid =
        mode === "pago_total"
          ? totalAmount
          : mode === "debe_todo"
            ? "0.00"
            : sale?.amountPaid || "0.00";

      updateSale(saleId, {
        paymentMode: mode,
        saleType: mode === "pago_total" ? "contado" : "credito",
        totalAmount,
        amountPaid,
        balanceDue: calculations.balanceDue.toFixed(2),
      });
    }
  };

  const handleSetAmountPaid = (amount: string) => {
    if (saleId) {
      updateSale(saleId, {
        amountPaid: amount,
        balanceDue: calculations.balanceDue.toFixed(2),
      });
    }
  };

  return (
    <Card className="border-0 rounded-2xl bg-card">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          {paymentModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => handleSetPaymentMode(mode.value)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left",
                sale?.paymentMode === mode.value
                  ? "bg-orange-100 border-2 border-orange-500"
                  : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                sale?.paymentMode === mode.value ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-600"
              )}>
                {mode.icon}
              </div>
              <div className="flex-1">
                <p className={cn("font-medium", sale?.paymentMode === mode.value && "text-orange-900")}>
                  {mode.label}
                </p>
                <p className="text-sm text-muted-foreground">{mode.description}</p>
              </div>
              {sale?.paymentMode === mode.value && (
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {sale?.paymentMode === "a_cuenta" && (
          <div className="space-y-3 pt-2 border-t">
            <label className="text-sm font-medium">Monto pagado (S/)</label>
            <Input
              type="number"
              placeholder="0.00"
              value={sale?.amountPaid || ""}
              onChange={(e) => handleSetAmountPaid(e.target.value)}
              className={cn(
                "text-lg rounded-xl",
                !calculations.hasValidPartial &&
                  sale?.amountPaid &&
                  "border-red-500 focus-visible:ring-red-500"
              )}
            />
            {!calculations.hasValidPartial && sale?.amountPaid && (
              <p className="text-sm text-red-500">
                El monto debe ser mayor a 0 y menor o igual al total
              </p>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">S/ {formatCurrency(calculations.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Saldo pendiente:</span>
              <span className="font-medium text-orange-600">S/ {formatCurrency(calculations.balanceDue)}</span>
            </div>
          </div>
        )}

        {sale?.paymentMode === "debe_todo" && calculations.totalAmount > 0 && (
          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total a deber:</span>
              <span className="font-medium text-orange-600">S/ {formatCurrency(calculations.totalAmount)}</span>
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
  const { saleId } = useNewSaleContext();
  const { data: items = [] } = useSaleItems(saleId);
  const removeItem = useRemoveSaleItem();

  const item = items.find(i => i.id === itemId);
  if (!item) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Package className="h-5 w-5 text-orange-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.productName}</p>
        <p className="text-sm text-muted-foreground">
          {item.variantName} · {formatKilos(parseFloat(item.quantity ?? "0"))} kg × S/{" "}
          {formatCurrency(parseFloat(item.unitPrice ?? "0"))}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold">S/ {formatCurrency(parseFloat(item.subtotal))}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => removeItem(item.id)}
        className="text-muted-foreground hover:text-destructive flex-shrink-0"
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
    <Card className="border-0 rounded-2xl bg-card">
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
  const { data: sales } = useSale(saleId);
  const { data: items = [] } = useSaleItems(saleId);

  const sale = sales?.[0] || null;
  const calculations = useSaleCalculations(sale, items);

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-orange-100">Total productos:</span>
          <span className="font-semibold">{items.length}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-orange-100">Monto total:</span>
          <span className="text-2xl font-bold">S/ {formatCurrency(calculations.totalAmount)}</span>
        </div>

        {sale?.paymentMode === "a_cuenta" && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-orange-100">Pagado:</span>
              <span className="font-semibold">S/ {formatCurrency(calculations.amountPaidValue)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-orange-400">
              <span className="text-orange-100">Saldo:</span>
              <span className="font-bold">S/ {formatCurrency(calculations.balanceDue)}</span>
            </div>
          </>
        )}

        {sale?.paymentMode === "debe_todo" && (
          <div className="flex justify-between items-center pt-2 border-t border-orange-400">
            <span className="text-orange-100">Total a deber:</span>
            <span className="font-bold">S/ {formatCurrency(calculations.totalAmount)}</span>
          </div>
        )}

        {!calculations.canSubmit && (
          <div className="p-2 bg-white/20 rounded-lg text-sm text-center">
            {items.length === 0
              ? "Agrega productos para continuar"
              : calculations.requiresCustomer && !sale?.customerId
              ? "Selecciona un cliente para venta a crédito"
              : "Revisa el monto pagado"
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Submit Sale Button Component
// ============================================

export function SubmitSaleButton() {
  const navigate = useNavigate();
  const { saleId } = useNewSaleContext();
  const { data: sales } = useSale(saleId);
  const { data: items = [] } = useSaleItems(saleId);

  const sale = sales?.[0] || null;
  const finalizeSale = useFinalizeSale();

  const calculations = useSaleCalculations(sale, items);

  const handleSubmit = async () => {
    if (!calculations.canSubmit || !saleId) return;

    try {
      const nextStatus = sale?.type === "pre_order" ? "confirmed" : "active";

      await finalizeSale.mutateAsync({
        saleId,
        changes: {
          totalAmount: formatCurrency(calculations.totalAmount),
          saleType: calculations.saleType,
          amountPaid: formatCurrency(calculations.amountPaidValue),
          balanceDue: formatCurrency(calculations.balanceDue),
          status: nextStatus,
        },
      });
      navigate("/ventas");
    } catch (error) {
      console.error("Failed to submit sale:", error);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-orange-100 p-4 pb-safe">
      <Button
        onClick={handleSubmit}
        disabled={!calculations.canSubmit || finalizeSale.isPending}
        className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300"
      >
        {finalizeSale.isPending ? (
          "Procesando..."
        ) : (
          <>
            Finalizar Venta · S/ {formatCurrency(calculations.totalAmount)}
          </>
        )}
      </Button>
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
  const { saleId } = useNewSaleContext();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const addItem = useAddSaleItem();
  const { settings } = useBusinessSettings();

  const {
    data: products = [],
    isLoading: isProductsLoading,
    isFetching: isProductsFetching,
  } = useProducts();
  const selectedProduct = products.find(p => p.id === selectedProductId);

  const {
    data: variants = [],
    isLoading: isVariantsLoading,
    isFetching: isVariantsFetching,
  } = useVariantsByProduct(selectedProductId || "", {
    isActive: true
  });
  const selectedVariant = variants.find(v => v.id === selectedVariantId);

  const calculatorSettings = settings?.calculators?.sales;
  const hideTara = calculatorSettings?.hideTara ?? true;
  const autoFillPrice = calculatorSettings?.autoFillPrice ?? true;

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
  });

  const handleAddToCart = async () => {
    if (!selectedProduct || !selectedVariant || !calculation.isValid || !saleId) {
      return;
    }

    await addItem(saleId, {
      productId: selectedProduct.id,
      variantId: selectedVariant.id,
      productName: selectedProduct.name,
      variantName: selectedVariant.name,
      quantity: calculation.quantity.toString(),
      unitPrice: calculation.unitPrice.toString(),
      subtotal: calculation.subtotal.toString(),
      isModified: false,
    });

    navigate(returnPath || getSaleEditorPath(saleId));
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
                <div key={index} className="rounded-xl border border-gray-200 p-3 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : products.filter((product) => product.isActive).length === 0 ? (
            <Card className="border-0 rounded-2xl bg-card">
              <CardContent className="p-4 text-sm text-muted-foreground">
                No hay productos activos para vender.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {products.filter(p => p.isActive).map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setSelectedProductId(product.id);
                      setSelectedVariantId(null);
                      handleClear();
                    }}
                    className={cn(
                      "p-3 rounded-xl border-2 text-left transition-colors",
                      selectedProductId === product.id
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-orange-200"
                    )}
                  >
                    <p className="font-medium text-sm">{product.name}</p>
                    <Badge variant="secondary" className="mt-1">
                      {product.unit === "kg" ? "Por kilo" : "Por unidad"}
                    </Badge>
                  </button>
                ))}
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
                  <div key={index} className="rounded-xl border border-gray-200 p-3 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                ))}
              </div>
            ) : variants.length === 0 ? (
              <Card className="border-0 rounded-2xl bg-card">
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
                        "p-3 rounded-xl border-2 text-left transition-colors",
                        selectedVariantId === variant.id
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-orange-200"
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
          <div className="space-y-4 pt-4 border-t">
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
                  onToggleAutoCalculate={() => toggleAutoCalculateField("quantity")}
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
                  onToggleAutoCalculate={() => toggleAutoCalculateField("price")}
                  decimals={2}
                  helperText={selectedVariant?.price ? `Precio base: S/ ${selectedVariant.price}` : undefined}
                />
                <CalculatorInput
                  name="totalAmount"
                  label="Total (S/)"
                  value={values.total}
                  placeholder="0.00"
                  onChange={(value) => setFieldValue("totalAmount", value)}
                  fieldType="total"
                  isAutoCalculateTarget={isFieldAutoCalculated("total")}
                  onToggleAutoCalculate={() => toggleAutoCalculateField("total")}
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
                  onToggleAutoCalculate={() => toggleAutoCalculateField("quantity")}
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
                  onToggleAutoCalculate={() => toggleAutoCalculateField("price")}
                  decimals={2}
                  helperText={selectedVariant?.price ? `Precio base: S/ ${selectedVariant.price}` : undefined}
                />
                <CalculatorInput
                  name="totalAmount"
                  label="Total (S/)"
                  value={values.total}
                  placeholder="0.00"
                  onChange={(value) => setFieldValue("totalAmount", value)}
                  fieldType="total"
                  isAutoCalculateTarget={isFieldAutoCalculated("total")}
                  onToggleAutoCalculate={() => toggleAutoCalculateField("total")}
                  decimals={2}
                />
              </div>
            )}

            {/* Calculation Summary */}
            {calculation.isValid && (
              <div className="p-4 bg-orange-50 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cantidad:</span>
                  <span className="font-medium">
                    {isKgProduct
                      ? `${formatKilos(calculation.quantity)} kg`
                      : `${Math.round(calculation.quantity)} unidades`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Precio unitario:</span>
                  <span className="font-medium">S/ {formatCurrency(calculation.unitPrice)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-orange-200">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-bold text-lg">S/ {formatCurrency(calculation.subtotal)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {selectedVariant && (
        <div className="p-4 border-t border-gray-200 space-y-2">
          <Button
            onClick={handleAddToCart}
            disabled={!isValid}
            className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300"
          >
            Agregar al carrito · S/ {formatCurrency(calculation.subtotal)}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(returnPath || "/ventas")}
            className="w-full h-12 rounded-xl"
          >
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
