import { useState, useEffect } from "react";
import { Box, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "~/lib/utils";
import { useUnitsByProduct } from "~/hooks/use-product-units";
import type { ProductUnit } from "~/hooks/use-product-units";

interface UnitSelectorProps {
  productId: string;
  selectedUnitId?: string;
  onSelect: (unit: ProductUnit) => void;
  onCancel?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UnitSelector({
  productId,
  selectedUnitId,
  onSelect,
  onCancel,
  open = true,
  onOpenChange,
}: UnitSelectorProps) {
  const [selectedUnit, setSelectedUnit] = useState<ProductUnit | null>(null);

  const { data: units, isLoading } = useUnitsByProduct(productId, { isActive: true });

  const handleSelectUnit = (unit: ProductUnit) => {
    setSelectedUnit(unit);
  };

  const handleConfirm = () => {
    if (selectedUnit) {
      onSelect(selectedUnit);
      handleClose();
    }
  };

  const handleClose = () => {
    onOpenChange?.(false);
    setSelectedUnit(null);
    onCancel?.();
  };

  const activeUnits = units?.filter((u) => u.isActive) || [];

  useEffect(() => {
    if (activeUnits.length > 0 && !selectedUnit) {
      const defaultUnit = selectedUnitId
        ? activeUnits.find((u) => u.id === selectedUnitId)
        : activeUnits[0];
      setSelectedUnit(defaultUnit || null);
    }
  }, [activeUnits, selectedUnitId, selectedUnit]);

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
          return;
        }
        onOpenChange?.(true);
      }}
    >
      <DrawerContent className="flex flex-col max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Box className="h-5 w-5 text-orange-500" />
            Seleccionar Unidad
            {activeUnits.length > 1 && (
              <Badge variant="secondary" className="text-xs ml-1">
                {activeUnits.length} unidades
              </Badge>
            )}
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-2">
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando unidades...
              </div>
            ) : activeUnits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay unidades activas para este producto
              </div>
            ) : (
              activeUnits.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => handleSelectUnit(unit)}
                  className="w-full text-left"
                >
                  <Card
                    className={cn(
                      "p-3 cursor-pointer transition-all",
                      selectedUnit?.id === unit.id
                        ? "ring-2 ring-orange-500 bg-orange-50"
                        : "hover:shadow-md"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{unit.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {unit.displayName}
                        </p>
                        <p className="text-sm text-orange-600 font-semibold">
                          {unit.baseUnitQuantity} {unit.baseUnit}
                        </p>
                      </div>
                      {selectedUnit?.id === unit.id && (
                        <ChevronRight className="h-5 w-5 text-orange-500" />
                      )}
                    </div>
                  </Card>
                </button>
              ))
            )}
          </div>
        </div>

        {selectedUnit && (
          <div className="border-t pt-4 mt-2">
            <Button
              onClick={handleConfirm}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              Confirmar Unidad
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
