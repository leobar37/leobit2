import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { OrderForm } from "~/components/orders/order-form";

export default function NewOrderIndexPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-3 py-4 sm:px-4 pb-32 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-orange-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-xl">Nuevo pedido</h1>
        </div>
        <OrderForm />
      </main>
    </div>
  );
}
