import { DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "./product-image";
import type { Product } from "~/hooks/use-products";
import { getCategoryColor } from "~/lib/utils/category-colors";
import { cn } from "~/lib/utils";

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const category = product.category;

  return (
    <div
      className={cn(
        "cursor-pointer border-b border-border/60 px-1 py-3 transition-colors last:border-b-0 hover:bg-muted/35 dark:border-white/[0.07] dark:hover:bg-white/[0.04]",
        !product.isActive && "opacity-60",
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <ProductImage
          imageId={product.imageId}
          alt={product.name}
          size="md"
          fallbackClassName={product.isActive ? "" : "opacity-60"}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                className={cn(
                  "truncate text-[0.95rem] font-semibold leading-5",
                  product.isActive
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {product.name}
              </h3>

              <div className="mt-1.5 flex items-center gap-2 text-sm">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  S/ {product.basePrice} / {product.unit}
                </span>
              </div>
            </div>

            <div className="flex max-w-[44%] shrink-0 flex-col items-end gap-2">
              <Badge
                variant="secondary"
                className="max-w-full truncate rounded-full border-0 bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                style={
                  category
                    ? {
                        backgroundColor: `${getCategoryColor(category.color)}18`,
                        color: getCategoryColor(category.color),
                      }
                    : undefined
                }
              >
                {category ? category.name : "Sin categoría"}
              </Badge>

              <Badge
                variant="secondary"
                className={cn(
                  "rounded-full border-0 px-2.5 py-1 text-xs font-medium",
                  product.isActive
                    ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {product.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
