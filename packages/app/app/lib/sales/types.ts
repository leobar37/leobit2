import type { Products as Product } from "~/lib/sync/generated/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";

export interface CartItem {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  unit: "kg" | "unidad";
  variantUnitQuantity: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export type PaymentMode = "pago_total" | "a_cuenta" | "debe_todo";

export interface AddFromCalculatorParams {
  cartItems: CartItem[];
  selectedProduct: Product;
  selectedVariant: ProductVariant;
  values: {
    totalAmount: string;
    pricePerKg: string;
  };
  kgNeto: number;
  packsInput: string;
  unitsInput: string;
}
