import { useParams, useSearchParams } from "react-router";
import { AlertCircle, Calendar, CheckCircle2, CreditCard, Package, Store, User, XCircle } from "lucide-react";
import { usePublicSaleDetail } from "~/hooks/use-public-sale";
import { formatCurrency } from "~/lib/utils";
import { cn } from "~/lib/utils";

const statusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  active: { label: "Activa", className: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  delivered: { label: "Entregada", className: "bg-blue-100 text-blue-800", icon: CheckCircle2 },
  confirmed: { label: "Confirmada", className: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  cancelled: { label: "Cancelada", className: "bg-red-100 text-red-800", icon: XCircle },
};

function formatPublicDate(value: string | null | undefined) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PublicSaleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || undefined;
  const { data, isLoading, error } = usePublicSaleDetail(slug, token);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fff7ed] p-6 text-stone-950">
        <div className="text-center">
          <Package className="mx-auto mb-4 h-12 w-12 animate-pulse text-orange-500" />
          <p className="font-semibold">Cargando detalle...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fff7ed] p-6 text-stone-950">
        <div className="w-full max-w-md rounded-[30px] border border-red-100 bg-white p-6 text-center shadow-xl">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="text-xl font-bold">Detalle no disponible</h1>
          <p className="mt-2 text-sm text-stone-500">
            Este enlace no existe, expiró o la venta aún no está disponible para compartir.
          </p>
        </div>
      </div>
    );
  }

  const { business, sale } = data;
  const status = statusConfig[sale.status] || statusConfig.active;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-[#fff7ed] text-stone-950">
      {/* Header */}
      <header className="border-b border-orange-100 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg">
              {business.logoUrl ? (
                <img src={business.logoUrl} alt={business.name} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-7 w-7" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
                Comprobante de compra
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-stone-950">
                {business.name}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-2xl px-4 py-6 pb-12">
        {/* Status badge */}
        <div className={cn("mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold", status.className)}>
          <StatusIcon className="h-4 w-4" />
          {status.label}
        </div>

        {/* Sale summary card */}
        <div className="mb-4 rounded-[24px] border border-orange-100 bg-white p-5 shadow-[0_14px_34px_rgba(124,45,18,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-500">Total de la compra</p>
              <p className="text-3xl font-black text-stone-950">
                S/ {formatCurrency(sale.totalAmount)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-stone-500">Pagado</p>
              <p className="font-semibold text-stone-900">S/ {formatCurrency(sale.amountPaid)}</p>
            </div>
            {sale.saleType === "credito" && (
              <div>
                <p className="text-stone-500">Pendiente</p>
                <p className="font-semibold text-red-600">S/ {formatCurrency(sale.balanceDue)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Date */}
        <div className="mb-4 flex items-center gap-3 rounded-[20px] border border-orange-100 bg-white px-4 py-3 text-stone-700 shadow-sm">
          <Calendar className="h-5 w-5 text-orange-600" />
          <span className="font-medium">{formatPublicDate(sale.saleDate)}</span>
        </div>

        {/* Products */}
        <div className="mb-4 rounded-[24px] border border-orange-100 bg-white p-5 shadow-[0_14px_34px_rgba(124,45,18,0.08)]">
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-bold">Productos</h2>
          </div>

          <div className="space-y-3">
            {sale.items.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start justify-between gap-3 py-3",
                  index > 0 && "border-t border-stone-100"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">{item.productName}</p>
                    {item.variantName && item.variantName !== item.productName && (
                      <p className="text-sm text-stone-500">{item.variantName}</p>
                    )}
                    <p className="text-sm text-stone-500">
                      {formatCurrency(item.quantity, 3)} x S/ {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-stone-900">
                  S/ {formatCurrency(item.subtotal)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-stone-200 pt-3">
            <span className="text-sm text-stone-500">Total de productos</span>
            <span className="text-lg font-bold text-stone-950">
              S/ {formatCurrency(sale.totalAmount)}
            </span>
          </div>
        </div>

        {/* Payments */}
        {sale.payments.length > 0 && (
          <div className="mb-4 rounded-[24px] border border-orange-100 bg-white p-5 shadow-[0_14px_34px_rgba(124,45,18,0.08)]">
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-bold">Pagos realizados</h2>
            </div>

            <div className="space-y-3">
              {sale.payments.map((payment, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center justify-between py-3",
                    index > 0 && "border-t border-stone-100"
                  )}
                >
                  <div>
                    <p className="font-medium text-stone-900 capitalize">{payment.method}</p>
                    <p className="text-sm text-stone-500">{formatPublicDate(payment.paymentDate)}</p>
                  </div>
                  <span className="font-bold text-emerald-700">
                    S/ {formatCurrency(payment.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer info */}
        {(business.phone || business.address) && (
          <div className="rounded-[20px] border border-orange-100 bg-white p-4 text-center text-sm text-stone-500 shadow-sm">
            {business.phone && <p>Teléfono: {business.phone}</p>}
            {business.address && <p>{business.address}</p>}
          </div>
        )}
      </main>
    </div>
  );
}
