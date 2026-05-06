import { useMemo } from "react";
import { useNavigate } from "react-router";
import { Trash2, Package, Pencil, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProducts } from "~/hooks/use-products";
import { useRemoveSaleItem } from "~/hooks/use-sales-db";
import { useSaleEditorState } from "~/hooks/use-sale-editor-state";
import { formatCurrency, formatKilos } from "~/lib/utils";
import { useNewSaleContext } from "../new-sale-context";

function CartItemRow({
  itemId,
  productUnit,
}: {
  itemId: string;
  productUnit?: string;
}) {
  const navigate = useNavigate();
  const { saleId, items } = useNewSaleContext();
  const { setEditingItemId } = useSaleEditorState();
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
    <div className={useMemo(() => {
      const base = "flex items-center gap-3 rounded-[20px] p-3.5 transition-colors";
      return item.isOptimistic
        ? `${base} bg-orange-500/[0.04] border border-orange-500/20`
        : `${base} bg-white/[0.055] hover:bg-white/[0.075]`;
    }, [item.isOptimistic])}>
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500/[0.12]">
        {item.isOptimistic ? (
          <Loader2 className="h-5 w-5 text-orange-600 animate-spin" />
        ) : (
          <Package className="h-5 w-5 text-orange-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {item.productName}
          {item.isOptimistic && (
            <span className="ml-1.5 text-[11px] font-medium text-orange-500">
              guardando...
            </span>
          )}
        </p>
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
        disabled={item.isOptimistic}
        className="flex-shrink-0 rounded-2xl text-muted-foreground hover:bg-white/[0.08] hover:text-orange-500 disabled:opacity-30"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => removeItem.mutate({ saleId: saleId!, itemId: item.id })}
        disabled={item.isOptimistic}
        className="flex-shrink-0 rounded-2xl text-muted-foreground hover:bg-white/[0.08] hover:text-destructive disabled:opacity-30"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

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
