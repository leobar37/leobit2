import { Search, User, X, Plus } from "lucide-react";
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
import { useCustomerSearch } from "~/hooks/use-customer-search";
import type { Customer } from "~/lib/db/schema";

interface CustomerSearchProps {
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
}

export function CustomerSearch({ selectedCustomer, onSelectCustomer }: CustomerSearchProps) {
  const {
    isOpen,
    search,
    showCreateForm,
    newCustomerName,
    newCustomerPhone,
    displayedCustomers,
    hasMore,
    isValidName,
    isLoading,
    isCreating,
    filteredCustomers,
    openDrawer,
    closeDrawer,
    handleSearchChange,
    handleListScroll,
    handleSelectCustomer,
    handleCreateCustomer,
    setShowCreateForm,
    setNewCustomerName,
    setNewCustomerPhone,
    setIsOpen,
    setVisibleCount,
  } = useCustomerSearch({ onSelectCustomer });

  return (
    <>
      {selectedCustomer ? (
        <Card className="border-0 shadow-md rounded-2xl bg-orange-50" data-testid="customer-selected-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <User className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold" data-testid="customer-selected-name">{selectedCustomer.name}</p>
                  {selectedCustomer.phone && (
                    <p className="text-sm text-muted-foreground" data-testid="customer-selected-phone">{selectedCustomer.phone}</p>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={openDrawer}
                data-testid="customer-change-button"
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
                data-testid="customer-clear-button"
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
          data-testid="customer-select-button"
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
        data-testid="customer-drawer"
      >
        <DrawerContent className="flex flex-col max-h-[85vh] p-0">
          <DrawerHeader className="border-b px-4 pb-4 pt-2">
            <DrawerTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-orange-500" />
              Seleccionar Cliente
            </DrawerTitle>
            <DrawerDescription>
              Busca o explora clientes para seleccionar uno en la venta.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 py-4 relative">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, DNI o teléfono..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 rounded-xl"
                aria-label="Buscar clientes"
                data-testid="customer-search-input"
                autoFocus
              />
            </div>

            <div
              className="space-y-2 flex-1 overflow-y-auto max-h-[50vh]"
              onScroll={handleListScroll}
              aria-live="polite"
              data-testid="customer-list"
            >
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando clientes...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="customer-empty-state">
                  {search ? "No se encontraron clientes" : "No hay clientes registrados"}
                </div>
              ) : (
                displayedCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelectCustomer(customer)}
                    data-testid={`customer-option-${customer.id}`}
                    className="w-full text-left"
                  >
                    <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow hover:bg-orange-50/50">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-orange-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate" data-testid="customer-option-name">{customer.name}</h3>
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
                  onClick={() => setVisibleCount((c) => c + 50)}
                  data-testid="customer-load-more"
                  className="w-full rounded-xl"
                >
                  Ver más clientes
                </Button>
              )}
            </div>

            {!showCreateForm && (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="absolute bottom-4 right-4 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
                aria-label="Crear nuevo cliente"
              >
                <Plus className="h-6 w-6" />
              </button>
            )}

            {showCreateForm && (
              <div className="mt-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <p className="text-sm font-medium text-orange-800 mb-3">Nuevo cliente</p>
                <div className="space-y-3">
                  <Input
                    placeholder="Nombre *"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="rounded-xl bg-white"
                    autoFocus
                  />
                  <Input
                    placeholder="Teléfono (opcional)"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="rounded-xl bg-white"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewCustomerName("");
                        setNewCustomerPhone("");
                      }}
                      className="flex-1 rounded-xl"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCreateCustomer}
                      disabled={!isValidName || isCreating}
                      className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
                    >
                      {isCreating ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
