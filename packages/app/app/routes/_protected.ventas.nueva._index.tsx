import { Link, useNavigate } from "react-router";
import { formatCurrency } from "~/lib/utils";
import { ArrowLeft, Calculator, Plus, ShoppingCart } from "lucide-react";
import {
  CartSection,
  CustomerSection,
  PaymentModeSection,
  SaleSummaryCard,
  SubmitSaleButton,
} from "~/components/sales/new-sale";
import { useSaleStore, getTotalAmount } from "~/stores/sale.store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function HeaderTotal() {
  const cartItems = useSaleStore((state) => state.cartItems);
  const totalAmount = getTotalAmount(cartItems);

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 bg-orange-500 text-white px-3 py-1.5 rounded-full">
      <ShoppingCart className="h-4 w-4" />
      <span className="font-semibold text-sm">S/ {formatCurrency(totalAmount)}</span>
    </div>
  );
}

export default function NewSaleIndexPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center justify-between h-16 px-3 sm:px-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-orange-50">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-bold text-lg">Nueva Venta</h1>
          </div>
          <HeaderTotal />
        </div>
      </header>

      <main className="px-3 py-4 sm:px-4 pb-32 space-y-4">
        <CustomerSection />
        <PaymentModeSection />

        <section id="calculator-section" className="space-y-3" data-testid="calculator-section">
          <Card
            className="border-0 shadow-md rounded-2xl bg-card cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/ventas/nueva/calculadora")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Calculator className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Calculadora</p>
                  <p className="text-sm text-muted-foreground">Toca para calcular un producto</p>
                </div>
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/ventas/nueva/calculadora");
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <CartSection />
        <SaleSummaryCard />
      </main>

      <SubmitSaleButton />
    </div>
  );
}
