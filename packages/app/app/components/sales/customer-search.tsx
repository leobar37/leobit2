import { useState } from "react";
import { Search, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCustomers } from "~/hooks/use-customers-live";
import type { Customer } from "~/lib/db/schema";

interface CustomerSearchProps {
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
}

export function CustomerSearch({ selectedCustomer, onSelectCustomer }: CustomerSearchProps) {
  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(false);
  const { data: customers, isLoading } = useCustomers();

  const filteredCustomers = customers?.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dni?.includes(search) ||
      c.phone?.includes(search)
  );

  if (selectedCustomer) {
    return (
      <Card className="border-0 shadow-md rounded-2xl bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <User className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold">{selectedCustomer.name}</p>
                {selectedCustomer.phone && (
                  <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSelectCustomer(null)}
              className="rounded-xl"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente (DNI, nombre, teléfono)..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowList(true);
          }}
          onFocus={() => setShowList(true)}
          className="pl-10 rounded-xl"
        />
      </div>

      {showList && search && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowList(false)}
          />
          <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-64 overflow-auto border-0 shadow-lg rounded-2xl">
            {isLoading && (
              <CardContent className="p-4 text-center text-muted-foreground">
                Cargando...
              </CardContent>
            )}

            {filteredCustomers?.length === 0 && (
              <CardContent className="p-4 text-center text-muted-foreground">
                No se encontraron clientes
              </CardContent>
            )}

            {filteredCustomers?.map((customer) => (
              <button
                key={customer.id}
                onClick={() => {
                  onSelectCustomer(customer);
                  setShowList(false);
                  setSearch("");
                }}
                className="w-full p-4 flex items-center gap-3 hover:bg-orange-50 transition-colors border-b last:border-b-0"
              >
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <User className="h-4 w-4 text-orange-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">{customer.name}</p>
                  {customer.dni && (
                    <p className="text-sm text-muted-foreground">DNI: {customer.dni}</p>
                  )}
                </div>
              </button>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
