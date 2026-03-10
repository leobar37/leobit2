import * as React from "react";
import { useState, useMemo, createContext, useContext } from "react";
import { useNavigate } from "react-router";
import { 
  User, 
  X, 
  CreditCard, 
  Wallet, 
  Receipt, 
  Trash2, 
  ChevronRight,
  Package,
  Check,
  ChevronDown,
  Calculator as CalculatorIcon,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppDrawer } from "~/components/ui/app-drawer";
import { useCustomers } from "~/hooks/use-customers";
import { useProducts } from "~/hooks/use-products";
import { useVariantsByProduct, type ProductVariant } from "~/hooks/use-product-variants";
import { useCalculator } from "~/hooks/use-calculator";
import {
  useDraftSale,
  useCreateDraftSale,
  useUpdateDraftSale,
  useDeleteDraftSale,
  useConfirmSale,
  useSaleItems,
  useAddSaleItem,
  useRemoveSaleItem,
} from "~/hooks/use-sales-db";
import { useSaleCalculations } from "~/hooks/use-sale-calculations";
import { formatCurrency, formatKilos, cn } from "~/lib/utils";
import type { PaymentMode } from "~/lib/sales/types";
import type { Product } from "~/lib/db/schema";

// ============================================
// Context for Selected Draft
// ============================================

interface NewSaleContextType {
  draftId: string | null;
  setDraftId: (id: string | null) => void;
}

const NewSaleContext = createContext<NewSaleContextType | null>(null);

export function NewSaleProvider({ children }: { children: React.ReactNode }) {
  const [draftId, setDraftId] = useState<string | null>(null);
  
  return (
    <NewSaleContext.Provider value={{ draftId, setDraftId }}>
      {children}
    </NewSaleContext.Provider>
  );
}

function useNewSaleContext() {
  const context = useContext(NewSaleContext);
  if (!context) {
    throw new Error("useNewSaleContext must be used within NewSaleProvider");
  }
  return context;
}

// ============================================
// Customer Section Component
// ============================================

