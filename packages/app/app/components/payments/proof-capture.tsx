import { useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "~/lib/utils";
import { CameraGalleryDrawer } from "@/components/ui/camera-gallery-drawer";

interface ProofCaptureProps {
  proofImageId: string | null;
  proofImageUrl?: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  isUploading?: boolean;
}

export function ProofCapture({
  proofImageId,
  proofImageUrl,
  onUpload,
  onRemove,
  isUploading,
}: ProofCaptureProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const hasProof = proofImageId || proofImageUrl;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        Comprobante de pago
      </label>

      {hasProof ? (
        <div className="relative inline-block">
          <div className="shell-field rounded-xl p-2">
            {proofImageUrl ? (
              <img
                src={proofImageUrl}
                alt="Comprobante"
                className="h-32 w-auto object-contain rounded-lg"
              />
            ) : (
              <div className="h-32 w-32 flex items-center justify-center bg-muted rounded-lg">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onRemove}
            disabled={isUploading}
            className={cn(
              "absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-sm",
              "hover:bg-destructive/90 transition-colors",
              isUploading && "opacity-50 cursor-not-allowed"
            )}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setDrawerOpen(true)}
          disabled={isUploading}
          className={cn(
            "w-full h-20 rounded-xl border-dashed flex flex-col items-center justify-center gap-2",
            "hover:bg-accent transition-colors"
          )}
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Camera className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {isUploading ? "Subiendo..." : "Adjuntar comprobante"}
          </span>
        </Button>
      )}

      <CameraGalleryDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onFileSelect={onUpload}
        title="Comprobante de pago"
      />
    </div>
  );
}
