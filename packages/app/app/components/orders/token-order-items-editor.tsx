import { useState, useCallback, useMemo } from "react";
import { Plus, Trash2, Package, ShoppingCart, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "~/lib/api-client";
import { formatCurrency, formatWeight } from "~/lib/utils";
import type { OrderItem } from "~/lib/db/schema";
import type { Product } from "~/hooks/use-products";
import type { ProductVariant } from "~/hooks/use-product-variants";
import { useVariantsByProduct } from "~/hooks/use-product-variants";

interface TokenOrder {
  id: string;
  orderDate: string;
  deliveryDate: string;
  status: "draft" | "confirmed" | "cancelled" | "delivered";
  paymentIntent: "contado" | "credito";
  totalAmount: string;
  version: number;
  items: OrderItem[];
}

interface TokenOrderItemsEditorProps {
  token: string;
  order: TokenOrder | null;
  isTokenActive: boolean;
  products: Product[];
  onOrderUpdate?: (order: TokenOrder) => void;
}

interface AddItemInput {
  productId: string;
  variantId: string;
  quantity: number;
}

async function fetchTokenOrder(token: string): Promise<TokenOrder> {
  const { data, error } = await api["public"]["pedido"]({ token }).get();
  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to fetch order");
  }
  return data.data as unknown as TokenOrder;
}

async function addTokenOrderItem(
  token: string,
  input: AddItemInput
): Promise<TokenOrder> {
  const { data, error } = await api["public"]["pedido"]({ token })["items"].post({
    productId: input.productId,
    variantId: input.variantId,
    quantity: input.quantity,
  });
  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to add item");
  }
  return data.data as unknown as TokenOrder;
}

async function deleteTokenOrderItem(
  token: string,
  itemId: string,
  baseVersion: number
): Promise<TokenOrder> {
  const { data, error } = await api["public"]["pedido"]({ token })["items"]({
    itemId,
  }).delete({
    baseVersion,
  });
  if (error) {
    throw new Error(String(error.value));
  }
  if (!data?.success || !data.data) {
    throw new Error("Failed to delete item");
  }
  return data.data as unknown as TokenOrder;
}

function useTokenOrder(token: string, initialOrder: TokenOrder | null) {
  return useQuery({
    queryKey: ["token-order", token],
    queryFn: () => fetchTokenOrder(token),
    initialData: initialOrder || undefined,
    refetchOnWindowFocus: false,
  });
}

function useAddTokenOrderItem(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddItemInput) => addTokenOrderItem(token, input),
    onSuccess: (data) => {
      queryClient.setQueryData(["token-order", token], data);
    },
  });
}

function useDeleteTokenOrderItem(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, baseVersion }: { itemId: string; baseVersion: number }) =>
      deleteTokenOrderItem(token, itemId, baseVersion),
    onSuccess: (data) => {
      queryClient.setQueryData(["token-order", token], data);
    },
  });
}

interface ProductSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelect: (product: Product, variant: ProductVariant, quantity: number) => void;
  isSubmitting?: boolean;
}

