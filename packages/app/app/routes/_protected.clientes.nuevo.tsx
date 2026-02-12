import { Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { CustomerForm, type CustomerFormData } from "~/components/customers/customer-form";
import { useCreateCustomer } from "~/hooks/use-customers-live";

export default function NewCustomerPage() {
  const navigate = useNavigate();
  const createCustomer = useCreateCustomer();

  const handleSubmit = async (data: CustomerFormData) => {
    try {
      await createCustomer.mutateAsync(data);
      navigate("/clientes");
    } catch (error) {
      console.error("Error al crear cliente", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center gap-3 h-16 px-4">
          <Link to="/clientes" className="p-2 -ml-2 rounded-xl hover:bg-orange-50">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold text-lg">Nuevo Cliente</h1>
        </div>
      </header>

      <main className="p-4 pb-24">
        <CustomerForm
          onSubmit={handleSubmit}
          isLoading={createCustomer.isPending}
        />
      </main>
    </div>
  );
}
