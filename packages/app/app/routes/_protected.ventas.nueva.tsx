import { Link, useNavigate } from "react-router";
import { ArrowLeft, Calculator, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CustomerSearch } from "~/components/sales/customer-search";
import { SaleCartItem } from "~/components/sales/sale-cart-item";
import { useProducts } from "~/hooks/use-products-live";
import { useCreateSale } from "~/hooks/use-sales";
import type { Customer, Product } from "~/lib/db/schema";

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export default function NewSalePage() {
  const navigate = useNavigate();
  const { data: products } = useProducts();
  const createSale = useCreateSale();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [saleType, setSaleType] = useState<"contado" | "credito">("contado");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [amountPaid, setAmountPaid] = useState<string>("");

  const [showCalculator, setShowCalculator] = useState(false);
  const [bruto, setBruto] = useState<string>("");
  const [tara, setTara] = useState<string>("");
  const [precio, setPrecio] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const totalAmount = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const balanceDue = saleType === "credito" 
    ? totalAmount - (parseFloat(amountPaid) || 0)
    : 0;

  const handleAddToCart = (product: Product) => {
    const existingIndex = cartItems.findIndex((item) => item.productId === product.id);
    
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].subtotal = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: parseFloat(product.basePrice),
          subtotal: parseFloat(product.basePrice),
        },
      ]);
    }
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const handleCalculatorAdd = () => {
    if (!selectedProduct || !bruto || !tara || !precio) return;

    const brutoNum = parseFloat(bruto);
    const taraNum = parseFloat(tara);
    const precioNum = parseFloat(precio);
    const neto = brutoNum - taraNum;
    const subtotal = neto * precioNum;

    setCartItems([
      ...cartItems,
      {
        productId: selectedProduct.id,
        productName: `${selectedProduct.name} (Neto: ${neto.toFixed(3)}kg)`,
        quantity: neto,
        unitPrice: precioNum,
        subtotal,
      },
    ]);

    setShowCalculator(false);
    setBruto("");
    setTara("");
    setPrecio("");
    setSelectedProduct(null);
  };

  const handleSubmit = async () => {
    if (cartItems.length === 0) return;

    try {
      await createSale.mutateAsync({
        clientId: selectedCustomer?.id,
        saleType,
        totalAmount,
        amountPaid: saleType === "credito" ? parseFloat(amountPaid) || 0 : totalAmount,
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
        <div className="flex items-center gap-3 h-16 px-4">
          <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-orange-50">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold text-lg">Nueva Venta</h1>
        </div>
      </header>

      <main className="p-4 pb-32 space-y-4">
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
                saleType === "contado" && "bg-orange-500 hover:bg-orange-600"
              )}
            >
              Contado
            </Button>
            <Button
              variant={saleType === "credito" ? "default" : "outline"}
              onClick={() => setSaleType("credito")}
              className={cn(
                "flex-1 rounded-xl",
                saleType === "credito" && "bg-orange-500 hover:bg-orange-600"
              )}
            >
              Crédito
            </Button>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-muted-foreground">Productos</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCalculator(!showCalculator)}
              className="rounded-xl"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Calculadora
            </Button>
          </div>

          {showCalculator && (
            <Card className="border-0 shadow-md rounded-2xl mb-4">
              <CardContent className="p-4 space-y-3">
                <select
                  className="w-full p-2 rounded-xl border"
                  value={selectedProduct?.id || ""}
                  onChange={(e) => {
                    const product = products?.find((p) => p.id === e.target.value);
                    setSelectedProduct(product || null);
                    if (product) setPrecio(product.basePrice);
                  }}
                >
                  <option value="">Seleccionar producto...</option>
                  {products?.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Bruto (kg)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={bruto}
                      onChange={(e) => setBruto(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tara (kg)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={tara}
                      onChange={(e) => setTara(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Precio/kg</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={precio}
                      onChange={(e) => setPrecio(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleCalculatorAdd}
                  disabled={!selectedProduct || !bruto || !tara}
                  className="w-full rounded-xl bg-orange-500 hover:bg-orange-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-2">
            {products?.map((product) => (
              <Button
                key={product.id}
                variant="outline"
                onClick={() => handleAddToCart(product)}
                className="h-auto py-3 rounded-xl justify-start"
              >
                <div className="text-left">
                  <p className="font-medium text-sm">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    S/ {product.basePrice}
                  </p>
                </div>
              </Button>
            ))}
          </div>
        </section>

        {cartItems.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">
              Carrito ({cartItems.length} items)
            </h2>
            <div className="space-y-2">
              {cartItems.map((item, index) => (
                <SaleCartItem
                  key={`${item.productId}-${index}`}
                  productName={item.productName}
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
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-orange-100">
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
    </div>
  );
}
