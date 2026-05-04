import { useEffect } from "react";
import { Copy, MessageCircle, Receipt, RefreshCw, Share2, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBusiness } from "~/hooks/use-business";
import {
  useGeneratePaymentToken,
  usePaymentToken,
  useRegeneratePaymentToken,
  useSharePayment,
  useTogglePaymentToken,
} from "~/hooks/use-payment-token";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";

interface PaymentShareDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string | null;
  amount: string;
}

export function PaymentShareDrawer({
  open,
  onOpenChange,
  paymentId,
  amount,
}: PaymentShareDrawerProps) {
  const { data: tokenData } = usePaymentToken(open ? paymentId : null);
  const generateToken = useGeneratePaymentToken();
  const regenerateToken = useRegeneratePaymentToken();
  const toggleToken = useTogglePaymentToken();
  const { data: business } = useBusiness();
  const { buildDetailUrl, buildMessage, copyToClipboard, shareNative, shareWhatsApp } =
    useSharePayment();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const publicCatalogSlug =
    (business as { publicCatalogSlug?: string | null } | undefined)?.publicCatalogSlug ?? null;
  const detailUrl =
    tokenData?.token && publicCatalogSlug
      ? buildDetailUrl(publicCatalogSlug, tokenData.token)
      : "";
  const shareMessage = detailUrl ? buildMessage(detailUrl, amount) : "";

  useEffect(() => {
    if (!open || !paymentId || tokenData || generateToken.isPending || !publicCatalogSlug) {
      return;
    }

    generateToken.mutate(paymentId);
  }, [generateToken, open, paymentId, publicCatalogSlug, tokenData]);

  const handleRegenerate = async () => {
    if (!paymentId) return;

    const confirmed = await confirm({
      title: "Regenerar enlace",
      description: "El enlace anterior dejará de funcionar.",
      confirmText: "Regenerar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      regenerateToken.mutate(paymentId);
    }
  };

  const handleCopy = () => {
    if (!detailUrl) return;
    void copyToClipboard(detailUrl);
  };

  const handleNativeShare = async () => {
    if (!detailUrl) return;
    await shareNative({
      title: "Confirmación de pago",
      text: shareMessage,
      url: detailUrl,
    });
  };

  const handleWhatsApp = () => {
    if (!shareMessage) return;
    shareWhatsApp(shareMessage);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <DrawerTitle>Compartir pago</DrawerTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DrawerDescription>
              Comparte una confirmación del pago con tu cliente.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-5 overflow-y-auto p-4">
            {!publicCatalogSlug ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                Configura la URL pública del negocio para compartir confirmaciones.
              </div>
            ) : !tokenData ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {generateToken.isPending ? "Preparando enlace..." : "Generando confirmación..."}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="payment-token-status" className="text-base">
                        {tokenData.isActive ? "Enlace activo" : "Enlace desactivado"}
                      </Label>
                      <Badge variant={tokenData.isActive ? "success" : "danger"}>
                        {tokenData.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      El cliente podrá ver el detalle del pago en solo lectura.
                    </p>
                  </div>
                  <Switch
                    id="payment-token-status"
                    checked={tokenData.isActive}
                    onCheckedChange={(checked) => {
                      if (!paymentId) return;
                      toggleToken.mutate({ paymentId, isActive: checked });
                    }}
                    disabled={toggleToken.isPending}
                  />
                </div>

                {tokenData.isActive && detailUrl ? (
                  <>
                    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-orange-500" />
                        <h3 className="font-semibold">Detalle público del pago</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Monto confirmado: S/ {amount}
                      </p>

                      <div className="flex flex-col items-center space-y-2">
                        <div className="rounded-lg border border-border bg-background p-4">
                          <QRCodeSVG value={detailUrl} size={200} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Escanea para ver la confirmación
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Enlace de confirmación</Label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={detailUrl}
                            readOnly
                            className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleCopy}
                            title="Copiar enlace"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Button type="button" variant="outline" onClick={handleCopy}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar
                      </Button>
                      <Button type="button" variant="outline" onClick={handleWhatsApp}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp
                      </Button>
                      {typeof navigator !== "undefined" && "share" in navigator && (
                        <Button type="button" onClick={handleNativeShare}>
                          <Share2 className="mr-2 h-4 w-4" />
                          Compartir
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                    Este enlace está desactivado. Actívalo para volver a compartirlo.
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={regenerateToken.isPending || !paymentId}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerar enlace
                </Button>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <ConfirmDialog />
    </>
  );
}
