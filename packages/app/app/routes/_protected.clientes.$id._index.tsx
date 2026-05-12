import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  CreditCard,
  MapPin,
  Pencil,
  Phone,
  ShoppingCart,
  Tags,
  Trash2,
  User,
  Wallet,
  Droplets,
  CalendarDays,
  Route,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCustomer, useDeleteCustomer } from "~/hooks/use-customers";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { useCustomerBalance } from "~/hooks/use-customer-balance";
import { useCustomerPayments } from "~/hooks/use-payments";
import { useSalesByCustomer } from "~/hooks/use-sales";
import { MobilePage, MobileShell, MobileSlot } from "~/components/mobile";
import { formatCurrency } from "~/lib/utils";
import { formatDate } from "~/lib/formatting";
import { decimalToNumber } from "@avileo/shared";
import {
  CustomerTagsModal,
  useCustomerTagsModal,
} from "~/components/customers/customer-tags-modal";
import { CreateSaleTypeSheet } from "~/components/sales/create-sale-type-sheet";
import { useBusinessMode } from "~/hooks/use-business-mode";

const dayLabels: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"sales" | "payments">("sales");
  const [showSaleSheet, setShowSaleSheet] = useState(false);

  const { data: customer, isLoading: customerLoading } = useCustomer(
    id ?? null,
  );
  const { data: balance, isLoading: balanceLoading } = useCustomerBalance(
    id ?? null,
  );
  const { data: sales = [], isLoading: salesLoading } = useSalesByCustomer(
    id ?? "",
  );
  const { data: payments = [], isLoading: paymentsLoading } =
    useCustomerPayments(id ?? null);
  const { mode } = useBusinessMode();
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
        (sale) => sale.status !== "draft" && sale.status !== "cancelled",
      ),
    [sales],
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
    <>
      <MobileShell.BackButton>
        <button
          onClick={() => navigate(-1)}
          className="shell-toolbar-button -ml-2 rounded-2xl p-2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </MobileShell.BackButton>

      <MobileSlot name="header:center" priority={10}>
        <h1 className="truncate text-lg font-bold">{customer.name}</h1>
      </MobileSlot>

      <MobileSlot name="header:right" priority={10}>
        <div className="flex items-center gap-1">
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
      </MobileSlot>

      <MobilePage.Root className="space-y-4">
        <section className="border-b border-border/60 pb-4 dark:border-white/[0.07]">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100/90 ring-1 ring-orange-100 dark:bg-orange-500/12 dark:ring-orange-400/15">
                <User className="h-5 w-5 text-orange-600 dark:text-orange-200" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[0.95rem] font-semibold leading-5">
                  {customer.name}
                </h2>

                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {customer.dni && (
                    <div className="inline-flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>DNI: {customer.dni}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="inline-flex min-w-0 items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="max-w-[13rem] truncate">
                        {customer.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`grid gap-2 ${
                (balance?.balanceDue ?? 0) > 0 ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              <Button
                onClick={() => setShowSaleSheet(true)}
                className="h-10 rounded-lg bg-orange-500 text-sm hover:bg-orange-600"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Nueva venta
              </Button>
              {(balance?.balanceDue ?? 0) > 0 && (
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-lg text-sm"
                >
                  <Link to={`/cobros/nuevo?clienteId=${id}`}>
                    <Wallet className="mr-2 h-4 w-4" />
                    Registrar pago
                  </Link>
                </Button>
              )}
            </div>

            {balance && balance.totalSales > 0 && (
              <div className="space-y-3 border-t border-border/60 pt-3 dark:border-white/[0.07]">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Saldo pendiente
                    </p>
                    <p
                      className={`text-2xl font-bold leading-tight ${
                        (balance.balanceDue ?? 0) > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {(balance.balanceDue ?? 0) > 0
                        ? `S/ ${formatCurrency(balance.balanceDue)}`
                        : "Sin deuda"}
                    </p>
                  </div>
                  {balanceLoading ? (
                    <p className="pb-1 text-xs text-muted-foreground">
                      Calculando...
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="px-1 py-1">
                    <p className="text-xs text-muted-foreground">
                      Ventas crédito
                    </p>
                    <p className="text-sm font-semibold">
                      S/ {formatCurrency(balance.totalSales)}
                    </p>
                  </div>
                  <div className="border-l border-border/60 px-3 py-1 dark:border-white/[0.07]">
                    <p className="text-xs text-muted-foreground">Abonos</p>
                    <p className="text-sm font-semibold text-green-600">
                      S/ {formatCurrency(balance.totalPayments)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {mode === "agua" && customer.waterProfile && (
          <section className="shell-card-flat rounded-[22px] p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">
                  <Droplets className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Perfil de reparto</h3>
                  <p className="text-sm text-muted-foreground">
                    Programación y preferencias de entrega del cliente
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="shell-block-muted rounded-[20px] p-3">
                  <p className="text-xs text-muted-foreground">
                    Bidones habituales
                  </p>
                  <p className="text-lg font-semibold">
                    {customer.waterProfile.defaultContainerQuantity}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <CalendarDays className="mt-0.5 h-4 w-4" />
                  <span>
                    {customer.waterProfile.deliveryDays.length > 0
                      ? customer.waterProfile.deliveryDays
                          .map((day) => dayLabels[day] ?? day)
                          .join(", ")
                      : "Sin días programados"}
                  </span>
                </div>
                {customer.waterProfile.preferredRoute && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4" />
                    <span>{customer.waterProfile.preferredRoute}</span>
                  </div>
                )}
                {customer.waterProfile.waterRouteName && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <Route className="mt-0.5 h-4 w-4" />
                    <span>{customer.waterProfile.waterRouteName}</span>
                  </div>
                )}
                {customer.waterProfile.deliveryInstructions && (
                  <p className="rounded-[20px] bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-500/10 dark:text-sky-100">
                    {customer.waterProfile.deliveryInstructions}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <CustomerTagsModal />

        <ConfirmDialog />

        <CreateSaleTypeSheet
          open={showSaleSheet}
          onOpenChange={setShowSaleSheet}
          customerId={id}
        />

        <div className="space-y-3">
          <div className="flex border-b border-border/60 dark:border-white/[0.07]">
            <button
              onClick={() => setActiveTab("sales")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === "sales"
                  ? "border-b-2 border-orange-500 text-orange-600"
                  : "text-muted-foreground"
              }`}
            >
              Ventas ({customerSales.length})
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === "payments"
                  ? "border-b-2 border-orange-500 text-orange-600"
                  : "text-muted-foreground"
              }`}
            >
              Abonos ({payments.length})
            </button>
          </div>

          <div>
            {activeTab === "sales" ? (
              salesLoading ? (
                <p className="py-4 text-center text-muted-foreground">
                  Cargando ventas...
                </p>
              ) : customerSales.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">
                  No hay ventas registradas
                </p>
              ) : (
                customerSales.map((sale) => (
                  <Link
                    key={sale.id}
                    to={`/ventas/${sale.id}`}
                    className="block border-b border-border/60 px-1 py-3 transition-colors last:border-b-0 hover:bg-muted/35 dark:border-white/[0.07] dark:hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[0.95rem] font-semibold leading-5">
                          {sale.type === "pre_order" ? "Pedido" : "Venta"} a{" "}
                          {sale.saleType === "credito" ? "crédito" : "contado"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(sale.saleDate)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold">
                        S/ {formatCurrency(sale.totalAmount)}
                      </span>
                    </div>
                    {decimalToNumber(sale.balanceDue) > 0 ? (
                      <div className="mt-1 flex justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">
                          Saldo inicial
                        </span>
                        <span className="font-semibold text-red-600">
                          S/ {formatCurrency(sale.balanceDue)}
                        </span>
                      </div>
                    ) : null}
                  </Link>
                ))
              )
            ) : paymentsLoading ? (
              <p className="py-4 text-center text-muted-foreground">
                Cargando abonos...
              </p>
            ) : payments.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                No hay abonos registrados
              </p>
            ) : (
              payments.map((payment) => (
                <div
                  key={payment.id}
                  className="border-b border-border/60 px-1 py-3 last:border-b-0 dark:border-white/[0.07]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.95rem] font-semibold leading-5">
                        S/ {formatCurrency(payment.amount)}
                      </p>
                      <p className="mt-1 text-xs capitalize text-muted-foreground">
                        {payment.paymentMethod}
                      </p>
                      <p className="text-xs text-muted-foreground">
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
      </MobilePage.Root>
    </>
  );
}
