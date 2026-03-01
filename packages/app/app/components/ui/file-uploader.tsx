import { useState, useRef, useEffect, useCallback } from "react";
import { X, Camera, Upload, ImageIcon, CloudOff, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "~/lib/utils";

export type UploadStatus = "idle" | "validating" | "uploading" | "pending" | "synced" | "error";

export interface FileUploaderProps {
  /** Current file to display */
  file?: File | null;
  /** Preview URL for existing/ uploaded file */
  previewUrl?: string | null;
  /** Upload status from hook */
  status?: UploadStatus;
  /** Error message to display */
  error?: string | null;
  /** Whether to show the uploader */
  showUploader?: boolean;
  /** Accepted file types */
  accept?: string;
  /** Whether to allow camera capture on mobile */
  capture?: boolean;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Label text */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Callback when file is selected */
  onFileSelect?: (file: File) => void;
  /** Callback when file should be cleared */
  onClear?: () => void;
  /** Callback when uploader should be shown/hidden */
  onShowUploaderChange?: (show: boolean) => void;
  /** Disabled state */
  disabled?: boolean;
}

const DEFAULT_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function FileUploader({
  file,
  previewUrl,
  status = "idle",
  error,
  showUploader = true,
  accept = DEFAULT_ACCEPT,
  capture = true,
  maxSize = DEFAULT_MAX_SIZE,
  label,
  helperText,
  onFileSelect,
  onClear,
  onShowUploaderChange,
  disabled = false,
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (localPreview && localPreview.startsWith("blob:")) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  // Determine preview URL priority: prop > local state
  const displayPreview = previewUrl || localPreview;

  // Validate file
  const validateFile = useCallback(
    (file: File): string | null => {
      const allowedTypes = accept.split(",").map((t) => t.trim());
      if (!allowedTypes.includes(file.type)) {
        return "Tipo de archivo no permitido";
      }
      if (file.size > maxSize) {
        return `Archivo muy grande. Máximo: ${maxSize / (1024 * 1024)}MB`;
      }
      return null;
    },
    [accept, maxSize]
  );

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validation = validateFile(selectedFile);
    if (validation) {
      setValidationError(validation);
      return;
    }

    setValidationError(null);

    // Create local preview
    const objectUrl = URL.createObjectURL(selectedFile);
    setLocalPreview(objectUrl);

    onFileSelect?.(selectedFile);

    // Reset input value to allow selecting same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle clear
  const handleClear = () => {
    if (localPreview && localPreview.startsWith("blob:")) {
      URL.revokeObjectURL(localPreview);
    }
    setLocalPreview(null);
    setValidationError(null);
    onClear?.();
  };

  // Handle uploader toggle
  const handleShowUploader = () => {
    const newShow = !showUploader;
    onShowUploaderChange?.(newShow);
  };

  // Display error
  const displayError = error || validationError;

  // Status indicator
  const renderStatus = () => {
    switch (status) {
      case "uploading":
        return (
          <div className="flex items-center gap-1 text-xs text-blue-500">
            <Upload className="h-3 w-3 animate-pulse" />
            Subiendo...
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center gap-1 text-xs text-amber-500">
            <CloudOff className="h-3 w-3" />
            Pendiente (sin conexión)
          </div>
        );
      case "synced":
        return (
          <div className="flex items-center gap-1 text-xs text-green-500">
            <CheckCircle className="h-3 w-3" />
            Sincronizado
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-1 text-xs text-red-500">
            <AlertCircle className="h-3 w-3" />
            Error al subir
          </div>
        );
      default:
        return null;
    }
  };

  // If there's a file/preview, show it
  if (file || displayPreview) {
    return (
      <div className="space-y-2">
        {label && (
          <p className="text-sm font-medium text-foreground">{label}</p>
        )}
        <div className="relative">
          <img
            src={displayPreview!}
            alt="Vista previa"
            className="w-full h-32 object-cover rounded-xl"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 rounded-full h-8 w-8 p-0"
            onClick={handleClear}
            disabled={disabled || status === "uploading"}
          >
            <X className="h-4 w-4" />
          </Button>
          {renderStatus()}
        </div>
        {helperText && !displayError && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}
        {displayError && (
          <p className="text-xs text-red-500">{displayError}</p>
        )}
      </div>
    );
  }

  // If uploader should be hidden
  if (!showUploader) {
    return null;
  }

  // Show uploader button
  return (
    <div className="space-y-2">
      {label && (
        <p className="text-sm font-medium text-foreground">{label}</p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        capture={capture ? "environment" : undefined}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || status === "uploading"}
      />
      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full rounded-xl h-20 border-dashed",
          displayError && "border-red-500"
        )}
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || status === "uploading"}
      >
        <div className="flex flex-col items-center gap-1">
          <Camera className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {label || "Adjuntar imagen"}
          </span>
        </div>
      </Button>
      {renderStatus()}
      {helperText && !displayError && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      {displayError && (
        <p className="text-xs text-red-500">{displayError}</p>
      )}
    </div>
  );
}
