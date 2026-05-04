import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { useController } from "react-hook-form";
import { cn } from "~/lib/utils";
import { Upload, X, ImageIcon, AlertCircle, Camera } from "lucide-react";
import { useWrapperFormContext } from "~/hooks/use-wrapper-form";
import { CameraGalleryDrawer } from "~/components/ui/camera-gallery-drawer";
import { useMobile } from "~/hooks/use-mobile";
import { validateFile } from "~/hooks/use-files";

export interface FormMediaFieldProps {
  name: string;
  label?: string;
  accept?: string;
  disabled?: boolean;
  className?: string;
}

export function FormMediaField({
  name,
  label,
  accept,
  disabled = false,
  className,
}: FormMediaFieldProps) {
  const wrapperForm = useWrapperFormContext();
  const resolver = wrapperForm?.getFieldResolver(name);
  const control = wrapperForm?.control;
  const isMobile = useMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    field: { value, onChange },
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  const [preview, setPreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else if (typeof value === "string" && value) {
      // Existing ID - we could batch-resolve here, but for now leave to parent
      setPreview(null);
    } else if (typeof value === "object" && value !== null && "url" in value) {
      setPreview((value as { url: string }).url);
    } else {
      setPreview(null);
    }
  }, [value]);

  const processFile = useCallback(
    (file: File) => {
      const validation = validateFile(file);
      if (validation) {
        setValidationError(validation);
        return;
      }

      setValidationError(null);
      onChange(file);
    },
    [onChange]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    e.target.value = "";
  };

  const handleDrawerFileSelect = (file: File) => {
    processFile(file);
  };

  const handleUploadClick = () => {
    if (isMobile) {
      setDrawerOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleClear = () => {
    onChange(null);
    setPreview(null);
    setValidationError(null);
  };

  const inputId = `media-field-${name}`;
  const isAsset = resolver?.kind === "asset";
  const hasResolver = !!resolver;
  const displayError = error?.message || validationError;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium">
          {label}
        </label>
      )}

      {!hasResolver && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span>Campo media sin resolver configurado</span>
        </div>
      )}

      <div className="relative">
        {preview ? (
          <div className="relative w-full h-32 rounded-2xl overflow-hidden bg-muted">
            <img
              src={preview}
              alt="Vista previa"
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors shadow-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={disabled}
            className={cn(
              "w-full h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors",
              disabled
                ? "border-muted bg-muted/50 text-muted-foreground cursor-not-allowed"
                : "border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground"
            )}
          >
            {isMobile ? (
              <Camera className="w-6 h-6" />
            ) : isAsset ? (
              <ImageIcon className="w-6 h-6" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
            <span className="text-sm font-medium">
              {isMobile
                ? "Tomar foto o subir comprobante"
                : isAsset
                  ? "Seleccionar imagen"
                  : "Subir archivo"}
            </span>
            <span className="text-xs text-muted-foreground">
              {isMobile ? "Toca para abrir cámara o galería" : "Haz clic para seleccionar"}
            </span>
          </button>
        )}

        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept={accept || "image/*"}
          disabled={disabled}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {displayError && (
        <p className="text-sm text-red-500">{displayError}</p>
      )}

      <CameraGalleryDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onFileSelect={handleDrawerFileSelect}
        accept={accept || "image/jpeg,image/jpg,image/png,image/webp"}
        title={label || "Adjuntar imagen"}
      />
    </div>
  );
}
