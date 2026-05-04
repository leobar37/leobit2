import { Package, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "~/lib/utils";
import { usePurchaseForm } from "../purchase-form-context";

export function PurchaseCartSection() {
  const { items, removeItem, totalAmount } = usePurchaseForm();

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 rounded-2xl bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Productos ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.productName}</p>
              <p className="text-sm text-muted-foreground">
                {item.variantName} · Cantidad {item.quantity} × S/ {formatCurrency(parseFloat(item.unitCost))}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">S/ {formatCurrency(parseFloat(item.totalCost))}</p>
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
        ))}
        
        <div className="flex justify-between items-center pt-3 border-t mt-3">
          <span className="font-medium">Total:</span>
          <span className="text-xl font-bold text-orange-600">S/ {formatCurrency(totalAmount)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
