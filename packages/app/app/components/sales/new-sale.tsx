import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  CreditCard,
  Wallet,
  Receipt,
  Trash2,
  Package,
  Check,
  Calculator as CalculatorIcon,
  Loader2,
  Pencil,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { CustomerSelect } from "~/components/customers/customer-select";
import { CalculatorInput } from "~/components/calculator/calculator-input";
import { AmountPaidInput } from "~/components/sales/amount-paid-input";
import { useProducts } from "~/hooks/use-products";
import { useVariantsByProduct } from "~/hooks/use-product-variants";
import { useSmartCalculator } from "~/hooks/use-smart-calculator";
import {
  useFinalizeSale,
  useAddSaleItem,
  useRemoveSaleItem,
  useUpdateSaleItem,
} from "~/hooks/use-sales-db";
import { useUpdateSale } from "~/hooks/use-sales";
import {
  getAmountPaidValue,
  getBalanceDue,
  getSaleType,
  useSaleCalculations,
} from "~/hooks/use-sale-calculations";
import { formatCurrency, formatKilos, formatNumber, cn } from "~/lib/utils";
import { saleItemTransformer } from "@avileo/shared";
import type { PaymentMode } from "~/lib/sales/types";
import { useBusinessSettings } from "~/hooks/use-business-settings";
import { getSaleEditorPath } from "~/lib/sales/navigation";
import { useNewSaleContext } from "./new-sale-context";
import { useToast } from "~/hooks/use-toast";
import { useOnline } from "~/hooks/use-online";
import { useProductCategories } from "~/hooks/use-product-categories";

export function CustomerSection() {
  const { saleId, visitaId, sale, items } = useNewSaleContext();
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
          customerId: customer?.id ?? undefined,
        },
      });
    } catch (error) {
      toast.error("Error al seleccionar cliente", {
        description: "No se pudo actualizar el cliente de la venta",
      });
    }
  };

  const customerId = sale?.customerId ?? null;
  // Transform SaleCustomer to the type expected by CustomerSelect
  const customer = sale?.customer
    ? {
        id: sale.customer.id,
        name: sale.customer.name,
        phone: sale.customer.phone,
      }
    : null;

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

function getPaymentModeRequiresCustomerMessage(mode: PaymentMode) {
  if (mode === "a_cuenta") {
    return {
      title: "Selecciona un cliente",
      description:
        "A Cuenta crea una venta a crédito, por eso necesitas asociar un cliente antes de guardar.",
    };
  }

  if (mode === "debe_todo") {
    return {
      title: "Selecciona un cliente",
      description:
        "Debe Todo crea una venta a crédito, por eso necesitas asociar un cliente antes de guardar.",
    };
  }

  return null;
}

