import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { type CreateDistribucionInput } from "~/hooks/use-distribuciones";
import { type CustomerGroup } from "~/hooks/use-grupos";
import { VendedorSelect, type VendedorOption } from "./vendedor-select";
import { GroupSelect } from "./group-select";
import { PuntoVentaSelect } from "./punto-venta-select";
import { type PuntoVenta } from "~/hooks/use-puntos-venta";

type ModoDistribucion = "estricto" | "acumulativo" | "libre";

interface CreateDistribucionFormProps {
  onSubmit: (data: CreateDistribucionInput) => void;
  isPending?: boolean;
  onValidityChange?: (isValid: boolean) => void;
}

export interface CreateDistribucionFormRef {
  submit: () => void;
}

export const CreateDistribucionForm = forwardRef<CreateDistribucionFormRef, CreateDistribucionFormProps>(
  function CreateDistribucionForm({ onSubmit, isPending = false, onValidityChange }, ref) {
    const [selectedVendedor, setSelectedVendedor] = useState<VendedorOption | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(null);
    const [selectedPuntoVenta, setSelectedPuntoVenta] = useState<PuntoVenta | null>(null);
    // Modo is always 'libre' - hiding selector temporarily
    const modo: ModoDistribucion = "libre";

    const isValid = !!selectedVendedor && !!selectedPuntoVenta;

    useEffect(() => {
      onValidityChange?.(isValid);
    }, [isValid, onValidityChange]);



    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedVendedor || !selectedPuntoVenta) return;

      onSubmit({
        vendedorId: selectedVendedor.id,
        puntoVenta: selectedPuntoVenta.name,
        puntoVentaId: selectedPuntoVenta.id,
        groupId: selectedGroup?.id,
        modo: modo,
        items: [], // Empty items for 'libre' mode - products registered on close
      });
    };

    useImperativeHandle(ref, () => ({
      submit: () => {
        if (isValid) {
          handleSubmit({ preventDefault: () => {} } as React.FormEvent);
        }
      },
    }));

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Vendedor *</Label>
          <VendedorSelect
            value={selectedVendedor?.id || null}
            selectedVendedor={selectedVendedor}
            onChange={setSelectedVendedor}
            required
            helperText="Seleccione un vendedor"
          />
        </div>

        <div className="space-y-2">
          <Label>Punto de Venta *</Label>
          <PuntoVentaSelect
            value={selectedPuntoVenta?.id || null}
            selectedPuntoVenta={selectedPuntoVenta}
            onChange={setSelectedPuntoVenta}
            required
            helperText="Seleccione un punto de venta"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Grupo de Clientes
          </Label>
          <GroupSelect
            value={selectedGroup?.id || null}
            selectedGroup={selectedGroup}
            onChange={setSelectedGroup}
            helperText="Se crearán visitas para todos los clientes del grupo"
          />
          {selectedGroup && (
            <p className="text-sm text-muted-foreground">
              Se crearán {selectedGroup.memberCount ?? 0} visitas automáticamente
            </p>
          )}
        </div>

        {/* Modo selector hidden - defaulting to 'libre' mode */}
        {/* Product selector hidden for 'libre' mode - products registered on close */}

        <button type="submit" disabled className="hidden" />
      </form>
    );
  }
);

export type { CreateDistribucionFormProps };
