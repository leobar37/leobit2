import { useAtom, useAtomValue } from "jotai";
import { SaleCartItem } from "~/components/sales/sale-cart-item";
import { cartItemsAtom } from "~/atoms/new-sale";
import { removeFromCart } from "~/lib/sales/cart-utils";

export function CartSection() {
  const cartItems = useAtomValue(cartItemsAtom);
  const [_, setCartItems] = useAtom(cartItemsAtom);

  if (cartItems.length === 0) {
    return null;
  }

  return (
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
            unit={item.unit}
            quantity={item.quantity}
            unitPrice={item.unitPrice}
            subtotal={item.subtotal}
            onRemove={() => setCartItems((current) => removeFromCart(current, index))}
          />
        ))}
      </div>
    </section>
  );
}
