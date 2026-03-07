import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Send, User, DollarSign, Calendar } from "lucide-react";
import {
  useWhatsAppTemplates,
  useDefaultWhatsAppTemplate,
  previewTemplate,
  type WhatsAppTemplate,
} from "~/hooks/use-whatsapp-templates";
import {
  useSendWhatsAppMessage,
  type SendMessageInput,
} from "~/hooks/use-whatsapp-messages";
import { formatCurrency } from "~/lib/utils";
import type { AccountsReceivableItem } from "~/hooks/use-accounts-receivable";

interface SendReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountsReceivableItem | null;
}

export function SendReminderModal({
  isOpen,
  onClose,
  account,
}: SendReminderModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(
    null
  );
  const [step, setStep] = useState<"select" | "preview">("select");

  const { data: templates, isLoading: isLoadingTemplates } = useWhatsAppTemplates();
  const { data: defaultTemplate } = useDefaultWhatsAppTemplate();
  const sendMutation = useSendWhatsAppMessage();

  const effectiveTemplate = selectedTemplate || defaultTemplate;

  const previewValues = useMemo(() => {
    if (!account) return {};
    return {
      nombre_cliente: account.customer.name,
      monto: `S/ ${formatCurrency(account.totalDebt)}`,
      fecha: new Date().toLocaleDateString("es-PE"),
      telefono: account.customer.phone || "",
    };
  }, [account]);

  const handleSelectTemplate = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setStep("preview");
  };

  const handleBack = () => {
    setStep("select");
    setSelectedTemplate(null);
  };

  const handleSend = async () => {
    if (!account || !effectiveTemplate) return;

    try {
      const input: SendMessageInput = {
        customerId: account.customer.id,
        templateId: effectiveTemplate.id,
        variables: {
          nombre_cliente: account.customer.name,
          monto: account.totalDebt,
          fecha: new Date().toLocaleDateString("es-PE"),
        },
      };

      await sendMutation.mutateAsync(input);
      toast.success("Mensaje enviado correctamente");
      handleClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al enviar el mensaje";
      toast.error(message);
    }
  };

  const handleClose = () => {
    setStep("select");
    setSelectedTemplate(null);
    onClose();
  };

  const canSend = account?.customer.phone && effectiveTemplate;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            {step === "select" ? "Enviar Recordatorio" : "Vista Previa"}
          </DialogTitle>
          <DialogDescription>
            {step === "select"
              ? "Selecciona una plantilla para enviar el recordatorio de pago"
              : "Revisa el mensaje antes de enviarlo"}
          </DialogDescription>
        </DialogHeader>

        {account && (
          <div className="mb-4 p-3 bg-orange-50 rounded-xl">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-sm">{account.customer.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <DollarSign className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600 font-semibold">
                S/ {formatCurrency(account.totalDebt)}
              </span>
            </div>
          </div>
        )}

        {!account?.customer.phone && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-sm text-yellow-800">
              Este cliente no tiene un número de teléfono registrado. No se puede enviar el mensaje.
            </p>
          </div>
        )}

        {step === "select" ? (
          <div className="space-y-3">
            {isLoadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            ) : !templates?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay plantillas disponibles. Crea una primero en Configuraci&oacute;n &gt; WhatsApp &gt; Plantillas.
              </div>
            ) : (
              templates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    effectiveTemplate?.id === template.id
                      ? "border-orange-500 ring-1 ring-orange-500"
                      : "border-gray-200"
                  }`}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {template.content}
                        </p>
                      </div>
                      {template.isDefault && (
                        <Badge
                          variant="default"
                          className="rounded-full bg-orange-100 text-orange-700 text-xs"
                        >
                          Por defecto
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {effectiveTemplate && (
              <>
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-green-900 whitespace-pre-wrap">
                        {previewTemplate(effectiveTemplate.content, previewValues)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Se enviará a: {account?.customer.phone}</span>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "preview" ? (
            <>
              <Button variant="outline" onClick={handleBack} disabled={sendMutation.isPending}>
                Atrás
              </Button>
              <Button
                onClick={handleSend}
                disabled={!canSend || sendMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-green-600"
              >
                {sendMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Mensaje
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
