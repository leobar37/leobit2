import * as React from "react";
import { useController, useFormContext } from "react-hook-form";
import { cn } from "~/lib/utils";
import { X, ImageIcon } from "lucide-react";

interface FormAssetPickerProps {
  name: string;
  entityName: string;
  label?: string;
  accept?: string;
  disabled?: boolean;
  className?: string;
}

export function FormAssetPicker({
  name,
  entityName,
  label,
  accept = "image/*",
  disabled = false,
  className,
}: FormAssetPickerProps) {
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

  React.useEffect(() => {
    if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
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

  const inputId = `asset-picker-${name}`;

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
              <ImageIcon className="w-8 h-8 mb-2" />
              <p className="text-sm">Haz clic para seleccionar imagen</p>
              <p className="text-xs text-gray-400 mt-1">
                Selecciona o sube una imagen
              </p>
            </div>
            <input
              id={inputId}
              type="file"
              accept={accept}
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
