import { Package } from "lucide-react";
import { cn } from "~/lib/utils";
import { useAsset } from "~/hooks/use-assets";

interface ProductImageProps {
  imageId?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

const iconSizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function ProductImage({
  imageId,
  alt,
  className,
  fallbackClassName,
  size = "md",
}: ProductImageProps) {
  const { data: asset, isLoading } = useAsset(imageId || "");

  if (isLoading || !imageId || !asset?.url) {
    return (
      <div
        className={cn(
          "bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0",
          sizeClasses[size],
          fallbackClassName
        )}
      >
        <Package className={cn("text-orange-600", iconSizes[size])} />
      </div>
    );
  }

  return (
    <img
      src={asset.url}
      alt={alt}
      className={cn(
        "object-cover rounded-xl flex-shrink-0",
        sizeClasses[size],
        className
      )}
      loading="lazy"
    />
  );
}
