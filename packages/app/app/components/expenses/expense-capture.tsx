/**
 * Expense Capture Component
 * Form for creating/editing expenses (drawer or inline mode)
 */

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "~/lib/utils";
import { useExpenseCapture, type ExpenseFormData } from "~/hooks/use-expense-capture";
import { useActiveExpenseCategories } from "~/hooks/use-expense-categories";
import { PaymentCapture } from "@/components/payments/payment-capture";
import { useUploadFile } from "~/hooks/use-files";
import { ExpenseCategorySelector } from "./expense-category-selector";

interface ExpenseCaptureProps {
  variant?: "drawer" | "inline";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  expenseId?: string;
  distribucionId?: string;
  sellerId?: string;
  defaultValues?: Partial<ExpenseFormData>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ExpenseCapture({
  variant = "inline",
  open,
  onOpenChange,
  expenseId,
  distribucionId,
  sellerId,
  defaultValues,
  onSuccess,
  onCancel,
}: ExpenseCaptureProps) {
  const isDrawer = variant === "drawer";
  const [drawerOpen, setDrawerOpen] = useState(false);

  const capture = useExpenseCapture({
    expenseId,
    distribucionId,
    sellerId,
    defaultValues,
  });

  const uploadFile = useUploadFile();

  const { data: categories, isLoading: isLoadingCategories } = useActiveExpenseCategories();

  const handleSubmit = async () => {
    const result = await capture.submit();
    if (result.success) {
      capture.reset();
      if (isDrawer) {
        setDrawerOpen(false);
      }
      onSuccess?.();
    }
  };

  const handleCancel = () => {
    capture.reset();
    if (isDrawer) {
      setDrawerOpen(false);
    }
    onCancel?.();
  };

  const formContent = (
    <div className="space-y-5">
      {/* Category */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Categoría</Label>
        {isLoadingCategories ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ExpenseCategorySelector
              categories={categories ?? []}
              selectedId={capture.formData.categoryId}
              onSelect={(id) => capture.setField("categoryId", id)}
              disabled={capture.isPending}
            />
            {capture.errors.categoryId && (
              <p className="text-sm text-red-500">{capture.errors.categoryId}</p>
            )}
          </>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount" className="text-base font-semibold">
          Monto (S/)
        </Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={capture.formData.amount}
          onChange={(e) => capture.setField("amount", e.target.value)}
          disabled={capture.isPending}
          className={cn(
            "shell-field h-12 rounded-2xl text-lg",
            capture.errors.amount && "border-destructive focus-visible:ring-destructive"
          )}
        />
        {capture.errors.amount && (
          <p className="text-sm text-red-500">{capture.errors.amount}</p>
        )}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="expenseDate" className="text-base font-semibold">
          Fecha
        </Label>
        <Input
          id="expenseDate"
          type="date"
          value={capture.formData.expenseDate}
          onChange={(e) => capture.setField("expenseDate", e.target.value)}
          disabled={capture.isPending}
          className={cn(
            "shell-field h-12 rounded-2xl",
            capture.errors.expenseDate && "border-destructive focus-visible:ring-destructive"
          )}
        />
        {capture.errors.expenseDate && (
          <p className="text-sm text-red-500">{capture.errors.expenseDate}</p>
        )}
      </div>

      {/* Payment Method */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Método de pago</Label>
        <PaymentCapture
          variant="inline"
          paymentMethod={capture.formData.paymentMethod}
          onPaymentMethodChange={(method) => capture.setField("paymentMethod", method)}
          referenceNumber={capture.formData.referenceNumber}
          onReferenceNumberChange={(value) => capture.setField("referenceNumber", value)}
          proofImageId={capture.formData.receiptImageId}
          onProofUpload={async (file) => {
            const result = await uploadFile.mutateAsync(file);
            capture.setField("receiptImageId", result.id);
          }}
          onProofRemove={() => capture.setField("receiptImageId", null)}
          isUploading={uploadFile.isPending}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea
          id="description"
          placeholder="Detalles del gasto..."
          value={capture.formData.description}
          onChange={(e) => capture.setField("description", e.target.value)}
          disabled={capture.isPending}
          className="shell-field min-h-[80px] resize-none rounded-2xl"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={capture.isPending}
          className="flex-1 h-12 rounded-xl"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={capture.isPending || !capture.formData.categoryId || !capture.formData.amount}
          className="flex-1 h-12 rounded-xl bg-orange-500 hover:bg-orange-600"
        >
          {capture.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar"
          )}
        </Button>
      </div>
    </div>
  );

  // Inline mode: render directly
  if (!isDrawer) {
    return <div className="space-y-4">{formContent}</div>;
  }

  // Drawer mode
  return (
    <>
      <Drawer open={open ?? drawerOpen} onOpenChange={onOpenChange ?? setDrawerOpen}>
        <DrawerContent className="h-[100dvh] max-h-[100dvh] bg-background flex flex-col">
          <DrawerHeader className="flex items-center justify-between border-b pb-4">
            <DrawerTitle className="text-lg font-semibold">
              {expenseId ? "Editar Gasto" : "Nuevo Gasto"}
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {formContent}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
