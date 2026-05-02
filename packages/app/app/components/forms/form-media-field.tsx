import * as React from "react";
import { useController } from "react-hook-form";
import { cn } from "~/lib/utils";
import { Upload, X, ImageIcon, AlertCircle } from "lucide-react";
import { useWrapperFormContext } from "~/hooks/use-wrapper-form";

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange(file);
  };

  const handleClear = () => {
    onChange(null);
    setPreview(null);
  };

  const inputId = `media-field-${name}`;

  const isAsset = resolver?.kind === "asset";
  const isFile = resolver?.kind === "file";
  const hasResolver = !!resolver;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium">
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
              {isAsset ? (
                <ImageIcon className="w-8 h-8 mb-2" />
              ) : (
                <Upload className="w-8 h-8 mb-2" />
              )}
              <p className="text-sm">
                {isAsset
                  ? "Haz clic para seleccionar imagen"
                  : "Haz clic para subir archivo"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {isAsset
                  ? "Selecciona o sube una imagen"
                  : "Sube un archivo"}
              </p>
            </div>
            <input
              id={inputId}
              type="file"
              accept={accept || "image/*"}
              disabled={disabled}
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