export function PaymentModeSection() {
  const { saleId, sale, items } = useNewSaleContext();
  const updateSale = useUpdateSale();
  const { toast } = useToast();

  const calculations = useSaleCalculations(sale, items);
  const [pendingPaymentMode, setPendingPaymentMode] = useState<PaymentMode | null>(null);

  const visiblePaymentMode = pendingPaymentMode ?? sale?.paymentMode;

  // Define callback before guard clause to ensure hooks are always called in same order
  const handleUpdateAmountPaid = useCallback(
    async (amount: string) => {
      if (!saleId) return;

      const amountPaid = parseFloat(amount) || 0;
      const totalAmount = calculations.totalAmount;

      if (amountPaid <= 0 || amountPaid > totalAmount) {
        toast.error("Monto inválido", {
          description: `El adelanto debe ser mayor a S/ 0 y menor o igual a S/ ${formatCurrency(totalAmount)}.`,
        });
        return;
      }

      try {
        await updateSale.mutateAsync({
          id: saleId,
          input: {
            paymentMode: "a_cuenta",
            saleType: "credito",
            totalAmount,
            amountPaid,
          },
        });

        setPendingPaymentMode(null);
      } catch (error) {
        toast.error("Error al guardar adelanto", {
          description:
            error instanceof Error
              ? error.message
              : "No se pudo actualizar el monto pagado",
        });
      }
    },
    [saleId, calculations.totalAmount, updateSale, toast]
  );

  // Guard clause: ensure we have required data before rendering
  // Note: Must be after all hook calls to maintain hook order consistency
  if (!saleId || items.length === 0) {
    return null;
  }

  const handleSetPaymentMode = async (mode: PaymentMode) => {
    if (!saleId) return;

    const totalAmountNum = calculations.totalAmount;
    const nextSaleType = getSaleType(mode);
    const requiresCustomer = nextSaleType === "credito";

    if (requiresCustomer && !sale?.customerId) {
      const message = getPaymentModeRequiresCustomerMessage(mode);

      toast.error(message?.title ?? "Selecciona un cliente", {
        description:
          message?.description ??
          "Las ventas a crédito necesitan un cliente asociado.",
      });

      return;
    }

    if (mode === "a_cuenta") {
      setPendingPaymentMode("a_cuenta");
      toast.info("Ingresa el adelanto", {
        description: "El monto debe ser mayor a S/ 0 y menor o igual al total.",
      });
      return;
    }

    const amountPaidNum = getAmountPaidValue(
      mode,
      totalAmountNum,
      sale?.amountPaid || "0",
    );
    const nextBalanceDue = getBalanceDue(
      nextSaleType,
      totalAmountNum,
      amountPaidNum,
    );

    try {
      setPendingPaymentMode(null);

      await updateSale.mutateAsync({
        id: saleId,
        input: {
          paymentMode: mode,
          saleType: nextSaleType,
          totalAmount: totalAmountNum,
          amountPaid: amountPaidNum,
          balanceDue: nextBalanceDue,
        },
      });
    } catch (error) {
      toast.error("Error al cambiar modo de pago", {
        description:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el modo de pago",
      });
    }
  };

  return (
    <Card className="rounded-[26px] border-0 bg-transparent shadow-none">
      <CardContent className="space-y-3 px-0 py-1">
        <div className="space-y-2">
          {paymentModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => handleSetPaymentMode(mode.value)}
              disabled={updateSale.isPending}
              className={cn(
                "w-full flex items-center gap-3 rounded-[20px] border-0 p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                visiblePaymentMode === mode.value
                  ? "bg-orange-500/12"
                  : "bg-white/[0.045] hover:bg-white/[0.07]",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl",
                  visiblePaymentMode === mode.value
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-white/[0.06] text-muted-foreground",
                )}
              >
                {mode.icon}
              </div>
              <div className="flex-1">
                <p
                  className={cn(
                    "font-medium",
                    visiblePaymentMode === mode.value && "text-orange-300",
                  )}
                >
                  {mode.label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {mode.description}
                </p>
              </div>
              {visiblePaymentMode === mode.value && (
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {visiblePaymentMode === "a_cuenta" && saleId && (
          <AmountPaidInput
            saleId={saleId}
            totalAmount={calculations.totalAmount}
            initialAmount={sale?.paymentMode === "a_cuenta" ? sale?.amountPaid || "" : ""}
            onUpdate={handleUpdateAmountPaid}
          />
        )}

        {pendingPaymentMode === "a_cuenta" && (
          <p className="rounded-2xl bg-orange-500/10 px-3 py-2 text-sm text-orange-700 dark:text-orange-300">
            Ingresa el adelanto para guardar este modo de pago.
          </p>
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

function CartItemRow({
  itemId,
  productUnit,
}: {
  itemId: string;
  productUnit?: string;
}) {
  const navigate = useNavigate();
  const { saleId, items, setEditingItemId } = useNewSaleContext();
  const removeItem = useRemoveSaleItem();

  const item = items.find((i) => i.id === itemId);
  if (!item) return null;

  const quantity = parseFloat(item.quantity ?? "0");
  const quantityLabel =
    productUnit === "unidad"
      ? `${Math.round(quantity)} unidades`
      : `${formatKilos(quantity)} kg`;

  const handleEdit = () => {
    setEditingItemId(item.id);
    navigate(`/ventas/${saleId}/editar/calculadora?itemId=${item.id}`);
  };

  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-white/[0.055] p-3.5 transition-colors hover:bg-white/[0.075]">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500/12">
        <Package className="h-5 w-5 text-orange-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.productName}</p>
        <p className="text-sm text-muted-foreground">
          {item.variantName} · {quantityLabel} × S/{" "}
          {formatCurrency(parseFloat(item.unitPrice ?? "0"))}
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
        className="flex-shrink-0 rounded-2xl text-muted-foreground hover:bg-white/[0.08] hover:text-orange-500"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => removeItem.mutate({ saleId: saleId!, itemId: item.id })}
        className="flex-shrink-0 rounded-2xl text-muted-foreground hover:bg-white/[0.08] hover:text-destructive"
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
  const { items } = useNewSaleContext();
  const { data: products = [] } = useProducts();
  const productUnitById = useMemo(
    () => new Map(products.map((product) => [product.id, product.unit])),
    [products],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="rounded-[26px] border-0 bg-transparent shadow-none">
      <CardHeader className="px-0 pb-2">
        <CardTitle className="text-base">Productos ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-0">
        {items.map((item) => (
          <CartItemRow
            key={item.id}
            itemId={item.id}
            productUnit={productUnitById.get(item.productId)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================
// Sale Summary Card Component
// ============================================

export function SaleSummaryCard() {
  const { sale, items } = useNewSaleContext();

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
  const { saleId, returnTo, sale, items } = useNewSaleContext();
  const { toast } = useToast();
  const finalizeSale = useFinalizeSale();
  const { isOnline } = useOnline();

  const calculations = useSaleCalculations(sale, items);

  // Check if we're in delivery mode (confirmed pre_order)
  const isDeliveryMode = sale?.type === "pre_order" && sale?.status === "confirmed";

  const handleSubmit = async () => {
    if (!calculations.canSubmit || !saleId || !sale) return;

    if (!isOnline) {
      toast.error("Necesitas conexión a internet para confirmar la venta.");
      return;
    }

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
    <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-0 right-0 bg-background/86 px-4 py-3 z-50 backdrop-blur-xl">
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
          disabled={!calculations.canSubmit || finalizeSale.isPending || !isOnline}
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
  onActionsChange?: (actions: CalculatorFooterActions | null) => void;
}

export interface CalculatorFooterActions {
  primaryLabel: string;
  secondaryLabel: string;
  isPrimaryDisabled: boolean;
  onPrimaryAction: () => void | Promise<void>;
  onSecondaryAction: () => void;
}

export function CalculatorContent({
  returnPath,
  onActionsChange,
}: CalculatorContentProps) {
  const navigate = useNavigate();
  const { saleId, items: saleItems, editingItemId, setEditingItemId } = useNewSaleContext();

  const editingItem = editingItemId ? saleItems.find((i) => i.id === editingItemId) : null;
  const isEditMode = !!editingItem;

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");

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
  const { data: categories = [] } = useProductCategories();
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const activeProducts = useMemo(
    () => products.filter((product) => product.isActive),
    [products],
  );
  const showProductDiscovery = activeProducts.length > 8;
  const filteredProducts = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase();

    return activeProducts.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch);
      const matchesFilter =
        productFilter === "all" ||
        product.unit === productFilter ||
        (productFilter === "uncategorized"
          ? product.categoryId === null
          : product.categoryId === productFilter);

      return matchesSearch && matchesFilter;
    });
  }, [activeProducts, productFilter, productSearch]);

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

  const editingInitialValues = isEditMode && editingItem 
    ? {
        quantity: saleItemTransformer.toForm(editingItem).quantity || "",
        unitPrice: saleItemTransformer.toForm(editingItem).unitPrice || "",
        subtotal: saleItemTransformer.toForm(editingItem).subtotal || "",
      }
    : undefined;

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

    // Reset form with editing item values (ya transformados por saleItemTransformer)
    const values = saleItemTransformer.toForm(editingItem);

    if (isKgProduct) {
      form.reset({
        totalAmount: values.subtotal || "",
        pricePerKg: values.unitPrice || "",
        kilos: values.quantity || "",
        tara: "0",
        pricePerPack: "",
        packs: "",
        units: "",
      });
    } else {
      form.reset({
        totalAmount: values.subtotal || "",
        pricePerKg: "",
        kilos: "",
        tara: "0",
        pricePerPack: values.unitPrice || "",
        packs: values.quantity || "",
        units: "",
      });
    }
  }, [isEditMode, editingItem, selectedProduct, selectedVariant, isKgProduct, form]);

  const handleSave = useCallback(async () => {
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
        const numericCalculation = saleItemTransformer.toNumbers(calculation);
        await updateItem.mutateAsync({
          saleId,
          itemId: editingItem.id,
          data: {
            quantity: numericCalculation.quantity ?? 0,
            unitPrice: numericCalculation.unitPrice ?? 0,
            subtotal: numericCalculation.subtotal ?? 0,
          },
        });
        setEditingItemId(null);
      } else {
        // Add new item
        const numericCalculation = saleItemTransformer.toNumbers(calculation);
        await addItem.mutateAsync({
          saleId,
          item: {
            productId: selectedProduct.id,
            variantId: selectedVariant.id,
            quantity: numericCalculation.quantity ?? 0,
            price: numericCalculation.unitPrice ?? 0,
            subtotal: numericCalculation.subtotal ?? 0,
          },
        });
      }

      navigate(returnPath ?? getSaleEditorPath(saleId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo agregar el producto";
      toast.error("Error al agregar producto", {
        description: message,
      });
    }
  }, [
    addItem,
    calculation.isValid,
    calculation.quantity,
    calculation.subtotal,
    calculation.unitPrice,
    editingItem,
    isEditMode,
    navigate,
    returnPath,
    saleId,
    selectedProduct,
    selectedVariant,
    setEditingItemId,
    toast,
    updateItem,
  ]);

  const handleCancel = useCallback(() => {
    setEditingItemId(null);
    navigate(returnPath || getSaleEditorPath(saleId!));
  }, [navigate, returnPath, saleId, setEditingItemId]);

  const calculatorActions = useMemo<CalculatorFooterActions | null>(() => {
    if (!selectedVariant) {
      return null;
    }

    return {
      primaryLabel: isEditMode
        ? `Actualizar · S/ ${formatCurrency(calculation.subtotal)}`
        : `Agregar al carrito · S/ ${formatCurrency(calculation.subtotal)}`,
      secondaryLabel: "Cancelar",
      isPrimaryDisabled: !isValid || updateItem.isPending || addItem.isPending,
      onPrimaryAction: handleSave,
      onSecondaryAction: handleCancel,
    };
  }, [
    addItem.isPending,
    calculation.subtotal,
    handleCancel,
    handleSave,
    isEditMode,
    isValid,
    selectedVariant,
    updateItem.isPending,
  ]);

  useEffect(() => {
    onActionsChange?.(calculatorActions);

    return () => {
      onActionsChange?.(null);
    };
  }, [calculatorActions, onActionsChange]);

  return (
    <div className="flex flex-col h-full">
      {/* Product Selection */}
      <div
        className={cn(
          "flex-1 overflow-y-auto p-4 space-y-5",
          selectedVariant && "pb-40",
        )}
      >
        {/* Product Selector */}
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <label className="text-sm font-semibold text-white/95">
                Producto
              </label>
              <p className="text-xs text-white/55">
                {activeProducts.length} disponibles
              </p>
            </div>
            {isProductsFetching && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Actualizando
              </div>
            )}
          </div>

          {showProductDiscovery && (
            <div className="sticky top-0 z-10 -mx-1 space-y-2 bg-[#11131a]/96 px-1 py-2 backdrop-blur-xl">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                <Input
                  data-testid="sale-product-search-input"
                   value={productSearch}
                   onChange={(event) => setProductSearch(event.target.value)}
                   placeholder="Buscar producto..."
                  className="h-11 rounded-2xl border-white/10 bg-white/[0.06] pl-10 pr-3 text-sm text-white shadow-none placeholder:text-white/45 focus:border-orange-500/40 focus:ring-orange-500/20"
                />
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 hide-scrollbar">
                {[
                  { value: "all", label: "Todos" },
                  { value: "kg", label: "Por kilo" },
                  { value: "unidad", label: "Por unidad" },
                  ...categories.map((cat) => ({
                    value: cat.id,
                    label: cat.name,
                  })),
                  { value: "uncategorized", label: "Sin categoría" },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    data-testid="sale-product-filter-chip"
                    type="button"
                    onClick={() => setProductFilter(filter.value)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      productFilter === filter.value
                        ? "border-orange-500/40 bg-orange-500/15 text-orange-300"
                        : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white/90",
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isProductsLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[20px] border border-white/10 bg-[#171922] p-3 space-y-2"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : activeProducts.length === 0 ? (
            <Card className="shell-card-flat rounded-3xl">
              <CardContent className="p-4 text-sm text-muted-foreground">
                No hay productos activos para vender.
              </CardContent>
            </Card>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-center">
              <p className="font-semibold text-white/95">No encontramos productos</p>
              <p className="mt-1 text-sm text-white/55">
                Prueba con otro nombre o cambia el filtro.
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "grid grid-cols-2 gap-2",
                showProductDiscovery && "gap-2.5",
              )}
            >
              {filteredProducts.map((product) => {
                const isInCart = saleItems.some((item) => item.productId === product.id);
                const isSelected = selectedProductId === product.id;

                return (
                  <button
                    key={product.id}
                    data-testid="sale-product-option"
                    type="button"
                    onClick={() => {
                      setSelectedProductId(product.id);
                      setSelectedVariantId(null);
                      handleClear();
                    }}
                    disabled={isInCart}
                    className={cn(
                      "min-h-[86px] rounded-[22px] border p-3 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40",
                      isInCart
                        ? "cursor-not-allowed border-white/8 bg-white/[0.035] opacity-55"
                        : isSelected
                          ? "border-orange-500/50 bg-orange-500/14 shadow-[0_12px_28px_rgba(249,115,22,0.12)]"
                          : "border-white/10 bg-[#171922] hover:border-white/18 hover:bg-[#1d2028]",
                    )}
                  >
                    <div className="flex h-full flex-col justify-between gap-2">
                      <p className="line-clamp-2 text-[15px] font-semibold leading-tight text-white/95">
                        {product.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] font-semibold text-white/65">
                          {product.unit === "kg" ? "Por kilo" : "Por unidad"}
                        </span>
                        {isInCart && (
                          <span className="rounded-full bg-orange-500/12 px-2 py-0.5 text-[11px] font-semibold text-orange-300">
                            Agregado
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Variant Selector */}
        {selectedProduct && (
          <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.035] p-3">
            <div>
              <label className="text-sm font-semibold text-white/95">
                Presentación
              </label>
              <p className="text-xs text-white/55">
                {selectedProduct.name}
              </p>
            </div>
            {isVariantsLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[20px] border border-white/10 bg-[#171922] p-3 space-y-2"
                  >
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                ))}
              </div>
            ) : variants.length === 0 ? (
              <Card className="shell-card-flat rounded-3xl">
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
                        "rounded-[20px] border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40",
                        selectedVariantId === variant.id
                          ? "border-orange-500/50 bg-orange-500/14"
                          : "border-white/10 bg-[#171922] hover:border-white/18 hover:bg-[#1d2028]",
                      )}
                    >
                      <p className="text-sm font-semibold text-white/95">
                        {variant.name}
                      </p>
                      <p className="mt-1 text-sm font-medium text-orange-300">
                        S/ {formatCurrency(variant.price)}
                      </p>
                    </button>
                  ))}
                </div>
                {isVariantsFetching && (
                  <div className="flex items-center gap-2 text-xs text-white/55">
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
          <div className="space-y-4 rounded-[24px] border border-white/10 bg-[#171922] p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/20">
                <CalculatorIcon className="h-5 w-5" />
              </div>
              <div>
                <span className="font-semibold text-white/95">Calculadora</span>
                <p className="text-xs text-white/55">
                  {selectedVariant.name}
                </p>
              </div>
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
              <div className="space-y-2 rounded-[20px] border border-orange-500/20 bg-orange-500/10 p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Cantidad:
                  </span>
                  <span className="font-medium text-white/90">
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
                    <span className="font-medium text-white/90">
                      S/ {formatCurrency(calculation.unitPrice)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-orange-500/20 pt-2">
                  <span className="font-medium text-white/90">Subtotal:</span>
                  <span className="text-lg font-bold text-orange-300">
                    S/ {formatCurrency(calculation.subtotal)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
