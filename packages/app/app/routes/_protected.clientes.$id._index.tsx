import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  CreditCard,
  MapPin,
  Pencil,
  Phone,
  Tags,
  Trash2,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCustomer, useDeleteCustomer } from "~/hooks/use-customers";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { useCustomerBalance } from "~/hooks/use-customer-balance";
import { useCustomerPayments } from "~/hooks/use-payments";
import { useSalesByCustomer } from "~/hooks/use-sales";
import { formatCurrency } from "~/lib/utils";
import { formatDate } from "~/lib/formatting";
import { CustomerTagsModal, useCustomerTagsModal } from "~/components/customers/customer-tags-modal";

function SyncBadge({ status }: { status: "pending" | "synced" | "error" }) {
  const styles = {
    pending: "bg-amber-100 text-amber-700",
    synced: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };

  const labels = {
    pending: "Pendiente",
    synced: "Sincronizado",
    error: "Error",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"sales" | "payments">("sales");

  const { data: customer, isLoading: customerLoading } = useCustomer(id ?? null);
  const { data: balance, isLoading: balanceLoading } = useCustomerBalance(id ?? null);
  const { data: sales = [], isLoading: salesLoading } = useSalesByCustomer(id ?? "");
  const { data: payments = [], isLoading: paymentsLoading } = useCustomerPayments(id ?? null);
  const deleteCustomer = useDeleteCustomer();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const tagsModal = useCustomerTagsModal();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Eliminar cliente",
      description: `¿Estás seguro de eliminar a ${customer?.name}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      try {
        await deleteCustomer.mutateAsync(id!);
        navigate("/clientes");
      } catch (error) {
        console.error("Error deleting customer:", error);
        toast.error("Error al eliminar el cliente");
      }
    }
  };

  const customerSales = useMemo(
    () =>
      sales.filter(
        (sale) =>
          sale.status !== "draft" &&
          sale.status !== "cancelled"
      ),
    [sales]
  );

  if (customerLoading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <p>Cargando cliente...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <p>Cliente no encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell">
      <header className="sticky top-0 z-50 border-b shell-surface">
        <div className="flex h-16 items-center gap-3 px-3 sm:px-4">
          <button
            onClick={() => navigate(-1)}
            className="-ml-2 rounded-2xl p-2 text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="truncate text-lg font-bold">{customer.name}</h1>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={handleDelete}
              className="rounded-2xl p-2 text-red-600 transition-colors hover:bg-white/70"
              title="Eliminar cliente"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <Link
              to={`/clientes/${id}/edit`}
              className="rounded-2xl p-2 transition-colors hover:bg-white/70"
            >
              <Pencil className="h-5 w-5" />
            </Link>
            <button
              onClick={() => tagsModal.open({ customerId: id! })}
              className="rounded-2xl p-2 transition-colors hover:bg-white/70"
              title="Asignar etiquetas"
            >
              <Tags className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="space-y-4 px-3 py-4 pb-32 sm:px-4">
        <Card className="shell-card-flat rounded-[28px]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] bg-orange-100/90 ring-1 ring-orange-100">
                <User className="h-7 w-7 text-orange-600" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold">{customer.name}</h2>

                <div className="mt-3 space-y-2">
                  {customer.dni && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                      <span>DNI: {customer.dni}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{customer.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {balance && balance.totalSales > 0 && (
          <Card className="shell-card-flat rounded-[28px]">
            <CardContent className="space-y-4 p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Saldo pendiente</p>
                <p className={`text-4xl font-bold ${(balance.balanceDue ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                  {(balance.balanceDue ?? 0) > 0 
                    ? `S/ ${formatCurrency(balance.balanceDue)}` 
                    : "Sin deuda"}
                </p>
                {balanceLoading ? (
                  <p className="mt-1 text-xs text-muted-foreground">Calculando saldo...</p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="shell-block-muted rounded-[20px] p-3">
                  <p className="text-xs text-muted-foreground">Ventas crédito</p>
                  <p className="font-semibold">
                    S/ {formatCurrency(balance.totalSales)}
                  </p>
                </div>
                <div className="shell-block-muted rounded-[20px] p-3">
                  <p className="text-xs text-muted-foreground">Abonos</p>
                  <p className="font-semibold text-green-600">
                    S/ {formatCurrency(balance.totalPayments)}
                  </p>
                </div>
              </div>

              {(balance.balanceDue ?? 0) > 0 && (
                <Button asChild className="h-12 w-full rounded-xl bg-orange-500 hover:bg-orange-600">
                  <Link to={`/cobros/nuevo?clienteId=${id}`}>
                    <Wallet className="mr-2 h-4 w-4" />
                    Registrar pago
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <CustomerTagsModal />

        <ConfirmDialog />

        <div className="shell-card-flat overflow-hidden rounded-[28px]">
          <div className="flex border-b shell-divider">
            <button
              onClick={() => setActiveTab("sales")}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === "sales"
                  ? "border-b-2 border-orange-500 text-orange-600"
                  : "text-muted-foreground"
              }`}
            >
              Ventas ({customerSales.length})
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === "payments"
                  ? "border-b-2 border-orange-500 text-orange-600"
                  : "text-muted-foreground"
              }`}
            >
              Abonos ({payments.length})
            </button>
          </div>

          <div className="space-y-3 p-4">
            {activeTab === "sales" ? (
              salesLoading ? (
                <p className="py-4 text-center text-muted-foreground">Cargando ventas...</p>
              ) : customerSales.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">No hay ventas registradas</p>
              ) : (
                customerSales.map((sale) => (
                  <Link
                    key={sale.id}
                    to={`/ventas/${sale.id}`}
                    className="shell-card-soft block rounded-[20px] p-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {sale.type === "pre_order" ? "Pedido" : "Venta"} a{" "}
                          {sale.saleType === "credito" ? "crédito" : "contado"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(sale.saleDate)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-between text-sm">
                      <span>Total</span>
                      <span className="font-semibold">
                        S/ {formatCurrency(sale.totalAmount)}
                      </span>
                    </div>
                    {Number(sale.balanceDue) > 0 ? (
                      <div className="mt-1 flex justify-between text-sm">
                        <span>Saldo</span>
                        <span className="font-semibold text-red-600">
                          S/ {formatCurrency(sale.balanceDue)}
                        </span>
                      </div>
                    ) : null}
                  </Link>
                ))
              )
            ) : paymentsLoading ? (
              <p className="py-4 text-center text-muted-foreground">Cargando abonos...</p>
            ) : payments.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">No hay abonos registrados</p>
            ) : (
              payments.map((payment) => (
                <div
                  key={payment.id}
                  className="shell-card-soft rounded-[20px] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        S/ {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm capitalize text-muted-foreground">
                        {payment.paymentMethod}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(payment.createdAt)}
                      </p>
                    </div>
                  </div>
                  {payment.referenceNumber ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Operación: {payment.referenceNumber}
                    </p>
                  ) : null}
                  {payment.notes ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {payment.notes}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
