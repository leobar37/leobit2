import { SaleCartItem } from "~/components/sales/sale-cart-item";
import { useSaleStore } from "~/stores/sale.store";

export function CartSection() {
  const cartItems = useSaleStore((state) => state.cartItems);
  const removeFromCart = useSaleStore((state) => state.removeFromCart);

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <section data-testid="cart-section">
      <h2 className="text-sm font-medium text-muted-foreground mb-2" data-testid="cart-title">
        Carrito ({cartItems.length} items)
      </h2>
      <div className="space-y-2" data-testid="cart-items-container">
        {cartItems.map((item, index) => (
          <div key={`${item.productId}-${item.variantId}-${index}`} data-testid={`cart-item-${index}`}>
            <SaleCartItem
              productName={item.productName}
              variantName={item.variantName}
              unit={item.unit}
              quantity={item.quantity}
              unitPrice={item.unitPrice}
              subtotal={item.subtotal}
              onRemove={() => removeFromCart(index)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
