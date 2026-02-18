import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  ShoppingCart,
  Box,
  Package,
  Plus,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CustomerSearch } from "~/components/sales/customer-search";
import { SaleCartItem } from "~/components/sales/sale-cart-item";
import { VariantSelector } from "~/components/sales/variant-selector";
import {
  getPersistedCalculatorSelection,
  useChickenCalculator,
  type CalculatorPersistence,
} from "~/hooks/use-chicken-calculator";
import { useCreateSale } from "~/hooks/use-sales";
import type { Customer, Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";
import { useProducts } from "~/hooks/use-products-live";
import { useVariantsByProduct } from "~/hooks/use-product-variants";

interface CartItem {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export default function NewSalePage() {
  const navigate = useNavigate();
  const createSale = useCreateSale();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [saleType, setSaleType] = useState<"contado" | "credito">("contado");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [persistedSelection, setPersistedSelection] =
    useState<CalculatorPersistence | null>(null);

  const { data: products } = useProducts();
  const restoreProductId = selectedProduct?.id || persistedSelection?.lastProductId || "";
  const { data: restoreVariants } = useVariantsByProduct(restoreProductId, {
    isActive: true,
  });

  useEffect(() => {
    setPersistedSelection(getPersistedCalculatorSelection());
  }, []);

  useEffect(() => {
    if (selectedProduct || !persistedSelection?.lastProductId || !products?.length) {
      return;
    }

    const persistedProduct = products.find(
      (product) => product.id === persistedSelection.lastProductId && product.isActive,
    );

    if (persistedProduct) {
      setSelectedProduct(persistedProduct);
    }
  }, [products, persistedSelection, selectedProduct]);

  useEffect(() => {
    if (!selectedProduct || selectedVariant || !restoreVariants?.length) {
      return;
    }

    const activeVariants = restoreVariants.filter((variant) => variant.isActive);
    if (activeVariants.length === 0) {
      return;
    }

    const preferredVariant =
      activeVariants.find(
        (variant) => variant.id === persistedSelection?.lastVariantId,
      ) || activeVariants[0];

    setSelectedVariant(preferredVariant);
  }, [persistedSelection?.lastVariantId, restoreVariants, selectedProduct, selectedVariant]);

  const {
    values,
    kgNeto,
    handleReset,
    handleChange,
    persistSelection,
  } = useChickenCalculator({
    productPrice: selectedVariant?.price,
    productId: selectedProduct?.id,
    variantId: selectedVariant?.id,
    persist: true,
  });

  const totalAmount = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalNeto = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const balanceDue =
    saleType === "credito" ? totalAmount - (parseFloat(amountPaid) || 0) : 0;

  const handleVariantSelect = (product: Product, variant: ProductVariant) => {
    setSelectedProduct(product);
    setSelectedVariant(variant);
    persistSelection(product.id, variant.id, variant.price);
    setShowVariantSelector(false);
    handleReset();
  };

  const handleAddFromCalculator = () => {
    if (!selectedProduct || !selectedVariant) return;

    const unitPrice = parseFloat(values.pricePerKg || selectedVariant.price || "0");
    if (kgNeto <= 0 || unitPrice <= 0) return;

    const subtotal = parseFloat(values.totalAmount || (kgNeto * unitPrice).toFixed(2));
    const existingIndex = cartItems.findIndex(
      (item) =>
        item.productId === selectedProduct.id && item.variantId === selectedVariant.id,
    );

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += kgNeto;
      updated[existingIndex].unitPrice = unitPrice;
      updated[existingIndex].subtotal =
        updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          productId: selectedProduct.id,
          variantId: selectedVariant.id,
          productName: selectedProduct.name,
          variantName: selectedVariant.name,
          quantity: kgNeto,
          unitPrice,
          subtotal,
        },
      ]);
    }

    persistSelection(selectedProduct.id, selectedVariant.id, values.pricePerKg);
    handleReset();
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (cartItems.length === 0) return;

    try {
      await createSale.mutateAsync({
        clientId: selectedCustomer?.id,
        saleType,
        totalAmount,
        amountPaid: saleType === "credito" ? parseFloat(amountPaid) || 0 : totalAmount,
        netWeight: totalNeto || undefined,
        items: cartItems,
      });
      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating sale:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center gap-3 h-16 px-3 sm:px-4">
          <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-orange-50">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold text-lg">Nueva Venta</h1>
        </div>
      </header>

      <main className="px-3 py-4 sm:px-4 pb-32 space-y-4">
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Cliente</h2>
          <CustomerSearch
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
          />
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Tipo de Venta</h2>
          <div className="flex gap-2">
            <Button
              variant={saleType === "contado" ? "default" : "outline"}
              onClick={() => setSaleType("contado")}
              className={cn(
                "flex-1 rounded-xl",
                saleType === "contado" && "bg-orange-500 hover:bg-orange-600",
              )}
            >
              Contado
            </Button>
            <Button
              variant={saleType === "credito" ? "default" : "outline"}
              onClick={() => setSaleType("credito")}
              className={cn(
                "flex-1 rounded-xl",
                saleType === "credito" && "bg-orange-500 hover:bg-orange-600",
              )}
            >
              Credito
            </Button>
          </div>
        </section>

        <section id="calculator-section" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Calcular Producto</h2>
            {selectedVariant && (
              <Badge variant="secondary" className="text-xs">
                {selectedProduct?.name} - {selectedVariant.name}
              </Badge>
            )}
          </div>

          {!selectedVariant ? (
            <Card className="border-0 shadow-md rounded-2xl bg-muted/50">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Selecciona un producto para comenzar
                </p>
                <Button
                  onClick={() => setShowVariantSelector(true)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Seleccionar Producto
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-md rounded-2xl">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedProduct?.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedVariant.name}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVariantSelector(true)}
                  >
                    Cambiar
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Total (S/)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={values.totalAmount}
                      onChange={(e) => handleChange("totalAmount", e.target.value)}
                      placeholder="0.00"
                      className="rounded-xl text-lg"
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Precio/kg (S/)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={values.pricePerKg}
                      onChange={(e) => handleChange("pricePerKg", e.target.value)}
                      placeholder="0.00"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Bruto (kg)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={values.kilos}
                      onChange={(e) => handleChange("kilos", e.target.value)}
                      placeholder="0.000"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tara (kg)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={values.tara}
                      onChange={(e) => handleChange("tara", e.target.value)}
                      placeholder="0"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {(!!values.kilos || !!values.totalAmount) && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase">Neto</p>
                        <p className="text-lg font-bold text-orange-600">
                          {kgNeto.toFixed(3)} kg
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase">Total</p>
                        <p className="text-lg font-bold text-green-600">
                          S/ {values.totalAmount || "0.00"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Button
                    onClick={handleAddFromCalculator}
                    disabled={kgNeto <= 0 || !values.pricePerKg || (!values.kilos && !values.totalAmount)}
                    className="w-full bg-orange-500 hover:bg-orange-600 h-12"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar al Carrito
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="flex-1 rounded-xl"
                      size="sm"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Limpiar Peso
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowVariantSelector(true)}
                      className="flex-1 rounded-xl"
                      size="sm"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Otro Producto
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        <section>
          <Button
            variant="outline"
            onClick={() => setShowVariantSelector(true)}
            className="w-full h-auto py-4 rounded-xl justify-start"
          >
            <Box className="h-5 w-5 mr-3 text-orange-500" />
            <div className="text-left">
              <p className="font-medium">Seleccionar Producto y Variante</p>
              <p className="text-xs text-muted-foreground">
                La primera variante activa se selecciona automaticamente
              </p>
            </div>
          </Button>
        </section>

        {cartItems.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">
              Carrito ({cartItems.length} items)
            </h2>
            <div className="space-y-2">
              {cartItems.map((item, index) => (
                <SaleCartItem
                  key={`${item.productId}-${item.variantId}-${index}`}
                  productName={item.productName}
                  variantName={item.variantName}
                  quantity={item.quantity}
                  unitPrice={item.unitPrice}
                  subtotal={item.subtotal}
                  onRemove={() => handleRemoveFromCart(index)}
                />
              ))}
            </div>
          </section>
        )}

        {cartItems.length > 0 && (
          <Card className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-orange-100">Total</span>
                <span className="text-2xl font-bold">S/ {totalAmount.toFixed(2)}</span>
              </div>

              {saleType === "credito" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-orange-100">Monto pagado</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="rounded-xl bg-white/20 border-white/30 text-white placeholder:text-white/50"
                      placeholder="0.00"
                    />
                  </div>

                  {balanceDue > 0 && (
                    <div className="flex items-center justify-between text-orange-100">
                      <span>Saldo pendiente</span>
                      <span>S/ {balanceDue.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 px-3 sm:px-4 py-4 bg-white border-t border-orange-100">
          <Button
            onClick={handleSubmit}
            disabled={createSale.isPending}
            className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            {createSale.isPending ? "Guardando..." : "Completar Venta"}
          </Button>
        </div>
      )}

      <VariantSelector
        open={showVariantSelector}
        onOpenChange={setShowVariantSelector}
        onSelect={handleVariantSelect}
      />
    </div>
  );
}
