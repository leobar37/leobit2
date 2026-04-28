import { useState } from "react";
import { Truck, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppDrawer } from "~/components/ui/app-drawer";
import { useSuppliers, type Supplier } from "~/hooks/use-suppliers";
import { useBusiness } from "~/hooks/use-business";
import { cn } from "~/lib/utils";

interface SupplierSelectorProps {
  selectedSupplier: Supplier | null;
  onSelectSupplier: (supplier: Supplier | null) => void;
  disabled?: boolean;
}

export function SupplierSelector({
  selectedSupplier,
  onSelectSupplier,
  disabled = false,
}: SupplierSelectorProps) {
  const { data: business } = useBusiness();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: suppliers = [], isLoading } = useSuppliers();

  const handleSelectSupplier = (supplier: Supplier) => {
    onSelectSupplier(supplier);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClearSupplier = () => {
    onSelectSupplier(null);
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
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {selectedSupplier?.name || "Seleccionar proveedor"}
                </p>
                {selectedSupplier?.phone && (
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedSupplier.phone}
                  </p>
                )}
                {!selectedSupplier && (
                  <p className="text-sm text-blue-600">
                    Opcional - puedes omitirlo
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {selectedSupplier && !disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearSupplier();
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
                className={cn(isOpen && "bg-blue-100")}
              >
                <Truck
                  className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")}
                />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AppDrawer open={isOpen} onOpenChange={setIsOpen} size="large">
        <AppDrawer.Header
          title="Seleccionar proveedor"
          icon={<Truck className="h-5 w-5" />}
          onClose={() => setIsOpen(false)}
        />

        <AppDrawer.Body className="space-y-3">
          <Input
            placeholder="Buscar proveedor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl"
          />

          <div className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Cargando proveedores...
              </p>
            ) : suppliers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No se encontraron proveedores
              </p>
            ) : (
              suppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  type="button"
                  onClick={() => handleSelectSupplier(supplier)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left",
                    selectedSupplier?.id === supplier.id
                      ? "bg-blue-100 border-2 border-blue-500"
                      : "hover:bg-blue-50 border-2 border-transparent"
                  )}
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Truck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{supplier.name}</p>
                    {supplier.phone && (
                      <p className="text-sm text-muted-foreground truncate">
                        {supplier.phone}
                      </p>
                    )}
                    {supplier.ruc && (
                      <p className="text-xs text-muted-foreground truncate">
                        RUC: {supplier.ruc}
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
