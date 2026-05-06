import { useState, useCallback } from "react";
import { X, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "~/lib/utils";

interface ImagePreviewProps {
  src: string;
  alt?: string;
  className?: string;
  imageClassName?: string;
  aspectRatio?: "video" | "square" | "auto";
  showOverlay?: boolean;
  onRemove?: () => void;
  isUploading?: boolean;
}

export function ImagePreview({
  src,
  alt = "Preview",
  className,
  imageClassName,
  aspectRatio = "video",
  showOverlay = true,
  onRemove,
  isUploading,
}: ImagePreviewProps) {
  const [open, setOpen] = useState(false);

  const aspectClass =
    aspectRatio === "video"
      ? "aspect-video"
      : aspectRatio === "square"
        ? "aspect-square"
        : "";

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.();
    },
    [onRemove]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative w-full overflow-hidden rounded-2xl bg-muted group cursor-zoom-in",
          aspectClass,
          className
        )}
      >
        <img
          src={src}
          alt={alt}
          className={cn(
            "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105",
            imageClassName
          )}
        />

        {showOverlay && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow-lg" />
          </div>
        )}

        {onRemove && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isUploading}
            className={cn(
              "absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-sm",
              "hover:bg-black/80 transition-colors z-10",
              isUploading && "opacity-50 cursor-not-allowed"
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-transparent shadow-none">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <div className="relative flex items-center justify-center">
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
