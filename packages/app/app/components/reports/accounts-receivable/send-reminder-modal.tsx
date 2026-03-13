import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import type { AccountsReceivableItem } from "~/hooks/use-accounts-receivable";
import { formatCurrency } from "~/lib/utils";
import { Send } from "lucide-react";

interface SendReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountsReceivableItem | null;
}

export function SendReminderModal({ isOpen, onClose, account }: SendReminderModalProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSending(false);
    onClose();
  };

  if (!account) return null;

  const defaultMessage = `Hola ${account.customer.name}, le recordamos que tiene un saldo pendiente de ${formatCurrency(account.totalDebt)}. Por favor, realice su pago a la brevedad posible. Gracias.`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Recordatorio</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-gray-500 mb-2">Cliente</p>
            <p className="font-semibold">{account.customer.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Monto Adeudado</p>
            <p className="font-bold text-red-600">{formatCurrency(account.totalDebt)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Mensaje</p>
            <Textarea
              value={message || defaultMessage}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
          <Button
            className="w-full bg-orange-500 hover:bg-orange-600"
            onClick={handleSend}
            disabled={isSending}
          >
            {isSending ? (
              "Enviando..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Recordatorio
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
