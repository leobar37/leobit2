import { Link, useNavigate } from "react-router";
import { ChevronRight, Plus, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomers } from "~/hooks/use-customers";
import { useListSearch } from "~/hooks/use-list-search";
import { useSetLayout } from "~/components/layout/app-layout";

export default function CustomersPage() {
  const { data: customers, isLoading } = useCustomers();
  const navigate = useNavigate();

  // Use centralized search hook
  const { filteredItems, search, setSearch } = useListSearch({
    items: customers,
    searchFields: [
      (customer) => customer.name,
      (customer) => customer.dni ?? undefined,
      (customer) => customer.phone ?? undefined,
    ],
  });

  useSetLayout({ title: "Clientes" });

  return (
    <>
      <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-12 rounded-[20px] border-stone-200/80 bg-white/75 pl-11 pr-4 shadow-[0_1px_6px_rgba(15,23,42,0.02)] placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-orange-200"
        />
      </div>

        {isLoading ? (
          <div className="py-8 text-center">
            <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Cargando clientes...</p>
          </div>
        ) : filteredItems?.length === 0 ? (
          <div className="py-8 text-center">
            <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">No hay clientes</p>
            <Button onClick={() => navigate("/clientes/nuevo")}>Crear primer cliente</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems?.map((customer) => (
              <Link
                key={customer.id}
                to={`/clientes/${customer.id}`}
                className="block rounded-[24px] border border-stone-200/80 bg-white/80 p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition-colors hover:border-stone-300/90"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[1.05rem] font-semibold text-foreground sm:text-lg">
                      {customer.name}
                    </p>
                    {customer.dni && (
                      <p className="mt-1 text-sm text-muted-foreground">DNI: {customer.dni}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pl-2">
                    {customer.phone && (
                      <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    )}
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground ring-1 ring-stone-200/90">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Button
        size="icon"
        className="fixed right-4 bottom-28 z-50 h-14 w-14 rounded-full bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
        onClick={() => navigate("/clientes/nuevo")}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </>
  );
}
