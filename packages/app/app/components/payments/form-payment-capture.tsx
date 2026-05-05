import { useController } from "react-hook-form";
import { PaymentCapture } from "./payment-capture";
import { useUploadFile } from "~/hooks/use-files";

interface FormPaymentCaptureProps {
  name: string;
}

export function FormPaymentCapture({ name }: FormPaymentCaptureProps) {
  const { field } = useController({ name });
  const uploadFile = useUploadFile();

  if (!field.value) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        No hay pago asociado
      </div>
    );
  }

  // This component is used in forms where the payment data is managed externally
  // For now, render a simplified version. The parent form should handle the upload.
  return (
    <PaymentCapture
      variant="inline"
      paymentMethod={null}
      onPaymentMethodChange={() => {}}
      disabled
    />
  );
}