function ProductSelector({
  isOpen,
  onClose,
  products,
  onSelect,
  isSubmitting,
}: ProductSelectorProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");

  const { data: variants } = useVariantsByProduct(selectedProductId, {
    isActive: true,
  });

  const activeProducts = useMemo(
    () => products?.filter((p) => p.isActive) || [],
    [products]
  );

  const activeVariants = useMemo(
    () => variants?.filter((v) => v.isActive) || [],
    [variants]
  );

  const selectedProduct = useMemo(
    () => activeProducts.find((p) => p.id === selectedProductId),
    [activeProducts, selectedProductId]
  );

  const selectedVariant = useMemo(
    () => activeVariants.find((v) => v.id === selectedVariantId),
    [activeVariants, selectedVariantId]
  );

  const handleProductChange = (value: string) => {
    setSelectedProductId(value);
    setSelectedVariantId("");
    setQuantity("");
  };

  const handleVariantChange = (value: string) => {
    setSelectedVariantId(value);
    setQuantity("");
  };

  const handleAdd = () => {
    if (selectedProduct && selectedVariant && parseFloat(quantity) > 0) {
      onSelect(selectedProduct, selectedVariant, parseFloat(quantity));
      setSelectedProductId("");
      setSelectedVariantId("");
      setQuantity("");
      onClose();
    }
  };

  const isKgUnit = selectedProduct?.unit === "kg";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-4 w-4 text-orange-600" />
            </div>
            Agregar producto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Producto</Label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-white"
              disabled={isSubmitting}
            >
              <option value="">Seleccionar producto</option>
              {activeProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          {selectedProductId && (
            <div className="space-y-2">
              <Label>Variante</Label>
              <select
                value={selectedVariantId}
                onChange={(e) => handleVariantChange(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-white"
                disabled={isSubmitting}
              >
                <option value="">Seleccionar variante</option>
                {activeVariants.length === 0 && (
                  <option value="" disabled>
                    No hay variantes disponibles
                  </option>
                )}
                {activeVariants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name} - S/ {formatCurrency(variant.price)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedVariantId && (
            <div className="space-y-2">
              <Label>Cantidad ({isKgUnit ? "kg" : "unidades"})</Label>
              <NumericInput
                decimals={isKgUnit ? 3 : 0}
                min={isKgUnit ? "0.001" : "1"}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={isKgUnit ? "Ej: 2.500" : "Ej: 5"}
                className="rounded-xl"
                autoFocus
              />
              {selectedVariant && (
                <p className="text-xs text-muted-foreground">
                  Precio: S/ {formatCurrency(selectedVariant.price)} por{" "}
                  {isKgUnit ? "kg" : "unidad"}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={
                !selectedVariant ||
                !quantity ||
                parseFloat(quantity) <= 0 ||
                isSubmitting
              }
              className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
            >
              {isSubmitting ? "Agregando..." : "Agregar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TokenOrderItemsEditor({
  token,
  order: initialOrder,
  isTokenActive,
  products,
  onOrderUpdate,
}: TokenOrderItemsEditorProps) {
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [editingQuantities, setEditingQuantities] = useState<Record<string, string>>({});

  const { data: order, isLoading: isLoadingOrder } = useTokenOrder(token, initialOrder);
  const addItemMutation = useAddTokenOrderItem(token);
  const deleteItemMutation = useDeleteTokenOrderItem(token);

  const canEdit = isTokenActive && order?.status === "draft";

  const calculateSubtotal = useCallback((item: OrderItem): number => {
    const quantity = parseFloat(item.orderedQuantity) || 0;
    const price = parseFloat(item.unitPriceQuoted) || 0;
    return quantity * price;
  }, []);

  const totalAmount = useMemo(() => {
    if (!order?.items) return 0;
    return order.items.reduce((sum, item) => sum + calculateSubtotal(item), 0);
  }, [order?.items, calculateSubtotal]);

  const handleAddItem = useCallback(
    async (product: Product, variant: ProductVariant, quantity: number) => {
      if (!canEdit) return;

      try {
        const updatedOrder = await addItemMutation.mutateAsync({
          productId: product.id,
          variantId: variant.id,
          quantity,
        });
        onOrderUpdate?.(updatedOrder);
      } catch (error) {
        console.error("Failed to add item:", error);
      }
    },
    [canEdit, addItemMutation, onOrderUpdate]
  );

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      if (!canEdit || !order) return;

      try {
        const updatedOrder = await deleteItemMutation.mutateAsync({
          itemId,
          baseVersion: order.version,
        });
        onOrderUpdate?.(updatedOrder);
      } catch (error) {
        console.error("Failed to delete item:", error);
      }
    },
    [canEdit, order, deleteItemMutation, onOrderUpdate]
  );

  const handleQuantityChange = useCallback((itemId: string, value: string) => {
    const numValue = parseFloat(value);
    if (value !== "" && (Number.isNaN(numValue) || numValue < 0)) {
      return;
    }
    setEditingQuantities((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  }, []);

  const getDisplayQuantity = useCallback(
    (item: OrderItem): string => {
      return editingQuantities[item.id] ?? item.orderedQuantity;
    },
    [editingQuantities]
  );

  if (isLoadingOrder) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!order) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">No se pudo cargar el pedido</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4" />
          Items del pedido
          {!canEdit && (
            <span className="text-xs text-amber-600 font-normal">
              (Solo lectura)
            </span>
          )}
        </Label>
        {canEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowProductSelector(true)}
            className="rounded-xl"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar producto
          </Button>
        )}
      </div>

      {order.items.length === 0 ? (
        <Card className="border-0 shadow-sm bg-gray-50/50">
          <CardContent className="p-6 text-center">
            <ShoppingCart className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-muted-foreground">
              No hay productos en el pedido
            </p>
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowProductSelector(true)}
                className="mt-3 rounded-xl"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar producto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {order.items.map((item) => {
            const subtotal = calculateSubtotal(item);
            const displayQuantity = getDisplayQuantity(item);

            return (
              <Card key={item.id} className="border-0 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.variantName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-24">
                        {canEdit ? (
                          <NumericInput
                            decimals={3}
                            min="0"
                            value={displayQuantity}
                            onChange={(e) =>
                              handleQuantityChange(item.id, e.target.value)
                            }
                            className="h-8 text-right rounded-lg"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            {formatWeight(item.orderedQuantity)}
                          </span>
                        )}
                      </div>

                      <div className="w-20 text-right">
                        <span className="font-semibold text-sm">
                          S/ {formatCurrency(subtotal)}
                        </span>
                      </div>

                      {canEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deleteItemMutation.isPending}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground text-right">
                    S/ {formatCurrency(item.unitPriceQuoted)} x{" "}
                    {formatWeight(item.orderedQuantity)}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Card className="border-0 shadow-md bg-gradient-to-r from-orange-50 to-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total ({order.items.length} productos)
                </span>
                <span className="text-xl font-bold text-orange-600">
                  S/ {formatCurrency(totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ProductSelector
        isOpen={showProductSelector}
        onClose={() => setShowProductSelector(false)}
        products={products}
        onSelect={handleAddItem}
        isSubmitting={addItemMutation.isPending}
      />
    </div>
  );
}

export default TokenOrderItemsEditor;
