import { useState } from "react";
import { Wallet, Calendar, Receipt, ImageIcon, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Payment } from "~/hooks/use-payments";
import { useFile } from "~/hooks/use-files";

interface PaymentListProps {
  payments: Payment[];
  emptyMessage?: string;
}

const paymentMethodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia",
};

function PaymentProofImage({ proofImageId }: { proofImageId: string }) {
  const [showModal, setShowModal] = useState(false);
  const { data: file, isLoading } = useFile(proofImageId);

  if (isLoading) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <ImageIcon className="h-3 w-3" />
        Cargando...
      </span>
    );
  }

  if (!file?.url) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
      >
        <ImageIcon className="h-3 w-3" />
        Ver comprobante
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div className="relative max-w-md w-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-10 right-0 text-white hover:bg-white/20 rounded-full"
              onClick={() => setShowModal(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={file.url}
              alt="Comprobante de pago"
              className="w-full rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}

export function PaymentList({ payments, emptyMessage = "No hay abonos" }: PaymentListProps) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-3">
      {sortedPayments.map((payment) => (
        <Card key={payment.id} className="border-0 shadow-md rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-600">
                    S/ {parseFloat(payment.amount).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(payment.createdAt).toLocaleDateString("es-PE", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {(payment.referenceNumber || payment.proofImageId) && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {payment.referenceNumber && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                    <Receipt className="h-3 w-3" />
                    Op: {payment.referenceNumber}
                  </span>
                )}
                {payment.proofImageId && (
                  <PaymentProofImage proofImageId={payment.proofImageId} />
                )}
              </div>
            )}

            {payment.notes && (
              <p className="mt-2 text-sm text-muted-foreground bg-gray-50 p-2 rounded-lg">
                {payment.notes}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
