import { Link, useNavigate } from "react-router";
import { Search, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SyncStatus } from "~/components/sync/sync-status";
import { useCustomers } from "~/hooks/use-customers-live";
import { CustomerCard } from "~/components/customers/customer-card";
import { useSetLayout } from "~/components/layout/app-layout";

export default function CustomersPage() {
  useSetLayout({ title: "Clientes", actions: <SyncStatus /> });

  const [search, setSearch] = useState("");
  const { data: customers, isLoading, error } = useCustomers();
  const navigate = useNavigate();

  const filteredCustomers = customers?.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.dni?.includes(search)
  );

  return (
    <>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Cargando clientes...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">Error al cargar clientes</p>
          </div>
        )}

        {filteredCustomers?.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No se encontraron clientes</p>
          </div>
        )}

        <div className="space-y-3">
          {filteredCustomers?.map((customer) => (
            <Link
              key={customer.id}
              to={`/clientes/${customer.id}`}
              className="block"
            >
              <CustomerCard customer={customer} />
            </Link>
          ))}
        </div>
      </div>

      <Link
        to="/clientes/nuevo"
        className="fixed bottom-20 right-4 z-50"
      >
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </>
  );
}
