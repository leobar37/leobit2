import { useState } from "react";
import { User, X, ChevronDown, TrendingUp, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppDrawer } from "~/components/ui/app-drawer";
import { useCustomers } from "~/hooks/use-customers";
import {
  QuickCustomerModal,
  useQuickCustomerModal,
} from "~/components/customers/quick-customer-modal";
import { useCustomerBalance } from "~/hooks/use-customer-balance";
import { getDebtLevel } from "~/lib/debt";
import { formatCurrency, cn } from "~/lib/utils";

interface CustomerSelectProps {
  value: string | null;
  selectedCustomer?: { id: string; name: string; phone?: string | null } | null;
  onChange: (
    customer: { id: string; name: string; phone?: string | null } | null,
  ) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  helperText?: string;
}

export function CustomerSelect({
  value,
  selectedCustomer: propSelectedCustomer,
  onChange,
  disabled = false,
  placeholder = "Seleccionar cliente",
  required = false,
  helperText,
}: CustomerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: customers = [], isLoading } = useCustomers(
    searchQuery ? { search: searchQuery } : undefined,
  );
  const { data: balanceData } = useCustomerBalance(value);
  const quickCustomerModal = useQuickCustomerModal();

  // Find selected customer - first check props, then search in loaded customers
  const selectedCustomer =
    propSelectedCustomer || customers.find((c) => c.id === value);

  const handleSelectCustomer = (customer: {
    id: string;
    name: string;
    phone?: string | null;
  }) => {
    onChange(customer);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClearCustomer = () => {
    onChange(null);
  };

  return (
    <>
      <Card
        className={cn(
          "cursor-pointer rounded-[24px] border-0 shadow-none transition-colors",
          "bg-white/80 hover:bg-orange-50/75",
          "dark:bg-white/[0.04] dark:hover:bg-white/[0.07]",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-500/12 text-orange-600 dark:text-orange-300">
                <User className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {selectedCustomer?.name || placeholder}
                </p>
                {selectedCustomer?.phone && (
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedCustomer.phone}
                  </p>
                )}
                {selectedCustomer && balanceData && balanceData.balanceDue > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className={cn("h-3.5 w-3.5", getDebtLevel(balanceData.balanceDue).color)} />
                    <span className={cn("text-sm font-medium", getDebtLevel(balanceData.balanceDue).color)}>
                      Debe: S/ {formatCurrency(balanceData.balanceDue)}
                    </span>
                  </div>
                )}
                {!selectedCustomer && required && (
                  <p className="text-sm text-orange-600">
                    {helperText || "Seleccione un cliente"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {selectedCustomer && !disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearCustomer();
                  }}
                  className="rounded-2xl text-muted-foreground hover:bg-red-500/10 hover:text-destructive"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                disabled={disabled}
                className={cn(
                  "rounded-2xl text-muted-foreground hover:bg-white/70 hover:text-foreground dark:hover:bg-white/[0.08]",
                  isOpen && "bg-orange-500/15 text-orange-600 dark:text-orange-300",
                )}
              >
                <ChevronDown
                  className={cn(
                    "h-5 w-5 transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AppDrawer open={isOpen} onOpenChange={setIsOpen} size="large">
        <AppDrawer.Header
          title="Seleccionar cliente"
          icon={<User className="h-5 w-5" />}
          onClose={() => setIsOpen(false)}
        />

        <AppDrawer.Body className="space-y-3">
          <Input
            placeholder="Buscar cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl"
          />

          {/* Create button - always visible at top */}
          <button
            type="button"
            onClick={() =>
              quickCustomerModal.open({
                initialName: searchQuery,
                onSuccess: (customer) => {
                  handleSelectCustomer(customer);
                },
              })
            }
            className={cn(
              "w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
              searchQuery && customers.length === 0
                ? "border-orange-300 bg-orange-50/70 hover:bg-orange-50"
                : "border-dashed border-orange-300/60 hover:bg-orange-50/30",
            )}
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100/50">
              <Plus className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-orange-700">
                {searchQuery && customers.length === 0
                  ? `Crear "${searchQuery}"`
                  : "Crear nuevo cliente"}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchQuery && customers.length === 0
                  ? "No se encontraron resultados"
                  : "Agregar cliente rápido"}
              </p>
            </div>
          </button>

          <div className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Cargando clientes...
              </p>
            ) : customers.length === 0 && !searchQuery ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No hay clientes registrados
              </p>
            ) : (
              customers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                    value === customer.id
                      ? "shell-card-muted border-orange-300 bg-orange-50/90"
                      : "border-white/70 bg-white/60 hover:bg-white/82",
                  )}
                >
                  <div className="shell-card-muted flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100/80">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{customer.name}</p>
                    {customer.phone && (
                      <p className="text-sm text-muted-foreground truncate">
                        {customer.phone}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </AppDrawer.Body>
      </AppDrawer>

      <QuickCustomerModal />
    </>
  );
}
