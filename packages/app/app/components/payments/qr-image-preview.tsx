import * as React from "react";
import { useFile } from "~/hooks/use-files";
import { Loader2, ImageOff, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRImagePreviewProps {
  fileId: string | undefined | null;
  alt?: string;
  className?: string;
}

export function QRImagePreview({ fileId, alt = "Código QR", className }: QRImagePreviewProps) {
  const { data: fileRecord, isLoading, isError } = useFile(fileId || "");
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  if (!fileId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-xl ${className || ""}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !fileRecord?.url) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-xl ${className || ""}`}>
        <ImageOff className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsFullscreen(true)}
        className="relative group cursor-pointer"
      >
        <img
          src={fileRecord.url}
          alt={alt}
          className={className || "max-h-40 w-auto object-contain"}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg">
          <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
      </button>

      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setIsFullscreen(false)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={fileRecord.url}
            alt={alt}
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
