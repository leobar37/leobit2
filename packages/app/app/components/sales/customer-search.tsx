import { useDeferredValue, useMemo, useState, type UIEvent } from "react";
import { Search, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useCustomers } from "~/hooks/use-customers-live";
import type { Customer } from "~/lib/db/schema";

interface CustomerSearchProps {
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
}

export function CustomerSearch({ selectedCustomer, onSelectCustomer }: CustomerSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const { data: customers, isLoading } = useCustomers();
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredCustomers = useMemo(() => {
    const customerList = customers ?? [];

    if (!deferredSearch) {
      return customerList;
    }

    return customerList.filter(
      (customer) =>
        customer.name.toLowerCase().includes(deferredSearch) ||
        customer.dni?.toLowerCase().includes(deferredSearch) ||
        customer.phone?.toLowerCase().includes(deferredSearch)
    );
  }, [customers, deferredSearch]);

  const displayedCustomers = filteredCustomers.slice(0, visibleCount);
  const hasMore = filteredCustomers.length > displayedCustomers.length;

  const openDrawer = () => {
    setIsOpen(true);
    setVisibleCount(50);
  };

  const closeDrawer = () => {
    setIsOpen(false);
    setSearch("");
    setVisibleCount(50);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setVisibleCount(50);
  };

  const handleListScroll = (event: UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const reachedBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 80;

    if (reachedBottom && hasMore) {
      setVisibleCount((current) => current + 50);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    closeDrawer();
  };

  return (
    <>
      {selectedCustomer ? (
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
              type="button"
              variant="ghost"
              size="sm"
              onClick={openDrawer}
              className="rounded-xl text-orange-600 hover:text-orange-700 hover:bg-orange-100"
            >
              Cambiar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onSelectCustomer(null)}
              aria-label="Limpiar cliente seleccionado"
              className="rounded-xl"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      ) : (
      <button
        type="button"
        onClick={openDrawer}
        className="w-full h-20 rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/50 hover:bg-orange-50 hover:border-orange-300 transition-colors flex flex-col items-center justify-center gap-2"
      >
        <User className="h-6 w-6 text-orange-400" />
        <span className="text-sm text-orange-600 font-medium">Seleccionar cliente</span>
      </button>
      )}

      <Drawer
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            closeDrawer();
          }
        }}
      >
        <DrawerContent className="flex flex-col max-h-[85vh]">
          <DrawerHeader className="border-b pb-4">
            <DrawerTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-orange-500" />
              Seleccionar Cliente
            </DrawerTitle>
            <DrawerDescription>
              Busca o explora clientes para seleccionar uno en la venta.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, DNI o teléfono..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 rounded-xl"
                aria-label="Buscar clientes"
                autoFocus
              />
            </div>

            <div
              className="space-y-2 flex-1 overflow-y-auto"
              onScroll={handleListScroll}
              aria-live="polite"
            >
              className="space-y-2 max-h-[50vh] overflow-y-auto"
              onScroll={handleListScroll}
              aria-live="polite"
            >
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando clientes...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {search ? "No se encontraron clientes" : "No hay clientes registrados"}
                </div>
              ) : (
                displayedCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full text-left"
                  >
                    <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow hover:bg-orange-50/50">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-orange-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{customer.name}</h3>
                          <div className="space-y-0.5 mt-1">
                            {customer.dni && (
                              <p className="text-xs text-muted-foreground">DNI: {customer.dni}</p>
                            )}
                            {customer.phone && (
                              <p className="text-xs text-muted-foreground">Tel: {customer.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </button>
                ))
              )}

              {hasMore && !isLoading && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVisibleCount((current) => current + 50)}
                  className="w-full rounded-xl"
                >
                  Ver más clientes
                </Button>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
