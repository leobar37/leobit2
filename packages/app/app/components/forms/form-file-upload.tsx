import * as React from "react";
import { useController, useFormContext } from "react-hook-form";
import { cn } from "~/lib/utils";
import { Upload, X, Loader2 } from "lucide-react";

interface FormFileUploadProps {
  name: string;
  entityName: string;
  label?: string;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
}

export function FormFileUpload({
  name,
  entityName,
  label,
  accept,
  maxSize,
  disabled = false,
  className,
}: FormFileUploadProps) {
  const formContext = useFormContext();
  const control = formContext?.control;

  const {
    field: { value, onChange },
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  const [preview, setPreview] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  React.useEffect(() => {
    if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(null);
    }
  }, [value]);

  const effectiveAccept = accept || "image/*";
  const effectiveMaxSize = maxSize || 5 * 1024 * 1024;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > effectiveMaxSize) {
      onChange(null);
      return;
    }

    setIsProcessing(true);
    try {
      onChange(file);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setPreview(null);
  };

  const inputId = `file-upload-${name}`;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
      )}

      <div className="relative">
        {preview ? (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain"
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <label
            htmlFor={inputId}
            className={cn(
              "flex flex-col items-center justify-center w-full aspect-video rounded-lg border-2 border-dashed cursor-pointer transition-colors",
              disabled
                ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                : "border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-600"
            )}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {isProcessing ? (
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
              ) : (
                <Upload className="w-8 h-8 mb-2" />
              )}
              <p className="text-sm">
                {isProcessing ? "Procesando..." : "Haz clic para subir archivo"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {effectiveAccept === "image/*" ? "Imagen" : effectiveAccept} (máx. {Math.round(effectiveMaxSize / 1024 / 1024)}MB)
              </p>
            </div>
            <input
              id={inputId}
              type="file"
              accept={effectiveAccept}
              disabled={disabled || isProcessing}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error.message}</p>
      )}
    </div>
  );
}
