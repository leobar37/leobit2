import { useState, useEffect } from "react";
import { Camera, Loader2, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraGalleryDrawer } from "@/components/ui/camera-gallery-drawer";
import { useOCRCalculator, type OCRResult } from "~/hooks/use-ocr-calculator";
import { useToastError } from "~/hooks/use-toast-error";

interface OCRButtonProps {
  /** Callback cuando se reconoce el peso */
  onResult: (result: OCRResult) => void;
  /** Si está deshabilitado */
  disabled?: boolean;
  /** Confianza mínima para auto-fill (0-1) */
  minConfidence?: number;
}

const DEFAULT_MIN_CONFIDENCE = 0.7;

/**
 * Botón para escanear la balanza con OCR
 * Sigue los patrones del proyecto: usa useToastError y manejo correcto de estado
 */
export function OCRButton({
  onResult,
  disabled,
  minConfidence = DEFAULT_MIN_CONFIDENCE,
}: OCRButtonProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastRecognizedWeight, setLastRecognizedWeight] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const { showError, showSuccess: showToastSuccess } = useToastError();
  const { isPending, mutate: processImage } = useOCRCalculator();

  // Reset success state after 3 seconds
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handleFileSelect = (file: File) => {
    processImage(file, {
      onSuccess: (data) => {
        // Validar confianza mínima
        if (data.confianza < minConfidence) {
          showError(
            "Reconocimiento poco claro",
            new Error(`Confianza: ${Math.round(data.confianza * 100)}%. Intenta con una foto más clara.`)
          );
          return;
        }

        // Mostrar feedback visual
        setLastRecognizedWeight(data.bruto);
        setShowSuccess(true);

        showToastSuccess("Peso reconocido", {
          description: `${data.bruto} kg (${Math.round(data.confianza * 100)}% confianza)`,
        });

        onResult(data);
        setDrawerOpen(false);
      },
      onError: (error) => {
        showError("Error al reconocer peso", error);
      },
    });
  };

  // Success state - mostrar peso reconocido
  if (showSuccess && lastRecognizedWeight) {
    return (
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled
          className="h-12 w-full justify-center px-3 border-green-300 bg-green-50 text-green-700"
        >
          <Check className="h-4 w-4 mr-2" />
          <span className="text-sm">{lastRecognizedWeight} kg</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            setShowSuccess(false);
            setLastRecognizedWeight(null);
            setDrawerOpen(true);
          }}
          className="h-12 w-12 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Loading or idle state
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setDrawerOpen(true)}
        disabled={disabled || isPending}
        className="h-12 w-full justify-center px-3 border-orange-200 hover:bg-orange-50"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin text-orange-500" />
        ) : (
          <Camera className="h-4 w-4 mr-2 text-orange-500" />
        )}
        <span className="text-sm">{isPending ? "Reconociendo..." : "Escanear"}</span>
      </Button>

      <CameraGalleryDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onFileSelect={handleFileSelect}
        title="Escanear balanza"
      />
    </>
  );
}
