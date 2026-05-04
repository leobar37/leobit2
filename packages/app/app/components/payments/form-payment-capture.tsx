import { useController } from "react-hook-form";
import { PaymentCapture } from "./payment-capture";

interface FormPaymentCaptureProps {
  name: string;
}

export function FormPaymentCapture({ name }: FormPaymentCaptureProps) {
  const { field } = useController({ name });

  if (!field.value) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        No hay pago asociado
      </div>
    );
  }

  return <PaymentCapture paymentId={field.value} />;
}
