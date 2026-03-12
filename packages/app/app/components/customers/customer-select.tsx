import { useState } from "react";
import { User, X, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppDrawer } from "~/components/ui/app-drawer";
import { useCustomers } from "~/hooks/use-customers";
import { cn } from "~/lib/utils";

interface CustomerSelectProps {
  value: string | null;
  selectedCustomer?: { id: string; name: string; phone?: string | null } | null;
  onChange: (customer: { id: string; name: string; phone?: string | null } | null) => void;
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
  const { data: customers = [], isLoading } = useCustomers(searchQuery);

  // Find selected customer - first check props, then search in loaded customers
  const selectedCustomer = propSelectedCustomer || customers.find((c) => c.id === value);

  const handleSelectCustomer = (customer: { id: string; name: string; phone?: string | null }) => {
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
          "border-0 rounded-2xl bg-card cursor-pointer transition-colors",
          !disabled && "hover:bg-accent",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="h-6 w-6 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {selectedCustomer?.name || placeholder}
                </p>
                {selectedCustomer?.phone && (
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedCustomer.phone}
                  </p>
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
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                disabled={disabled}
                className={cn(isOpen && "bg-orange-100")}
              >
                <ChevronDown
                  className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")}
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

          <div className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Cargando clientes...
              </p>
            ) : customers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No se encontraron clientes
              </p>
            ) : (
              customers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left",
                    value === customer.id
                      ? "bg-orange-100 border-2 border-orange-500"
                      : "hover:bg-orange-50 border-2 border-transparent"
                  )}
                >
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
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
    </>
  );
}
