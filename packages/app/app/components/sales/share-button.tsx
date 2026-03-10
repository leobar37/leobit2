import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Copy } from "lucide-react";
import { useCreateSaleToken } from "~/hooks/use-transactions";
import { toast } from "sonner";

interface ShareButtonProps {
  saleId: string;
}

export function ShareButton({ saleId }: ShareButtonProps) {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const createToken = useCreateSaleToken();

  const handleShare = async () => {
    try {
      const newToken = await createToken(saleId);
      setToken(newToken);
      
      const shareUrl = `${window.location.origin}/s/${newToken}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copiado al portapapeles");
      
      // Mobile share
      if (navigator.share) {
        await navigator.share({
          title: "Editar Pedido",
          text: "Haz clic para editar tu pedido:",
          url: shareUrl,
        });
      }
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Error al generar link");
    }
  };

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      className="rounded-xl"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-2 text-green-500" />
          Copiado
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4 mr-2" />
          Compartir
        </>
      )}
    </Button>
  );
}
