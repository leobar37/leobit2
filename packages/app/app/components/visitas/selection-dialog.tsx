import { Users, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectionMode } from "~/hooks/use-visita-dialogs";

interface Customer {
  id: string;
  name: string;
  dni?: string | null;
}

interface CustomerGroup {
  id: string;
  name: string;
  memberCount?: number;
}

interface SelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectionMode: SelectionMode;
  onSelectionModeChange: (mode: SelectionMode) => void;
  customers: Customer[] | undefined;
  groups: CustomerGroup[] | undefined;
  selectedCustomerId: string;
  onCustomerSelect: (id: string) => void;
  selectedGroupId: string;
  onGroupSelect: (id: string) => void;
  isCreating: boolean;
  onCreateSingle: () => void;
  onCreateGroup: () => void;
}

export function SelectionDialog({
  isOpen,
  onOpenChange,
  selectionMode,
  onSelectionModeChange,
  customers,
  groups,
  selectedCustomerId,
  onCustomerSelect,
  selectedGroupId,
  onGroupSelect,
  isCreating,
  onCreateSingle,
  onCreateGroup,
}: SelectionDialogProps) {
  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-4 max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Agregar Visita</DrawerTitle>
          <DrawerDescription>
            Selecciona un cliente individual o un grupo
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex gap-2 py-4">
          <Button
            variant={selectionMode === "individual" ? "default" : "outline"}
            onClick={() => onSelectionModeChange("individual")}
            className={
              selectionMode === "individual"
                ? "bg-orange-500 hover:bg-orange-600"
                : ""
            }
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Cliente
          </Button>
          <Button
            variant={selectionMode === "group" ? "default" : "outline"}
            onClick={() => onSelectionModeChange("group")}
            className={
              selectionMode === "group"
                ? "bg-orange-500 hover:bg-orange-600"
                : ""
            }
          >
            <Users className="mr-2 h-4 w-4" />
            Grupo
          </Button>
        </div>

        {selectionMode === "individual" && (
          <div className="space-y-4">
            <Select
              value={selectedCustomerId}
              onValueChange={onCustomerSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.dni && ` (${customer.dni})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DrawerFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={onCreateSingle}
                disabled={!selectedCustomerId || isCreating}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isCreating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear visita
              </Button>
            </DrawerFooter>
          </div>
        )}

        {selectionMode === "group" && (
          <div className="space-y-4">
            <Select
              value={selectedGroupId}
              onValueChange={onGroupSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar grupo" />
              </SelectTrigger>
              <SelectContent>
                {(groups || []).map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} ({group.memberCount || 0} miembros)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DrawerFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={onCreateGroup}
                disabled={!selectedGroupId || isCreating}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isCreating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear visitas para todo el grupo
              </Button>
            </DrawerFooter>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
