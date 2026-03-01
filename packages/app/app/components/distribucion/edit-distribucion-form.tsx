import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Distribucion } from "~/hooks/use-distribuciones";

interface EditDistribucionFormProps {
  distribucion: Distribucion;
  onSubmit: (data: Partial<Distribucion> & { id: string }) => void;
}

export function EditDistribucionForm({
  distribucion,
  onSubmit,
}: EditDistribucionFormProps) {
  const [formData, setFormData] = useState({
    puntoVenta: distribucion.puntoVenta,
    kilosAsignados: distribucion.kilosAsignados,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ id: distribucion.id, ...formData });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto"
    >
      <div className="space-y-2">
        <Label htmlFor="puntoVenta">Punto de Venta</Label>
        <Input
          id="puntoVenta"
          value={formData.puntoVenta}
          onChange={(e) =>
            setFormData({ ...formData, puntoVenta: e.target.value })
          }
          className="rounded-xl"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kilosAsignados">Kilos Asignados</Label>
        <Input
          id="kilosAsignados"
          type="number"
          step="0.1"
          min="0.1"
          value={formData.kilosAsignados}
          onChange={(e) =>
            setFormData({
              ...formData,
              kilosAsignados: parseFloat(e.target.value) || 0,
            })
          }
          className="rounded-xl"
          required
        />
      </div>

      {distribucion.items && distribucion.items.length > 0 && (
        <div className="space-y-2">
          <Label>Items Asignados (solo lectura)</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {distribucion.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {item.variant?.product?.name || "Producto"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.variant?.name || "Variante"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {item.cantidadAsignada} {item.unidad}
                  </p>
                  {item.cantidadVendida > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Vendido: {item.cantidadVendida} {item.unidad}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
      >
        Guardar Cambios
      </Button>
    </form>
  );
}
