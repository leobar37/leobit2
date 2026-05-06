import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "~/lib/utils";
import { CameraGalleryDrawer } from "@/components/ui/camera-gallery-drawer";
import { useFile } from "~/hooks/use-files";
import { ImagePreview } from "@/components/ui/image-preview";

interface ProofCaptureProps {
  proofImageId: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  isUploading?: boolean;
}

export function ProofCapture({
  proofImageId,
  onUpload,
  onRemove,
  isUploading,
}: ProofCaptureProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: fileRecord } = useFile(proofImageId ?? "");

  const imageUrl = fileRecord?.url;
  const hasProof = !!proofImageId;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        Comprobante de pago
      </label>

      {hasProof ? (
        imageUrl ? (
          <ImagePreview
            src={imageUrl}
            alt="Comprobante de pago"
            aspectRatio="video"
            onRemove={onRemove}
            isUploading={isUploading}
          />
        ) : (
          <div className="h-44 w-full flex items-center justify-center rounded-2xl bg-muted">
            <Camera className="h-8 w-8 text-muted-foreground" />
          </div>
        )
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setDrawerOpen(true)}
          disabled={isUploading}
          className={cn(
            "w-full h-20 rounded-xl border-0 bg-muted/70 shadow-sm flex flex-col items-center justify-center gap-2",
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
