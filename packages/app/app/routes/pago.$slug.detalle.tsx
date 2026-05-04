import { useParams, useSearchParams } from "react-router";
import { AlertCircle, Calendar, CheckCircle2, CreditCard, ImageIcon, Store, User } from "lucide-react";
import { usePublicPaymentDetail } from "~/hooks/use-public-payment";
import { cn, formatCurrency } from "~/lib/utils";

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

const methodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  saldo: "Saldo",
};

export default function PublicPaymentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || undefined;
  const { data, isLoading, error } = usePublicPaymentDetail(slug, token);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fff7ed] p-6 text-stone-950">
        <div className="text-center">
          <CreditCard className="mx-auto mb-4 h-12 w-12 animate-pulse text-orange-500" />
          <p className="font-semibold">Cargando confirmación...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fff7ed] p-6 text-stone-950">
        <div className="w-full max-w-md rounded-[30px] border border-red-100 bg-white p-6 text-center shadow-xl">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="text-xl font-bold">Confirmación no disponible</h1>
          <p className="mt-2 text-sm text-stone-500">
            Este enlace no existe, expiró o ya no está disponible para compartir.
          </p>
        </div>
      </div>
    );
  }

  const { business, customer, payment } = data;

  return (
    <div className="min-h-screen bg-[#fff7ed] text-stone-950">
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
                Confirmación de pago
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-stone-950">
                {business.name}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-6 pb-12">
        <div
          className={cn(
            "mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold",
            "bg-emerald-100 text-emerald-800"
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          Pago confirmado
        </div>

        <div className="mb-4 rounded-[24px] border border-orange-100 bg-white p-5 shadow-[0_14px_34px_rgba(124,45,18,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-500">Monto pagado</p>
              <p className="text-3xl font-black text-stone-950">
                S/ {formatCurrency(payment.amount)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-stone-500">Método</p>
              <p className="font-semibold text-stone-900">
                {methodLabels[payment.paymentMethod] ?? payment.paymentMethod}
              </p>
            </div>
            <div>
              <p className="text-stone-500">Cliente</p>
              <p className="font-semibold text-stone-900">{customer.name}</p>
            </div>
          </div>

          {payment.referenceNumber ? (
            <div className="mt-4 rounded-2xl bg-stone-50 px-4 py-3 text-sm">
              <p className="text-stone-500">Número de operación</p>
              <p className="font-semibold text-stone-900">{payment.referenceNumber}</p>
            </div>
          ) : null}

          {payment.notes ? (
            <div className="mt-4 rounded-2xl bg-stone-50 px-4 py-3 text-sm">
              <p className="text-stone-500">Notas</p>
              <p className="font-medium text-stone-900">{payment.notes}</p>
            </div>
          ) : null}
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-[20px] border border-orange-100 bg-white px-4 py-3 text-stone-700 shadow-sm">
          <Calendar className="h-5 w-5 text-orange-600" />
          <span className="font-medium">{formatPublicDate(payment.createdAt)}</span>
        </div>

        {payment.proofImageUrl ? (
          <div className="mb-4 rounded-[24px] border border-orange-100 bg-white p-5 shadow-[0_14px_34px_rgba(124,45,18,0.08)]">
            <div className="mb-3 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-bold">Comprobante</h2>
            </div>
            <div className="overflow-hidden rounded-[20px] border border-orange-100 bg-[#fffaf5]">
              <img
                src={payment.proofImageUrl}
                alt="Comprobante del pago"
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
        ) : null}

        {(business.phone || business.address) && (
          <div className="rounded-[20px] border border-orange-100 bg-white p-4 text-center text-sm text-stone-500 shadow-sm">
            <div className="mb-2 inline-flex items-center gap-2 font-medium text-stone-700">
              <User className="h-4 w-4 text-orange-600" />
              {business.name}
            </div>
            {business.phone && <p>Teléfono: {business.phone}</p>}
            {business.address && <p>{business.address}</p>}
          </div>
        )}
      </main>
    </div>
  );
}
