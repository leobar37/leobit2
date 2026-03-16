import { DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "./product-image";
import type { Product } from "~/lib/db/schema";

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const typeColors = {
    pollo: "bg-orange-100/90 text-orange-700",
    huevo: "bg-yellow-100/90 text-yellow-700",
    otro: "bg-stone-100 text-stone-600",
  };

  return (
    <Card 
      className={`shell-card-flat cursor-pointer rounded-[24px] transition-colors hover:border-stone-300/90 ${!product.isActive ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <ProductImage
            imageId={product.imageId}
            alt={product.name}
            size="lg"
            fallbackClassName={product.isActive ? "" : "opacity-60"}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`truncate text-[1.05rem] font-semibold ${product.isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {product.name}
              </h3>
              <Badge
                variant="secondary"
                className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium capitalize ${typeColors[product.type]}`}
              >
                {product.type}
              </Badge>
            </div>
            
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  S/ {product.basePrice} / {product.unit}
                </span>
              </div>
              <Badge 
                variant="secondary" 
                className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium ${
                  product.isActive
                    ? "bg-green-100/90 text-green-700"
                    : "bg-stone-100 text-stone-500"
                }`}
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
