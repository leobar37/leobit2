/**
 * Receipt Capture Component
 * Reuses ProofCapture pattern for expense receipts
 */

import { useState } from "react";
import { Camera, X, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "~/lib/utils";
import { CameraGalleryDrawer } from "@/components/ui/camera-gallery-drawer";

interface ReceiptCaptureProps {
  receiptImageId: string | null;
  receiptImageUrl?: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  isUploading?: boolean;
}

export function ReceiptCapture({
  receiptImageId,
  receiptImageUrl,
  onUpload,
  onRemove,
  isUploading,
}: ReceiptCaptureProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const hasReceipt = receiptImageId || receiptImageUrl;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        Comprobante del gasto
      </label>

      {hasReceipt ? (
        <div className="relative inline-block">
          <div className="shell-field rounded-xl p-2">
            {receiptImageUrl ? (
              <img
                src={receiptImageUrl}
                alt="Comprobante"
                className="h-32 w-auto object-contain rounded-lg"
              />
            ) : (
              <div className="h-32 w-32 flex items-center justify-center bg-muted rounded-lg">
                <Receipt className="h-8 w-8 text-muted-foreground" />
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
        title="Comprobante de gasto"
      />
    </div>
  );
}
