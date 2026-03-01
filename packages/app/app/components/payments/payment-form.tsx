import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Wallet, Banknote, Smartphone, Building2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FormInput } from "@/components/forms/form-input";
import { FormNumberInput } from "@/components/forms/form-number-input";
import { FileUploader } from "@/components/ui/file-uploader";
import { useCreatePayment } from "~/hooks/use-payments";
import { useFileUpload } from "~/hooks/use-file-upload";

const paymentFormSchema = z.object({
  amount: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: "El monto debe ser mayor a 0" }
  ),
  paymentMethod: z.enum(["efectivo", "yape", "plin", "transferencia"]),
  notes: z.string().optional(),
  referenceNumber: z.string().max(50, "Máximo 50 caracteres").optional(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  clientId: string;
  onClose: () => void;
  maxAmount?: number;
}

const paymentMethods = [
  { value: "efectivo" as const, label: "Efectivo", icon: Banknote },
  { value: "yape" as const, label: "Yape", icon: Smartphone },
  { value: "plin" as const, label: "Plin", icon: Smartphone },
  { value: "transferencia" as const, label: "Transferencia", icon: Building2 },
];

export function PaymentForm({ clientId, onClose, maxAmount }: PaymentFormProps) {
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const createPayment = useCreatePayment();
  const fileUpload = useFileUpload();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isValid },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(
      maxAmount
        ? paymentFormSchema.refine(
            (data) => {
              const amount = parseFloat(data.amount);
              return amount <= maxAmount;
            },
            {
              message: `El monto no puede exceder S/ ${maxAmount?.toFixed(2)}`,
              path: ["amount"],
            }
          )
        : paymentFormSchema
    ),
    mode: "onChange",
    defaultValues: {
      amount: "",
      paymentMethod: "efectivo",
      notes: "",
      referenceNumber: "",
    },
  });

  const paymentMethod = watch("paymentMethod");
  const showDigitalFields = ["yape", "plin", "transferencia"].includes(paymentMethod);

  const handleFileSelect = (file: File) => {
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const handleClearFile = () => {
    if (proofPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(proofPreview);
    }
    setProofFile(null);
    setProofPreview(null);
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      let proofImageId: string | undefined;

      if (proofFile) {
        const result = await fileUpload.upload(proofFile);
        proofImageId = result.id;
      }

      await createPayment.mutateAsync({
        clientId,
        amount: parseFloat(data.amount).toFixed(2),
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        referenceNumber: data.referenceNumber,
        proofImageId,
      });
      onClose();
    } catch (error) {
      console.error("Error creating payment:", error);
      setError("root", { message: "Error al registrar el abono" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <Card className="w-full sm:w-[400px] sm:rounded-2xl rounded-t-2xl border-0 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-orange-500" />
            Registrar Abono
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errors.root && (
              <p className="text-sm text-red-500 text-center">{errors.root.message}</p>
            )}

            <FormNumberInput
              label="Monto (S/)"
              placeholder="0.00"
              autoFocus
              maxAmount={maxAmount}
              error={errors.amount?.message}
              {...register("amount")}
            />

            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = paymentMethod === method.value;
                  return (
                    <Button
                      key={method.value}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => {
                        const input = document.querySelector(
                          `input[value="${method.value}"]`
                        ) as HTMLInputElement;
                        if (input) {
                          input.click();
                        }
                      }}
                      className={`rounded-xl ${
                        isSelected ? "bg-orange-500 hover:bg-orange-600" : ""
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {method.label}
                    </Button>
                  );
                })}
              </div>
              <input type="hidden" {...register("paymentMethod")} />
            </div>

            {showDigitalFields && (
              <FormInput
                label="N° de Operación (opcional)"
                placeholder="Ej: 12345678"
                maxLength={50}
                error={errors.referenceNumber?.message}
                helperText="Número de transacción Yape/Plin o referencia de transferencia"
                {...register("referenceNumber")}
              />
            )}

            {showDigitalFields && (
              <FileUploader
                file={proofFile}
                previewUrl={proofPreview}
                status={
                  fileUpload.isUploading
                    ? "uploading"
                    : fileUpload.isPending
                    ? "pending"
                    : "idle"
                }
                error={fileUpload.isError ? "Error al subir imagen" : null}
                label="Comprobante de Pago (opcional)"
                helperText="Toma una foto o selecciona de la galería"
                onFileSelect={handleFileSelect}
                onClear={handleClearFile}
              />
            )}

            <FormInput
              label="Notas (opcional)"
              placeholder="Observaciones..."
              {...register("notes")}
            />

            <Button
              type="submit"
              disabled={createPayment.isPending || fileUpload.isUploading || !isValid}
              className="w-full rounded-xl bg-orange-500 hover:bg-orange-600"
            >
              {createPayment.isPending ? "Guardando..." : "Registrar Abono"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export type { PaymentFormData };
