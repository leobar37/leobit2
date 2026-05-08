import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Users, Package } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { type CreateDistribucionInput, type CreateDistribucionItemInput } from "~/hooks/use-distribuciones";
import { type CustomerGroup } from "~/hooks/use-grupos";
import { VendedorSelect, type VendedorOption } from "./vendedor-select";
import { GroupSelect } from "./group-select";
import { PuntoVentaSelect } from "./punto-venta-select";
import { type PuntoVenta } from "~/hooks/use-puntos-venta";
import { DistribucionItemEditor } from "./distribucion-item-editor";
import { useTeam } from "~/hooks/use-team";
import { useAuth } from "~/hooks/use-auth";

interface CreateDistribucionFormProps {
  onSubmit: (data: CreateDistribucionInput) => void;
  isPending?: boolean;
  onValidityChange?: (isValid: boolean) => void;
}

export interface CreateDistribucionFormRef {
  submit: () => { submitted: boolean; reason?: string };
}

export const CreateDistribucionForm = forwardRef<CreateDistribucionFormRef, CreateDistribucionFormProps>(
  function CreateDistribucionForm({ onSubmit, isPending = false, onValidityChange }, ref) {
    const { data: team = [] } = useTeam();
    const { user } = useAuth();
    const [selectedVendedor, setSelectedVendedor] = useState<VendedorOption | null>(null);

    // Auto-select current user as default vendedor
    useEffect(() => {
      if (selectedVendedor || team.length === 0) return;
      const currentMember = team.find((m) => m.userId === user?.id);
      if (!currentMember) return;
      const isVendedor = currentMember.role === "VENDEDOR" || currentMember.role === "ADMIN_NEGOCIO";
      if (isVendedor && currentMember.isActive) {
        setSelectedVendedor({
          id: currentMember.id,
          name: currentMember.name,
          role: currentMember.role,
          userId: currentMember.userId,
        });
      }
    }, [team, user?.id]);
    const [selectedGroups, setSelectedGroups] = useState<CustomerGroup[]>([]);
    const [selectedPuntoVenta, setSelectedPuntoVenta] = useState<PuntoVenta | null>(null);
    const [notaCreacion, setNotaCreacion] = useState("");
    const [assignItems, setAssignItems] = useState(false);
    const [items, setItems] = useState<CreateDistribucionItemInput[]>([]);

    const validationMessage = !selectedVendedor
      ? "Selecciona un vendedor"
      : !selectedPuntoVenta
        ? "Selecciona un punto de venta"
        : assignItems && items.length === 0
          ? "Agrega al menos un producto asignado"
          : undefined;
    const isValid = !validationMessage;

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
        notaCreacion: notaCreacion.trim() || undefined,
        groupIds: selectedGroups.map((g) => g.id),
        items: assignItems ? items : [],
      });
    };

    useImperativeHandle(ref, () => ({
      submit: () => {
        if (!isValid) {
          return { submitted: false, reason: validationMessage };
        }

        handleSubmit({ preventDefault: () => {} } as React.FormEvent);
        return { submitted: true };
      },
    }), [isValid, validationMessage, handleSubmit]);

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
            Grupos de Clientes
          </Label>
          <GroupSelect
            value={null}
            values={selectedGroups.map((g) => g.id)}
            selectedGroups={selectedGroups}
            onChange={() => {}}
            onMultiChange={setSelectedGroups}
            helperText="Se crearán visitas para todos los clientes de los grupos seleccionados"
            multi
          />
          {selectedGroups.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Se crearán {selectedGroups.reduce((sum, g) => sum + (g.memberCount ?? 0), 0)} visitas automáticamente
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nota-creacion">Nota al crear</Label>
          <Textarea
            id="nota-creacion"
            value={notaCreacion}
            onChange={(event) => setNotaCreacion(event.target.value)}
            placeholder="Observaciones iniciales de la distribución..."
            className="min-h-[96px] resize-none rounded-xl"
            disabled={isPending}
          />
        </div>

        <div className="border rounded-xl p-4 bg-card">
          <Switch
            checked={assignItems}
            onCheckedChange={setAssignItems}
            label="Asignar productos (opcional)"
            description="Controlar qué productos lleva el vendedor"
          />
        </div>

        {assignItems && (
          <DistribucionItemEditor
            items={items}
            onItemsChange={setItems}
            readOnly={false}
          />
        )}

        <button type="submit" className="hidden" />
      </form>
    );
  }
);

export type { CreateDistribucionFormProps };
