import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft, User, Phone, MapPin, CreditCard, Wallet, History, Pencil } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useCustomer } from "~/hooks/use-customer";
import { useSales } from "~/hooks/use-sales";
import { usePayments } from "~/hooks/use-payments";
import { PaymentForm } from "~/components/payments/payment-form";
import { PaymentList } from "~/components/payments/payment-list";
import { SaleList } from "~/components/sales/sale-list";
import { BalanceCard } from "~/components/payments/balance-card";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"sales" | "payments">("sales");

  const { data: customer, isLoading: customerLoading } = useCustomer(id!);
  const { data: sales, isLoading: salesLoading } = useSales();
  const { data: payments, isLoading: paymentsLoading } = usePayments(id);

  const customerSales = sales?.filter((sale) => sale.clientId === id) || [];
  const customerPayments = payments || [];

  const totalDebt = customerSales
    .filter((sale) => sale.saleType === "credito")
    .reduce((sum, sale) => sum + parseFloat(sale.balanceDue || "0"), 0);

  const totalPaid = customerPayments.reduce(
    (sum, payment) => sum + parseFloat(payment.amount),
    0
  );

  const currentBalance = totalDebt - totalPaid;

  if (customerLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100 flex items-center justify-center">
        <p>Cargando cliente...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100 flex items-center justify-center">
        <p>Cliente no encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center gap-3 h-16 px-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-orange-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-lg truncate">{customer.name}</h1>
          <Link
            to={`/clientes/${id}/edit`}
            className="p-2 rounded-xl hover:bg-orange-50 ml-auto"
            onClick={() => console.log('[CustomerDetailPage] Clicking edit link, navigating to:', `/clientes/${id}/edit`)}
          >
            <Pencil className="h-5 w-5 pointer-events-none" />
          </Link>
        </div>
      </header>

      <main className="p-4 pb-32 space-y-4">
        {/* Customer Info Card */}
        <Card className="border-0 shadow-md rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 text-orange-600" />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg">{customer.name}</h2>

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

        {/* Balance Card */}
        <BalanceCard
          balance={currentBalance}
          onRegisterPayment={() => setShowPaymentForm(true)}
        />

        {/* Payment Form Modal */}
        {showPaymentForm && (
          <PaymentForm
            clientId={id!}
            onClose={() => setShowPaymentForm(false)}
            maxAmount={currentBalance}
          />
        )}

        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("sales")}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                activeTab === "sales"
                  ? "border-b-2 border-orange-500 text-orange-600"
                  : "text-muted-foreground"
              }`}
            >
              <History className="h-4 w-4" />
              Ventas ({customerSales.length})
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                activeTab === "payments"
                  ? "border-b-2 border-orange-500 text-orange-600"
                  : "text-muted-foreground"
              }`}
            >
              <Wallet className="h-4 w-4" />
              Abonos ({customerPayments.length})
            </button>
          </div>

          <div className="p-4">
            {activeTab === "sales" && (
              <>
                {salesLoading ? (
                  <p className="text-center text-muted-foreground py-4">
                    Cargando ventas...
                  </p>
                ) : customerSales.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No hay ventas registradas
                  </p>
                ) : (
                  <SaleList sales={customerSales} showCustomer={false} />
                )}
              </>
            )}

            {activeTab === "payments" && (
              <>
                {paymentsLoading ? (
                  <p className="text-center text-muted-foreground py-4">
                    Cargando abonos...
                  </p>
                ) : (
                  <PaymentList
                    payments={customerPayments}
                    emptyMessage="No hay abonos registrados"
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
