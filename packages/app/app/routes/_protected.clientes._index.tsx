import { Link, useNavigate } from "react-router";
import { Search, Plus, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomers } from "~/hooks/use-live-customers";
import { useSetLayout } from "~/components/layout/app-layout";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  
  const { data: customers, isLoading } = useCustomers(search || undefined);
  const navigate = useNavigate();

  // Filter customers by search
  const filteredCustomers = customers?.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.dni?.includes(search)
  );

  useSetLayout({ title: "Clientes" });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-end">
        <Button
          onClick={() => navigate("/clientes/nuevo")}
          className="bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customers List */}
      {isLoading ? (
        <div className="text-center py-8">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Cargando clientes...</p>
        </div>
      ) : filteredCustomers?.length === 0 ? (
        <div className="text-center py-8">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No hay clientes</p>
          <Button onClick={() => navigate("/clientes/nuevo")}>Crear primer cliente</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers?.map((customer) => (
            <Link
              key={customer.id}
              to={`/clientes/${customer.id}`}
              className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{customer.name}</p>
                  {customer.dni && (
                    <p className="text-sm text-muted-foreground">DNI: {customer.dni}</p>
                  )}
                </div>
                {customer.phone && (
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