export function CustomerSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { draftId } = useNewSaleContext();
  const { data: draft } = useDraftSale(draftId);
  const updateDraft = useUpdateDraftSale();
  
  const { data: customers = [], isLoading } = useCustomers(searchQuery);
  
  const calculations = useSaleCalculations(draft || null, draft?.items || []);

  const handleSelectCustomer = (customer: { id: string; name: string; phone?: string | null }) => {
    if (draftId) {
      updateDraft(draftId, { 
        clientId: customer.id,
        client: customer
      });
    }
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClearCustomer = () => {
    if (draftId) {
      updateDraft(draftId, { clientId: null, client: undefined });
    }
  };

  return (
    <>
      <Card className="border-0 rounded-2xl bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="h-6 w-6 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {draft?.client?.name || "Seleccionar cliente"}
                </p>
                {draft?.client?.phone && (
                  <p className="text-sm text-muted-foreground truncate">{draft.client.phone}</p>
                )}
                {!draft?.client && calculations.requiresCustomer && (
                  <p className="text-sm text-orange-600">Requerido para venta a crédito</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {draft?.client && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearCustomer}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(true)}
                className={cn(isOpen && "bg-orange-100")}
              >
                <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AppDrawer open={isOpen} onOpenChange={setIsOpen} size="large">
        <AppDrawer.Header
          title="Seleccionar cliente"
          icon={<User className="h-5 w-5" />}
          onClose={() => setIsOpen(false)}
        />

        <AppDrawer.Body className="space-y-3">
          <Input
            placeholder="Buscar cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl"
          />

          <div className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Cargando clientes...
              </p>
            ) : customers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No se encontraron clientes
              </p>
            ) : (
              customers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-orange-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{customer.name}</p>
                    {customer.phone && (
                      <p className="text-sm text-muted-foreground truncate">{customer.phone}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </AppDrawer.Body>
      </AppDrawer>
    </>
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
  const { draftId } = useNewSaleContext();
  const { data: draft } = useDraftSale(draftId);
  const { data: items = [] } = useSaleItems(draftId);
  const updateDraft = useUpdateDraftSale();
  
  const calculations = useSaleCalculations(draft || null, items);

  const handleSetPaymentMode = (mode: PaymentMode) => {
    if (draftId) {
      updateDraft(draftId, { paymentMode: mode });
    }
  };

  const handleSetAmountPaid = (amount: string) => {
    if (draftId) {
      updateDraft(draftId, { amountPaid: amount });
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
                draft?.paymentMode === mode.value
                  ? "bg-orange-100 border-2 border-orange-500"
                  : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                draft?.paymentMode === mode.value ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-600"
              )}>
                {mode.icon}
              </div>
              <div className="flex-1">
                <p className={cn("font-medium", draft?.paymentMode === mode.value && "text-orange-900")}>
                  {mode.label}
                </p>
                <p className="text-sm text-muted-foreground">{mode.description}</p>
              </div>
              {draft?.paymentMode === mode.value && (
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {draft?.paymentMode === "a_cuenta" && (
          <div className="space-y-3 pt-2 border-t">
            <label className="text-sm font-medium">Monto pagado (S/)</label>
            <Input
              type="number"
              placeholder="0.00"
              value={draft?.amountPaid || ""}
              onChange={(e) => handleSetAmountPaid(e.target.value)}
              className={cn(
                "text-lg rounded-xl",
                !calculations.hasValidPartial && draft?.amountPaid && "border-red-500 focus-visible:ring-red-500"
              )}
            />
            {!calculations.hasValidPartial && draft?.amountPaid && (
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

        {draft?.paymentMode === "debe_todo" && calculations.totalAmount > 0 && (
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

function CartItemRow({ itemId, index }: { itemId: string; index: number }) {
  const { draftId } = useNewSaleContext();
  const { data: items = [] } = useSaleItems(draftId);
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
          {item.variantName} · {formatKilos(parseFloat(item.quantity))} kg × S/ {formatCurrency(parseFloat(item.unitPrice))}
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
  const { draftId } = useNewSaleContext();
  const { data: items = [] } = useSaleItems(draftId);

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 rounded-2xl bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Productos ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, index) => (
          <CartItemRow key={item.id} itemId={item.id} index={index} />
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================
// Sale Summary Card Component
// ============================================

export function SaleSummaryCard() {
  const { draftId } = useNewSaleContext();
  const { data: draft } = useDraftSale(draftId);
  const { data: items = [] } = useSaleItems(draftId);
  
  const calculations = useSaleCalculations(draft || null, items);

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

        {draft?.paymentMode === "a_cuenta" && (
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

        {draft?.paymentMode === "debe_todo" && (
          <div className="flex justify-between items-center pt-2 border-t border-orange-400">
            <span className="text-orange-100">Total a deber:</span>
            <span className="font-bold">S/ {formatCurrency(calculations.totalAmount)}</span>
          </div>
        )}

        {!calculations.canSubmit && (
          <div className="p-2 bg-white/20 rounded-lg text-sm text-center">
            {items.length === 0 
              ? "Agrega productos para continuar"
              : calculations.requiresCustomer && !draft?.client
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
  const { draftId, setDraftId } = useNewSaleContext();
  const { data: draft } = useDraftSale(draftId);
  const { data: items = [] } = useSaleItems(draftId);
  const deleteDraft = useDeleteDraftSale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const calculations = useSaleCalculations(draft || null, items);

  const handleSubmit = async () => {
    if (!calculations.canSubmit || !draftId) return;
    
    setIsSubmitting(true);
    
    try {
      // TODO: Convert draft to actual sale via API
      // const saleData = {
      //   clientId: draft?.clientId,
      //   saleType: calculations.saleType,
      //   totalAmount: calculations.totalAmount,
      //   amountPaid: calculations.amountPaidValue,
      //   balanceDue: calculations.balanceDue,
      //   items: items.map(item => ({
      //     productId: item.productId,
      //     variantId: item.variantId,
      //     productName: item.productName,
      //     variantName: item.variantName,
      //     quantity: parseFloat(item.quantity),
      //     unitPrice: parseFloat(item.unitPrice),
      //     subtotal: parseFloat(item.subtotal),
      //   })),
      // };
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Delete draft and navigate
      await deleteDraft(draftId);
      setDraftId(null);
      navigate("/ventas");
    } catch (error) {
      console.error("Failed to submit sale:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-orange-100 p-4 pb-safe">
      <Button
        onClick={handleSubmit}
        disabled={!calculations.canSubmit || isSubmitting}
        className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300"
      >
        {isSubmitting ? (
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

export function CalculatorContent({ returnPath = "/ventas/nueva" }: CalculatorContentProps) {
  const navigate = useNavigate();
  const { draftId, setDraftId } = useNewSaleContext();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  
  const createDraft = useCreateDraftSale();
  const addItem = useAddSaleItem();
  const { data: draft } = useDraftSale(draftId);
  
  const { data: products = [] } = useProducts();
  const selectedProduct = products.find(p => p.id === selectedProductId);
  
  const { data: variants = [] } = useVariantsByProduct(selectedProductId || "", { 
    isActive: true 
  });
  const selectedVariant = variants.find(v => v.id === selectedVariantId);

  const {
    form,
    isValid,
    isKgProduct,
    calculation,
    handleClear,
  } = useCalculator({
    product: selectedProduct,
    variant: selectedVariant,
    autoFillPrice: true,
  });

  const handleAddToCart = async () => {
    if (!selectedProduct || !selectedVariant || !calculation.isValid) return;

    // Create draft if doesn't exist
    let currentDraftId = draftId;
    if (!currentDraftId) {
      // TODO: Get actual sellerId and businessId from auth context
      const newDraft = await createDraft({
        businessId: "temp-business-id", // TODO: Get from context
        sellerId: "temp-seller-id", // TODO: Get from context
        paymentMode: "pago_total",
      });
      currentDraftId = newDraft.id;
      setDraftId(currentDraftId);
    }

    await addItem({
      draftSaleId: currentDraftId,
      productId: selectedProduct.id,
      variantId: selectedVariant.id,
      productName: selectedProduct.name,
      variantName: selectedVariant.name,
      quantity: calculation.quantity.toString(),
      unitPrice: calculation.unitPrice.toString(),
      subtotal: calculation.subtotal.toString(),
    });
    
    if (returnPath) {
      navigate(returnPath);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Product Selection */}
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Product Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Producto</label>
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
        </div>

        {/* Variant Selector */}
        {selectedProduct && variants.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Presentación</label>
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
                <div>
                  <label className="text-sm text-muted-foreground">Tara (kg)</label>
                  <Input
                    {...form.register("tara")}
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Kilos netos</label>
                  <Input
                    {...form.register("kilos")}
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Precio por kg (S/)</label>
                  <Input
                    {...form.register("pricePerKg")}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Total (S/)</label>
                  <Input
                    {...form.register("totalAmount")}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="rounded-xl"
                  />
                </div>
              </div>
            ) : (
              // Unit Product Calculator
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Packs</label>
                    <Input
                      {...form.register("packs")}
                      type="number"
                      placeholder="0"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Unidades sueltas</label>
                    <Input
                      {...form.register("units")}
                      type="number"
                      placeholder="0"
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Precio por pack (S/)</label>
                  <Input
                    {...form.register("pricePerPack")}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Total (S/)</label>
                  <Input
                    {...form.register("totalAmount")}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="rounded-xl"
                  />
                </div>
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
            onClick={() => navigate(returnPath)}
            className="w-full h-12 rounded-xl"
          >
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main New Sale Component (Legacy export)
// ============================================

export function NewSale() {
  return null;
}
