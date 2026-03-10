import { toast } from "sonner";

interface ShareData {
  title: string;
  text: string;
  url: string;
}

export function useShare() {
  const isSupported = typeof navigator !== "undefined" && !!navigator.share;

  const share = async (data: ShareData): Promise<boolean> => {
    if (isSupported) {
      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Share failed:", error);
        }
      }
    }

    try {
      await navigator.clipboard.writeText(data.url);
      toast.success("Enlace copiado al portapapeles");
      return true;
    } catch {
      toast.error("No se pudo copiar el enlace");
      return false;
    }
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Enlace copiado al portapapeles");
      return true;
    } catch {
      toast.error("No se pudo copiar el enlace");
      return false;
    }
  };

  return { share, copyToClipboard, isSupported };
}
