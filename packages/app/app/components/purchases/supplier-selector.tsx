import { useState, useMemo } from "react";
import { Building2, Search, X, Plus, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { useSuppliers } from "~/hooks/use-suppliers";
import type { Supplier } from "~/hooks/use-suppliers";

interface SupplierSelectorProps {
  selectedSupplier: Supplier | null;
  onSelectSupplier: (supplier: Supplier | null) => void;
  onCreateNew?: () => void;
}

const supplierTypeLabels: Record<string, string> = {
  generic: "Genérico",
  regular: "Regular",
  internal: "Interno",
};

const supplierTypeColors: Record<string, string> = {
  generic: "bg-gray-100 text-gray-700",
  regular: "bg-orange-100 text-orange-700",
  internal: "bg-blue-100 text-blue-700",
};

export function SupplierSelector({
  selectedSupplier,
  onSelectSupplier,
  onCreateNew,
}: SupplierSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: suppliers, isLoading } = useSuppliers();

  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];
    if (!search.trim()) return suppliers.filter((s) => s.isActive);

    const searchLower = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.isActive &&
        (s.name.toLowerCase().includes(searchLower) ||
          s.ruc?.toLowerCase().includes(searchLower) ||
          s.phone?.toLowerCase().includes(searchLower))
    );
  }, [suppliers, search]);

  const handleOpen = () => {
    setIsOpen(true);
    setSearch("");
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearch("");
  };

  const handleSelect = (supplier: Supplier) => {
    onSelectSupplier(supplier);
    handleClose();
  };

  const handleClear = () => {
    onSelectSupplier(null);
  };

  const handleCreateNew = () => {
    handleClose();
    onCreateNew?.();
  };

  // Selected state - show card with details
  if (selectedSupplier) {
    return (
      <Card className="border-0 shadow-md rounded-2xl bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{selectedSupplier.name}</p>
                {selectedSupplier.ruc && (
                  <p className="text-sm text-muted-foreground">
                    RUC: {selectedSupplier.ruc}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className={`text-xs ${supplierTypeColors[selectedSupplier.type] || "bg-gray-100"}`}
                  >
                    {supplierTypeLabels[selectedSupplier.type] || selectedSupplier.type}
                  </Badge>
                  {selectedSupplier.phone && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedSupplier.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleOpen}
                className="rounded-xl text-orange-600 hover:text-orange-700 hover:bg-orange-100"
              >
                Cambiar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state - show trigger button
  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="w-full h-20 rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/50 hover:bg-orange-50 hover:border-orange-300 transition-colors flex flex-col items-center justify-center gap-2"
      >
        <Building2 className="h-6 w-6 text-orange-400" />
        <span className="text-sm text-orange-600 font-medium">
          Seleccionar proveedor
        </span>
      </button>

      <Drawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b pb-4">
            <DrawerTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-500" />
              Seleccionar Proveedor
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 py-4">
            {/* Search input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, RUC o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl"
                autoFocus
              />
            </div>

            {/* Suppliers list */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando proveedores...
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {search
                    ? "No se encontraron proveedores"
                    : "No hay proveedores registrados"}
                </div>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <button
                    key={supplier.id}
                    type="button"
                    onClick={() => handleSelect(supplier)}
                    className="w-full text-left"
                  >
                    <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow hover:bg-orange-50/50">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">
                              {supplier.name}
                            </h3>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${supplierTypeColors[supplier.type] || "bg-gray-100"}`}
                            >
                              {supplierTypeLabels[supplier.type] || supplier.type}
                            </Badge>
                          </div>
                          <div className="space-y-0.5 mt-1">
                            {supplier.ruc && (
                              <p className="text-xs text-muted-foreground">
                                RUC: {supplier.ruc}
                              </p>
                            )}
                            {supplier.phone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {supplier.phone}
                              </p>
                            )}
                            {supplier.address && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {supplier.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </button>
                ))
              )}
            </div>
          </div>

          <DrawerFooter className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCreateNew}
              className="w-full rounded-xl border-orange-200 hover:bg-orange-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo proveedor
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
