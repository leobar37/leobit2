import { useParams, useNavigate } from "react-router";
import { useState } from "react";
import { Receipt, Calendar, Wallet, Trash2, Edit2, Loader2, Paperclip } from "lucide-react";
import { formatCurrency } from "~/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useExpense, useUpdateExpense, useDeleteExpense, type PaymentMethod } from "~/hooks/use-expenses";
import { useActiveExpenseCategories } from "~/hooks/use-expense-categories";
import { useUploadFile } from "~/hooks/use-files";
import { useBusiness } from "~/hooks/use-business";
import { useSetLayout } from "~/components/layout/app-layout";
import { PaymentMethodSelector } from "@/components/payments/payment-method-selector";
import { ExpenseCategorySelector } from "@/components/expenses/expense-category-selector";
import { ReceiptCapture } from "@/components/expenses/receipt-capture";
import { formatDisplayDate } from "~/lib/date-utils";
import { BusinessUserRole } from "@avileo/shared";
import { toast } from "sonner";

export default function GastoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: expense, isLoading } = useExpense(id ?? null);
  const { data: categories } = useActiveExpenseCategories();
  const { data: business } = useBusiness();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const uploadFile = useUploadFile();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit form state
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editMethod, setEditMethod] = useState<PaymentMethod>("efectivo");
  const [editReference, setEditReference] = useState("");
  const [editReceiptId, setEditReceiptId] = useState<string | null>(null);

  const isAdmin = business?.role === BusinessUserRole.ADMIN_NEGOCIO;

  useSetLayout({
    title: isEditing ? "Editar Gasto" : "Detalle del Gasto",
    showBackButton: true,
    backHref: "/gastos",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="text-center py-12">
        <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Gasto no encontrado</p>
      </div>
    );
  }

  const category = categories?.find((c) => c.id === expense.categoryId);

  const startEditing = () => {
    setEditCategoryId(expense.categoryId);
    setEditAmount(expense.amount);
    setEditDescription(expense.description ?? "");
    setEditDate(expense.expenseDate);
    setEditMethod(expense.paymentMethod);
    setEditReference(expense.referenceNumber ?? "");
    setEditReceiptId(expense.receiptImageId);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    const amountNum = parseFloat(editAmount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }
    if (!editCategoryId) {
      toast.error("Selecciona una categoría");
      return;
    }

    try {
      await updateExpense.mutateAsync({
        id: expense.id,
        input: {
          categoryId: editCategoryId,
          amount: amountNum,
          description: editDescription || null,
          expenseDate: editDate,
          paymentMethod: editMethod,
          referenceNumber: editReference || null,
          receiptImageId: editReceiptId,
        },
      });
      toast.success("Gasto actualizado");
      setIsEditing(false);
    } catch (err) {
      toast.error("Error al actualizar el gasto");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteExpense.mutateAsync(expense.id);
      toast.success("Gasto eliminado");
      navigate("/gastos");
    } catch (err) {
      toast.error("Error al eliminar el gasto");
    }
  };

  const handleReceiptUpload = async (file: File) => {
    const result = await uploadFile.mutateAsync(file);
    setEditReceiptId(result.id);
  };

  const showProofAndReference = editMethod !== "efectivo";

  if (isEditing) {
    return (
      <div className="space-y-5 pb-8">
        <div className="space-y-2">
          <Label className="text-base font-semibold">Categoría</Label>
          <ExpenseCategorySelector
            categories={categories ?? []}
            selectedId={editCategoryId}
            onSelect={setEditCategoryId}
            disabled={updateExpense.isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-amount">Monto (S/)</Label>
          <Input
            id="edit-amount"
            type="number"
            step="0.01"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            disabled={updateExpense.isPending}
            className="shell-field h-12 rounded-2xl text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-date">Fecha</Label>
          <Input
            id="edit-date"
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            disabled={updateExpense.isPending}
            className="shell-field h-12 rounded-2xl"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-base font-semibold">Método de pago</Label>
          <PaymentMethodSelector
            methods={["efectivo", "yape", "plin", "transferencia", "tarjeta"]}
            selectedMethod={editMethod}
            onSelect={setEditMethod}
            disabled={updateExpense.isPending}
          />
        </div>

        {showProofAndReference && (
          <div className="space-y-2">
            <Label htmlFor="edit-reference">Número de operación (opcional)</Label>
            <Input
              id="edit-reference"
              value={editReference}
              onChange={(e) => setEditReference(e.target.value)}
              disabled={updateExpense.isPending}
              className="shell-field h-12 rounded-2xl"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="edit-description">Descripción (opcional)</Label>
          <Textarea
            id="edit-description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            disabled={updateExpense.isPending}
            className="shell-field min-h-[80px] resize-none rounded-2xl"
          />
        </div>

        <ReceiptCapture
          receiptImageId={editReceiptId}
          onUpload={handleReceiptUpload}
          onRemove={() => setEditReceiptId(null)}
          isUploading={uploadFile.isPending}
        />

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={cancelEditing}
            disabled={updateExpense.isPending}
            className="flex-1 h-12 rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={updateExpense.isPending}
            className="flex-1 h-12 rounded-xl bg-orange-500 hover:bg-orange-600"
          >
            {updateExpense.isPending ? (
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
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Amount Card */}
      <div className="shell-card-flat p-5 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Monto del gasto
        </p>
        <p className="text-3xl font-bold">S/ {formatCurrency(expense.amount)}</p>
      </div>

      {/* Details */}
      <div className="shell-card-flat p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
            <Receipt className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Categoría</p>
            <p className="font-medium">{category?.name ?? "Gasto"}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fecha</p>
            <p className="font-medium">{formatDisplayDate(expense.expenseDate)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
            <Wallet className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Método de pago</p>
            <p className="font-medium capitalize">{expense.paymentMethod}</p>
          </div>
        </div>

        {expense.referenceNumber && (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Paperclip className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Número de operación</p>
              <p className="font-medium">{expense.referenceNumber}</p>
            </div>
          </div>
        )}

        {expense.description && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Descripción</p>
            <p className="text-sm">{expense.description}</p>
          </div>
        )}

        {expense.receiptImageId && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Comprobante</p>
            <div className="shell-field rounded-xl p-2 inline-block">
              <div className="h-32 w-32 flex items-center justify-center bg-muted rounded-lg">
                <Receipt className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={startEditing}
          className="flex-1 h-12 rounded-xl"
        >
          <Edit2 className="mr-2 h-4 w-4" />
          Editar
        </Button>
        {isAdmin && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex-1 h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        )}
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold">¿Eliminar gasto?</h3>
            <p className="text-muted-foreground text-sm">
              Esta acción no se puede deshacer. El gasto de S/ {formatCurrency(expense.amount)} será eliminado permanentemente.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteExpense.isPending}
                className="flex-1 h-12 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteExpense.isPending}
                className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600"
              >
                {deleteExpense.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Eliminar"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
