import * as React from "react";
import { useController, useFormContext } from "react-hook-form";
import { cn } from "~/lib/utils";
import { Button } from "@/components/ui/button";
import { useUploadFile, validateFile } from "~/hooks/use-files";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

export interface QRImageUploadProps {
  name: string;
  label?: string;
}

const QRImageUpload = React.forwardRef<HTMLDivElement, QRImageUploadProps>(
  ({ name, label }, ref) => {
    const formContext = useFormContext();
    const control = formContext?.control;

    const {
      field: { value, onChange },
      fieldState: { error },
    } = useController({
      name,
      control,
    });

    const uploadMutation = useUploadFile();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleClick = () => {
      fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validationError = validateFile(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      try {
        const result = await uploadMutation.mutateAsync(file);
        onChange(`/api/files/${result.id}`);
        toast.success("Imagen subida correctamente");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al subir la imagen";
        toast.error(message);
      }
    };

    const handleRemove = () => {
      onChange("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    const isUploading = uploadMutation.isPending;
    const hasImage = typeof value === "string" && value.length > 0;

    return (
      <div ref={ref} className="space-y-2">
        {label && (
          <label className="text-sm font-medium">{label}</label>
        )}

        <div className="relative">
          {hasImage ? (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-muted border border-border">
              <img
                src={value as string}
                alt="Vista previa del QR"
                className="w-full h-full object-contain"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleRemove}
                className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleClick}
              disabled={isUploading}
              className={cn(
                "shell-field flex flex-col items-center justify-center w-full aspect-video rounded-2xl border-2 border-dashed transition-colors cursor-pointer",
                "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-accent",
                isUploading && "opacity-60 cursor-not-allowed"
              )}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Subiendo imagen...</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-2">
                    {value ? (
                      <ImageIcon className="h-6 w-6 text-orange-600" />
                    ) : (
                      <Upload className="h-6 w-6 text-orange-600" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Haz clic para subir imagen del QR
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    JPG, PNG, WEBP (máx. 5MB)
                  </p>
                </>
              )}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error.message}</p>
        )}
      </div>
    );
  }
);

QRImageUpload.displayName = "QRImageUpload";

export { QRImageUpload };
