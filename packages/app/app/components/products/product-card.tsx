import { DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "./product-image";
import type { Product } from "~/hooks/use-products";
import { getCategoryColor } from "~/lib/utils/category-colors";

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const category = product.category;

  return (
    <Card 
      className={`shell-card-flat cursor-pointer rounded-[22px] border-0 bg-card/80 transition-colors hover:bg-accent/40 dark:bg-[#151821] dark:hover:bg-[#1a1d26] ${!product.isActive ? "opacity-60" : ""}`}
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
                className="rounded-full border-0 bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                style={category ? {
                  backgroundColor: `${getCategoryColor(category.color)}20`,
                  color: getCategoryColor(category.color),
                } : undefined}
              >
                {category ? category.name : "Sin categoría"}
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
                    ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground"
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
