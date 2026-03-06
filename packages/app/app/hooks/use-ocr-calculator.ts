import { useMutation } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";

export interface OCRResult {
  bruto: string | null;
  tara: string | null;
  precioPorKg: string | null;
  precioTotal: string | null;
  confianza: number;
  notas: string | null;
}

/**
 * Hook para procesar imágenes de balanza con OCR
 * Sigue el patrón de TanStack Query del proyecto
 */
export function useOCRCalculator() {
  const mutation = useMutation({
    mutationFn: async (file: File): Promise<OCRResult> => {
      // Convertir a base64
      const base64 = await fileToBase64(file);

      // Llamar API
      const response = await api.ocr["recognize-weight"].post({ imageBase64: base64 });
      return extractData<OCRResult>(response);
    },
    retry: 2,
  });

  return {
    isPending: mutation.isPending,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    reset: mutation.reset,
  };
}

/**
 * Convierte File a base64 data URL
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
