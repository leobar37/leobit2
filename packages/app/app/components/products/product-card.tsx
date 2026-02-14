import { Package, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Product } from "~/lib/db/schema";

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const typeColors = {
    pollo: "bg-orange-100 text-orange-700",
    huevo: "bg-yellow-100 text-yellow-700",
    otro: "bg-gray-100 text-gray-700",
  };

  return (
    <Card 
      className={`border-0 shadow-md rounded-2xl cursor-pointer hover:shadow-lg transition-shadow ${!product.isActive ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${product.isActive ? "bg-gradient-to-br from-orange-100 to-orange-200" : "bg-gray-100"}`}>
            <Package className={`h-6 w-6 ${product.isActive ? "text-orange-600" : "text-gray-400"}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`font-semibold truncate ${product.isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {product.name}
              </h3>
              <Badge variant="secondary" className={typeColors[product.type]}>
                {product.type}
              </Badge>
            </div>
            
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  S/ {product.basePrice} / {product.unit}
                </span>
              </div>
              <Badge 
                variant="secondary" 
                className={product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}
              >
                {product.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
