import { toast } from "sonner";

export function useSharePayment() {
  const buildDetailUrl = (slug: string, token: string): string => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/pago/${slug}/detalle?token=${token}`;
  };

  const buildMessage = (url: string, amount: string): string => {
    return `Hola. Te comparto la confirmación de tu pago por S/ ${amount}:\n\n${url}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const shareNative = async (data: { title: string; text: string; url: string }) => {
    if (!navigator.share) {
      toast.error("Tu navegador no soporta compartir nativo");
      return;
    }

    try {
      await navigator.share(data);
    } catch {
      // User cancelled
    }
  };

  const shareWhatsApp = (message: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return {
    buildDetailUrl,
    buildMessage,
    copyToClipboard,
    shareNative,
    shareWhatsApp,
  };
}
