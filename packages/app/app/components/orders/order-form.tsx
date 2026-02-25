import { useState, useMemo } from "react";
import { Plus, Trash2, Package, Calendar, CreditCard, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerSearch } from "@/components/sales/customer-search";
import { VariantSelector } from "@/components/sales/variant-selector";
import { useChickenCalculator } from "~/hooks/use-chicken-calculator";
import type { Customer } from "~/lib/db/schema";
import type { Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";

interface OrderItem {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  orderedQuantity: number;
  unitPriceQuoted: number;
}

interface OrderFormProps {
  onSubmit: (data: {
    clientId: string;
    deliveryDate: string;
    paymentIntent: "contado" | "credito";
    totalAmount: number;
    items: OrderItem[];
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function OrderForm({ onSubmit, onCancel, isSubmitting }: OrderFormProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentIntent, setPaymentIntent] = useState<"contado" | "credito">("contado");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  
  // Selected product/variant for calculator
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  // Calculator hook for kg-based calculations
  const calculator = useChickenCalculator({
    productPrice: selectedVariant?.price,
    productId: selectedProduct?.id,
    variantId: selectedVariant?.id,
    unitType: selectedProduct?.unit === "kg" ? "kg" : "unidad",
  });

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + item.orderedQuantity * item.unitPriceQuoted;
    }, 0);
  }, [items]);

  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const handleVariantSelect = (product: Product, variant: ProductVariant) => {
    setSelectedProduct(product);
    setSelectedVariant(variant);
    setShowVariantSelector(false);
    setShowItemForm(true);
    calculator.handleReset();
  };

  const handleAddItem = () => {
    if (!selectedProduct || !selectedVariant) return;

    const isKgProduct = selectedProduct.unit === "kg";
    
    let quantity: number;
    let unitPrice: number;
    let total: number;

    if (isKgProduct) {
      // Use calculator values for kg products
      quantity = calculator.kgNeto;
      unitPrice = parseFloat(calculator.values.pricePerKg) || 0;
      total = parseFloat(calculator.values.totalAmount) || 0;
    } else {
      // For unit-based products, use simple inputs or calculator
      quantity = calculator.kgNeto || 1;
      unitPrice = parseFloat(calculator.values.pricePerKg) || parseFloat(selectedVariant.price);
      total = parseFloat(calculator.values.totalAmount) || (quantity * unitPrice);
    }

    if (quantity <= 0 || unitPrice <= 0 || total <= 0) return;

    const item: OrderItem = {
      productId: selectedProduct.id,
      variantId: selectedVariant.id,
      productName: selectedProduct.name,
      variantName: selectedVariant.name,
      orderedQuantity: quantity,
      unitPriceQuoted: unitPrice,
    };

    setItems([...items, item]);
    setShowItemForm(false);
    setSelectedProduct(null);
    setSelectedVariant(null);
    calculator.handleReset();
  };

  const handleCancelItem = () => {
    setShowItemForm(false);
    setSelectedProduct(null);
    setSelectedVariant(null);
    calculator.handleReset();
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!selectedCustomer || !deliveryDate || items.length === 0) return;

    onSubmit({
      clientId: selectedCustomer.id,
      deliveryDate,
      paymentIntent,
      totalAmount,
      items,
    });
  };

  const isValid = selectedCustomer && deliveryDate && items.length > 0;

  const isKgProduct = selectedProduct?.unit === "kg";

  return (
    <div className="space-y-6">
      {/* Customer Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Cliente
        </Label>
        <CustomerSearch
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
        />
      </div>

      {/* Delivery Date */}
      <div className="space-y-2">
        <Label htmlFor="deliveryDate" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Fecha de entrega
        </Label>
        <Input
          id="deliveryDate"
          type="date"
          min={getTomorrow()}
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          className="rounded-xl"
        />
        <p className="text-xs text-muted-foreground">
          La fecha de entrega debe ser desde mañana
        </p>
      </div>

      {/* Payment Intent */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Forma de pago
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={paymentIntent === "contado" ? "default" : "outline"}
            onClick={() => setPaymentIntent("contado")}
            className="flex-1 rounded-xl"
          >
            Contado
          </Button>
          <Button
            type="button"
            variant={paymentIntent === "credito" ? "default" : "outline"}
            onClick={() => setPaymentIntent("credito")}
            className="flex-1 rounded-xl"
          >
            Crédito
          </Button>
        </div>
      </div>

      {/* Items Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Items del pedido
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowVariantSelector(true)}
            className="rounded-xl"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        </div>

        {/* Items List */}
        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item, index) => (
              <Card key={index} className="border-0 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.variantName} · {item.orderedQuantity.toFixed(3)} unidades
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">
                        S/ {(item.orderedQuantity * item.unitPriceQuoted).toFixed(2)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Item Form with Calculator */}
        {showItemForm && selectedProduct && selectedVariant && (
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 space-y-4">
              {/* Product Info */}
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Package className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedVariant.name} · S/ {selectedVariant.price} / {selectedProduct.unit}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowItemForm(false);
                    setShowVariantSelector(true);
                  }}
                >
                  Cambiar
                </Button>
              </div>

              {/* Calculator for kg products */}
              {isKgProduct ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Kilos brutos</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.000"
                        value={calculator.values.kilos}
                        onChange={(e) => calculator.handleChange("kilos", e.target.value)}
                        onFocus={() => calculator.setActiveField("kilos")}
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Tara (kg)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={calculator.values.tara}
                        onChange={(e) => calculator.handleChange("tara", e.target.value)}
                        onFocus={() => calculator.setActiveField("tara")}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-3 py-2 bg-orange-50 rounded-xl">
                    <span className="text-sm text-orange-700">Kilos netos:</span>
                    <span className="font-semibold text-orange-700">
                      {calculator.kgNeto.toFixed(3)} kg
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Precio por kg</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={calculator.values.pricePerKg}
                        onChange={(e) => calculator.handleChange("pricePerKg", e.target.value)}
                        onFocus={() => calculator.setActiveField("pricePerKg")}
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Total</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={calculator.values.totalAmount}
                        onChange={(e) => calculator.handleChange("totalAmount", e.target.value)}
                        onFocus={() => calculator.setActiveField("totalAmount")}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  {calculator.filledCount >= 2 && (
                    <Badge variant="secondary" className="w-full justify-center py-1">
                      Calculado automáticamente
                    </Badge>
                  )}
                </div>
              ) : (
                /* Simple inputs for unit-based products */
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Cantidad</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={calculator.values.kilos}
                      onChange={(e) => calculator.handleChange("kilos", e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Precio unitario</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={calculator.values.pricePerKg}
                      onChange={(e) => calculator.handleChange("pricePerKg", e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm">Total</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={calculator.values.totalAmount}
                      onChange={(e) => calculator.handleChange("totalAmount", e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelItem}
                  className="flex-1 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!calculator.isReady}
                  className="flex-1 rounded-xl"
                >
                  Agregar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Total */}
      <Card className="border-0 shadow-md bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-orange-100">Total del pedido</span>
            <span className="text-2xl font-bold">S/ {totalAmount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 rounded-xl h-12"
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className="flex-1 rounded-xl h-12"
        >
          {isSubmitting ? "Guardando..." : "Crear pedido"}
        </Button>
      </div>

      {/* Variant Selector Drawer */}
      <VariantSelector
        open={showVariantSelector}
        onOpenChange={setShowVariantSelector}
        onSelect={handleVariantSelect}
      />
    </div>
  );
}
