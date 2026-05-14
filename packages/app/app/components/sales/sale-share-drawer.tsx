/**
 * Sale Share Drawer
 * Drawer for sharing sales with customers via token/URL
 */
import { useState } from "react";
import { Share2, Copy, RefreshCw, MessageCircle, X, Smartphone, Receipt } from "lucide-react";
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
import { QRCodeSVG } from "qrcode.react";
import {
  useSaleToken,
  useGenerateSaleToken,
  useRegenerateSaleToken,
  useToggleSaleToken,
  useShareSale,
} from "~/hooks/use-sale-token";
import { useBusiness } from "~/hooks/use-business";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";


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
  const { data: business } = useBusiness();
  const { buildUrl, buildDetailUrl, buildMessage, buildReceiptMsg, copyToClipboard } = useShareSale();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const isOnline = true;

  const publicCatalogSlug = (business as { publicCatalogSlug?: string | null } | undefined)?.publicCatalogSlug;

  const isFinalized = ["active", "delivered", "confirmed"].includes(saleStatus);
  const canShareOrder = saleStatus === "draft" || saleStatus === "confirmed";
  const supportsNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  // Order share URL (for editing)
  const orderUrl = tokenData?.token && publicCatalogSlug
    ? buildUrl(publicCatalogSlug, tokenData.token)
    : "";
  // Receipt/detail share URL (read-only)
  const receiptUrl = tokenData?.token && publicCatalogSlug
    ? buildDetailUrl(publicCatalogSlug, tokenData.token)
    : "";

  const orderMessage = tokenData?.token ? buildMessage(orderUrl, saleId) : "";
  const receiptMessage = tokenData?.token ? buildReceiptMsg(receiptUrl) : "";

  const handleGenerate = async () => {
    if (!isOnline) {
      toast.error("Se requiere conexión a internet para generar el enlace de compartir");
      return;
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

  const handleCopy = (url: string) => {
    copyToClipboard(url);
  };

  const handleWhatsApp = (message: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleNativeShare = async (title: string, text: string, url: string) => {
    if (!navigator.share) {
      toast.error("No soportado", {
        description: "Tu navegador no soporta compartir nativo",
      });
      return;
    }
    try {
      await navigator.share({ title, text, url });
    } catch {
      // User cancelled - ignore silently
    }
  };

  const canShare = canShareOrder || isFinalized;

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
        <DrawerHeader className="border-b shell-divider px-5 pb-4 pt-5 text-left">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-xl font-bold tracking-tight">
              Compartir venta
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="h-9 w-9 rounded-xl text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DrawerDescription className="max-w-sm text-sm leading-5">
            Envía el enlace o muestra el QR para que tu cliente revise la venta.
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-5 py-4">
          {!canShare ? (
            <div className="py-4 text-center text-muted-foreground">
              Solo se pueden compartir ventas en borrador, confirmadas o finalizadas.
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
            <div className="space-y-4">
              {/* Token Status Toggle */}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {tokenData.isActive ? "Enlace activo" : "Enlace desactivado"}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {tokenData.isActive
                      ? "El cliente puede abrirlo ahora."
                      : "Nadie podrá acceder al enlace."}
                  </p>
                  {tokenData.createdAt && (
                    <p className="mt-1 text-xs text-muted-foreground/80">
                      Creado {new Date(tokenData.createdAt).toLocaleString("es-PE")}
                    </p>
                  )}
                </div>
                <Switch
                  id="token-status"
                  checked={tokenData.isActive}
                  onCheckedChange={handleToggle}
                  disabled={toggleToken.isPending}
                />
              </div>

              {!publicCatalogSlug && (
                <p className="text-sm text-amber-600">
                  Configura la URL pública del negocio para generar enlaces de pedidos.
                </p>
              )}

              {/* Finalized sale: Receipt share */}
              {isFinalized && tokenData.isActive && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-t shell-divider pt-4">
                    <Receipt className="h-4 w-4 text-orange-500" />
                    <h3 className="font-semibold">Comprobante</h3>
                  </div>

                  {/* Receipt QR */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-border">
                      <QRCodeSVG value={receiptUrl} size={168} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Escanea para ver el comprobante.
                    </p>
                  </div>

                  {/* Receipt URL */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Enlace</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={receiptUrl}
                        readOnly
                        className="min-w-0 flex-1 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm outline-none"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(receiptUrl)}
                        disabled={!receiptUrl}
                        title="Copiar enlace"
                        className="h-10 w-10 rounded-xl"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Receipt Share Buttons */}
                  <div className={`grid gap-2 ${supportsNativeShare ? "grid-cols-2" : "grid-cols-1"}`}>
                    {supportsNativeShare && (
                      <Button
                        onClick={() => handleNativeShare("Comprobante de compra", receiptMessage, receiptUrl)}
                        disabled={!receiptUrl}
                        variant="outline"
                        className="h-11 rounded-xl gap-2"
                      >
                        <Smartphone className="h-4 w-4" />
                        Compartir
                      </Button>
                    )}
                    <Button
                      onClick={() => handleWhatsApp(receiptMessage)}
                      disabled={!receiptUrl}
                      className="h-11 rounded-xl gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              )}

              {/* Draft/Confirmed: Order share (editable) */}
              {canShareOrder && tokenData.isActive && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-t shell-divider pt-4">
                    <Share2 className="h-4 w-4 text-orange-600" />
                    <h3 className="font-semibold">Pedido</h3>
                  </div>

                  {!allowCustomerEdit && (
                    <p className="text-sm text-amber-600">
                      La edición por cliente está deshabilitada para esta venta.
                    </p>
                  )}

                  {/* Order QR */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-border">
                      <QRCodeSVG value={orderUrl} size={168} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Escanea para abrir el pedido.
                    </p>
                  </div>

                  {/* Order URL */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Enlace</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={orderUrl}
                        readOnly
                        className="min-w-0 flex-1 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm outline-none"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(orderUrl)}
                        disabled={!orderUrl}
                        title="Copiar enlace"
                        className="h-10 w-10 rounded-xl"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Order Share Buttons */}
                  <div className={`grid gap-2 ${supportsNativeShare ? "grid-cols-2" : "grid-cols-1"}`}>
                    {supportsNativeShare && (
                      <Button
                        onClick={() => handleNativeShare("Revisa tu pedido", orderMessage, orderUrl)}
                        disabled={!orderUrl}
                        variant="outline"
                        className="h-11 rounded-xl gap-2"
                      >
                        <Smartphone className="h-4 w-4" />
                        Compartir
                      </Button>
                    )}
                    <Button
                      onClick={() => handleWhatsApp(orderMessage)}
                      disabled={!orderUrl}
                      className="h-11 rounded-xl gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              )}

              {/* Disabled state CTA */}
              {!tokenData.isActive && (
                <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    El enlace está desactivado. Actívalo para que el cliente pueda acceder.
                  </p>
                  <Button
                    onClick={() => handleToggle(true)}
                    disabled={toggleToken.isPending}
                    className="gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Activar enlace
                  </Button>
                </div>
              )}

              {/* Regenerate Button */}
              <div className="border-t shell-divider pt-3">
                <Button
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={regenerateToken.isPending}
                  className="h-10 w-full rounded-xl gap-2 text-destructive hover:text-destructive"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerar enlace
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
