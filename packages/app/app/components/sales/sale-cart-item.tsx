import { Package, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SaleCartItemProps {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  onRemove: () => void;
}

export function SaleCartItem({
  productName,
  quantity,
  unitPrice,
  subtotal,
  onRemove,
}: SaleCartItemProps) {
  return (
    <Card className="border-0 shadow-sm rounded-xl">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium">{productName}</p>
              <p className="text-sm text-muted-foreground">
                {quantity.toFixed(3)} kg × S/ {unitPrice.toFixed(2)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="font-semibold">S/ {subtotal.toFixed(2)}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8 text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
