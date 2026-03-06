import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { OrderForm } from "~/components/orders/order-form";

export default function NewOrderIndexPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center gap-3 h-16 px-3 sm:px-4">
          <Link
            to="/pedidos"
            className="p-2 -ml-2 rounded-xl hover:bg-orange-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold text-lg">Nuevo pedido</h1>
        </div>
      </header>

      <main className="px-3 py-4 sm:px-4 pb-32 max-w-lg mx-auto">
        <OrderForm />
      </main>
    </div>
  );
}
