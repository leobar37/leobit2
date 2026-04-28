/**
 * Sale Share Drawer
 * Drawer for sharing sales with customers via token/URL
 */
import { useState } from "react";
import { Share2, Copy, RefreshCw, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import {
  useSaleToken,
  useGenerateSaleToken,
  useRegenerateSaleToken,
  useToggleSaleToken,
  useShareSale,
} from "~/hooks/use-sale-token";
import { useSaleSyncStatus } from "~/hooks/use-sales";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { useOnline } from "~/hooks/use-online";

interface SaleShareDrawerProps {
  saleId: string;
  saleStatus: string;
  allowCustomerEdit: boolean;
  trigger?: React.ReactNode;
}

export function SaleShareDrawer({
  saleId,
  saleStatus,
  allowCustomerEdit,
  trigger,
}: SaleShareDrawerProps) {
  const [open, setOpen] = useState(false);
  const { data: tokenData } = useSaleToken(open ? saleId : null);
  const generateToken = useGenerateSaleToken();
  const regenerateToken = useRegenerateSaleToken();
  const toggleToken = useToggleSaleToken();
  const { buildUrl, buildMessage, copyToClipboard } = useShareSale();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { isOnline } = useOnline();

  const shareUrl = tokenData?.token ? buildUrl(tokenData.token) : "";
  const whatsappMessage = tokenData?.token ? buildMessage(shareUrl, saleId) : "";
  const { isSynced, ensureSynced } = useSaleSyncStatus(saleId);

  const handleGenerate = async () => {
    if (!isOnline) {
      toast.error("Se requiere conexión a internet para generar el enlace de compartir");
      return;
    }
    if (!isSynced) {
      const synced = await ensureSynced();
      if (!synced) {
        toast.error("No se pudo sincronizar la venta. Intenta de nuevo.");
        return;
      }
    }
    generateToken.mutate(saleId);
  };

  const handleRegenerate = async () => {
    if (!isOnline) {
      toast.error("Se requiere conexión a internet para regenerar el enlace");
      return;
    }

    const confirmed = await confirm({
      title: "Regenerar enlace",
      description: "¿Estás seguro? El enlace anterior dejará de funcionar.",
      confirmText: "Regenerar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      regenerateToken.mutate(saleId);
    }
  };

  const handleToggle = (checked: boolean) => {
    if (!isOnline) {
      toast.error("Se requiere conexión a internet para cambiar el estado del enlace");
      return;
    }
    toggleToken.mutate({ saleId, isActive: checked });
  };

  const handleCopy = () => {
    copyToClipboard(shareUrl);
  };

  const handleWhatsApp = () => {
    // Open WhatsApp with pre-filled message (without phone)
    const url = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, "_blank");
  };

  const canShare = saleStatus === "draft" || saleStatus === "confirmed";

  const triggerElement = trigger || (
    <span className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 gap-2">
      <Share2 className="h-4 w-4" />
      Compartir
    </span>
  );

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {triggerElement}
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <DrawerTitle>Compartir venta</DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DrawerDescription>
            Comparte este enlace con tu cliente para que pueda revisar y modificar su pedido.
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 overflow-y-auto">
          {!canShare ? (
            <div className="py-4 text-center text-muted-foreground">
              Solo se pueden compartir ventas en borrador o confirmadas.
            </div>
          ) : !tokenData ? (
            <div className="py-6 text-center space-y-4">
              <p className="text-muted-foreground">
                Genera un enlace único para compartir esta venta con tu cliente.
              </p>
              <Button
                onClick={handleGenerate}
                disabled={generateToken.isPending}
                className="w-full"
              >
                {generateToken.isPending ? "Generando..." : "Generar enlace"}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Token Status Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="token-status" className="text-base">
                    {tokenData.isActive ? "Enlace activo" : "Enlace desactivado"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {tokenData.isActive
                      ? "El cliente puede editar la venta"
                      : "El cliente no puede acceder"}
                  </p>
                </div>
                <Switch
                  id="token-status"
                  checked={tokenData.isActive}
                  onCheckedChange={handleToggle}
                  disabled={toggleToken.isPending || !allowCustomerEdit}
                />
              </div>

              {!allowCustomerEdit && (
                <p className="text-sm text-amber-600">
                  La edición por cliente está deshabilitada para esta venta.
                </p>
              )}

              {/* QR Code */}
              {tokenData.isActive && (
                <div className="flex flex-col items-center space-y-2">
                  <div className="rounded-lg border p-4 bg-white">
                    <QRCodeSVG value={shareUrl} size={200} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Escanea el código QR para abrir la venta
                  </p>
                </div>
              )}

              {/* Share URL */}
              {tokenData.isActive && (
                <div className="space-y-2">
                  <Label>Enlace para compartir</Label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopy}
                      title="Copiar enlace"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Share Buttons */}
              {tokenData.isActive && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleWhatsApp}
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                </div>
              )}

              {/* Regenerate Button */}
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={regenerateToken.isPending}
                  className="w-full gap-2 text-destructive hover:text-destructive"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerar enlace (invalida el anterior)
                </Button>
              </div>

              {/* Last Used */}
              {tokenData.lastUsedAt && (
                <p className="text-xs text-muted-foreground text-center">
                  Último acceso: {new Date(tokenData.lastUsedAt).toLocaleString("es-PE")}
                </p>
              )}
            </div>
          )}
        </div>
      </DrawerContent>

      <ConfirmDialog />
    </Drawer>
  );
}
