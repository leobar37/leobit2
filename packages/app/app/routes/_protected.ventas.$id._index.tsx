import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  ShoppingCart,
  Calendar,
  User,
  DollarSign,
  Scale,
  Loader2,
  AlertCircle,
  MessageCircle,
  Send,
  CheckCircle,
  XCircle,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useSale } from "~/hooks/use-sales";
import { useCustomers } from "~/hooks/use-customers-live";
import { useProducts } from "~/hooks/use-products-live";
import { useWhatsAppStatus } from "~/hooks/use-whatsapp-settings";
import { useWhatsAppTemplates, previewTemplate } from "~/hooks/use-whatsapp-templates";
import { useSendWhatsAppMessage } from "~/hooks/use-send-whatsapp-message";
import { formatCurrency } from "~/lib/utils";

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sale, isLoading, error } = useSale(id || "");
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();
  const { data: whatsappStatus } = useWhatsAppStatus();
  const { data: templates } = useWhatsAppTemplates();
  const sendMessage = useSendWhatsAppMessage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [sendStatus, setSendStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const customer = customers?.find((c) => c.id === sale?.clientId);
  const paidAmount = Number(sale?.amountPaid ?? 0);
  const dueAmount = Number(sale?.balanceDue ?? 0);

  const isWhatsAppConnected = whatsappStatus?.isConnected ?? false;
  const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId);

  const getMessagePreview = () => {
    if (!selectedTemplate || !sale || !customer) return "";

    const productosText = sale.items
      ?.map((item) => `${item.productName} x${item.quantity}`)
      .join(", ") ?? "";

    return previewTemplate(selectedTemplate.content, {
      nombre_cliente: customer.name,
      monto: `S/ ${formatCurrency(sale.totalAmount)}`,
      fecha: new Date(sale.saleDate).toLocaleDateString("es-PE"),
      productos: productosText,
      total: `S/ ${formatCurrency(sale.totalAmount)}`,
    });
  };

  const handleOpenModal = () => {
    if (!isWhatsAppConnected) return;
    setSendStatus("idle");
    setStatusMessage("");
    setSelectedTemplateId(templates?.find((t) => t.isDefault)?.id ?? templates?.[0]?.id ?? "");
    setIsModalOpen(true);
  };

  const handleSendMessage = async () => {
    if (!sale || !customer || !selectedTemplateId) return;

    setSendStatus("idle");
    setStatusMessage("");

    try {
      const productosText = sale.items
        ?.map((item) => `${item.productName} x${item.quantity}`)
        .join(", ") ?? "";

      await sendMessage.mutateAsync({
        customerId: customer.id,
        templateId: selectedTemplateId,
        saleId: sale.id,
        variables: {
          nombre_cliente: customer.name,
          monto: formatCurrency(sale.totalAmount),
          fecha: new Date(sale.saleDate).toLocaleDateString("es-PE"),
          productos: productosText,
          total: formatCurrency(sale.totalAmount),
        },
      });

      setSendStatus("success");
      setStatusMessage("Mensaje enviado correctamente");
      setTimeout(() => {
        setIsModalOpen(false);
        setSendStatus("idle");
        setStatusMessage("");
      }, 1500);
    } catch (err) {
      setSendStatus("error");
      setStatusMessage(err instanceof Error ? err.message : "Error al enviar el mensaje");
    }
  };
  const saleStatus = sale
    ? sale.saleType === "contado"
      ? "Pago total"
      : paidAmount <= 0
        ? "Debe todo"
        : dueAmount > 0
          ? "A cuenta"
          : "Sin deuda"
    : "";
  const formattedDate = sale
    ? new Date(sale.saleDate).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100 p-4">
        <div className="max-w-md mx-auto mt-20 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Venta no encontrada</h2>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "La venta que buscas no existe"}
          </p>
          <Button onClick={() => navigate("/ventas")}>Volver a ventas</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-4 gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ventas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg flex-1">Detalle de Venta</h1>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!isWhatsAppConnected}
            onClick={handleOpenModal}
            title={!isWhatsAppConnected ? "Conecta tu WhatsApp primero" : "Enviar mensaje por WhatsApp"}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Enviar WhatsApp</span>
          </Button>
        </div>
      </header>

      <main className="p-4 pb-24 space-y-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center">
                <ShoppingCart className="h-7 w-7 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground text-sm">Venta #{sale.id.slice(-6)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={sale.saleType === "contado" ? "default" : "secondary"}
                    className={
                      sale.saleType === "contado"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }
                  >
                    {saleStatus}
                  </Badge>
                  {sale.saleType === "credito" && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      Credito
                    </Badge>
                  )}
                  <Badge
                    variant={sale.syncStatus === "synced" ? "default" : "outline"}
                  >
                    {sale.syncStatus === "synced" ? "Sincronizado" : "Pendiente"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información General</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formattedDate}</span>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{customer?.name || "Cliente general"}</span>
            </div>

            {sale.tara && (
              <div className="flex items-center gap-3">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <span>Tara: {formatCurrency(sale.tara)} kg</span>
              </div>
            )}

            {sale.netWeight && (
              <div className="flex items-center gap-3">
                <Scale className="h-4 w-4 text-orange-600" />
                <span className="font-medium">Neto: {formatCurrency(sale.netWeight)} kg</span>
              </div>
            )}
          </CardContent>
        </Card>

        {sale.items && sale.items.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Productos Vendidos</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {sale.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between py-3 border-b last:border-0 first:pt-0"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {item.productName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.quantity)} x S/{" "}
                        {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-foreground ml-4">
                    S/ {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-muted-foreground">
                  {sale.items.length} producto
                  {sale.items.length > 1 ? "s" : ""}
                </span>
                <span className="font-semibold text-lg">
                  S/ {formatCurrency(sale.totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumen de Pago</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold text-lg">
                S/ {formatCurrency(sale.totalAmount)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Abono inicial</span>
              <span>S/ {formatCurrency(paidAmount)}</span>
            </div>

            {dueAmount > 0 && (
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-red-600 font-medium">Pendiente</span>
                <span className="text-red-600 font-semibold">
                  S/ {formatCurrency(dueAmount)}
                </span>
              </div>
            )}

            {dueAmount === 0 && (
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-green-600 font-medium">Estado</span>
                <Badge className="bg-green-100 text-green-700">Sin deuda</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Enviar mensaje por WhatsApp
            </DialogTitle>
            <DialogDescription>
              Selecciona una plantilla y personaliza el mensaje antes de enviarlo a {customer?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Plantilla</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedTemplate?.name ?? "Seleccionar plantilla"}
                    <span className="ml-2">▼</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full min-w-[300px]">
                  {templates?.map((template) => (
                    <DropdownMenuItem
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className="flex items-center justify-between"
                    >
                      <span>{template.name}</span>
                      {template.isDefault && (
                        <Badge variant="secondary" className="ml-2">Predeterminada</Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Vista previa del mensaje</label>
              <Textarea
                readOnly
                value={getMessagePreview()}
                className="min-h-[120px] resize-none bg-muted"
              />
            </div>

            {sendStatus !== "idle" && (
              <div
                className={`flex items-center gap-2 text-sm ${
                  sendStatus === "success" ? "text-green-600" : "text-red-600"
                }`}
              >
                {sendStatus === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {statusMessage}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!selectedTemplateId || sendMessage.isPending || sendStatus === "success"}
              className="gap-2"
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sendMessage.isPending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
