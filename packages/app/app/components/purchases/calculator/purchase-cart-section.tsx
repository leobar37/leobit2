import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePurchaseStore, type PurchaseCartItem } from "~/stores/purchase.store";

interface PurchaseCartItemCardProps {
  item: PurchaseCartItem;
  index: number;
}

function PurchaseCartItemCard({ item, index }: PurchaseCartItemCardProps) {
  const removeFromCart = usePurchaseStore((state) => state.removeFromCart);

  return (
    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
      <div className="flex-1">
        <p className="font-medium text-sm">{item.productName}</p>
        {item.variantName && (
          <p className="text-xs text-muted-foreground">{item.variantName}</p>
        )}
        <div className="flex gap-2 text-xs text-muted-foreground mt-1">
          <span>Cant: {item.quantity}</span>
          <span>x S/ {item.unitCost.toFixed(2)}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold">S/ {item.subtotal.toFixed(2)}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeFromCart(index)}
          className="text-red-500 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function PurchaseCartSection() {
  const cartItems = usePurchaseStore((state) => state.cartItems);
  const removeFromCart = usePurchaseStore((state) => state.removeFromCart);
  const clearCart = usePurchaseStore((state) => state.clearCart);

  const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <section data-testid="cart-section">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Carrito ({cartItems.length} items)
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearCart}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          Limpiar todo
        </Button>
      </div>
      <div className="space-y-2">
        {cartItems.map((item, index) => (
          <PurchaseCartItemCard key={`${item.productId}-${index}`} item={item} index={index} />
        ))}
      </div>
      <div className="mt-3 p-3 bg-orange-100 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="font-medium">Total:</span>
          <span className="text-xl font-bold">S/ {total.toFixed(2)}</span>
        </div>
      </div>
    </section>
  );
}
