import { Check, Loader2, UserMinus, UserPlus, WifiOff } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOnline } from "~/hooks/use-online";

interface Member {
  customerId: string;
  customerName: string;
  addedAt: Date;
}

interface Customer {
  id: string;
  name: string;
  dni?: string | null;
}

interface MemberDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  members: Member[];
  isLoadingMembers: boolean;
  availableCustomers: Customer[];
  selectedCustomerIds: Set<string>;
  onToggleCustomerSelection: (id: string) => void;
  onRemoveMember: (customerId: string, customerName: string) => void;
  onAddMembers: () => void;
  isManagingMembers: boolean;
}

export function MemberDialog({
  isOpen,
  onOpenChange,
  groupName,
  members,
  isLoadingMembers,
  availableCustomers,
  selectedCustomerIds,
  onToggleCustomerSelection,
  onRemoveMember,
  onAddMembers,
  isManagingMembers,
}: MemberDialogProps) {
  const { isOnline } = useOnline();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gestionar Miembros</DialogTitle>
          <DialogDescription>
            {groupName} - {members.length} miembro{members.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        {!isOnline && (
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              Conéctate a internet para gestionar miembros
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Miembros actuales
            </h4>
            {isLoadingMembers ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No hay miembros en este grupo
              </p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.customerId}
                    className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3"
                  >
                    <span className="font-medium">{member.customerName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-500 disabled:opacity-50"
                      onClick={() =>
                        onRemoveMember(member.customerId, member.customerName)
                      }
                      disabled={!isOnline}
                      title="Eliminar del grupo"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Agregar miembros
            </h4>
            {availableCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No hay clientes disponibles para agregar
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border border-stone-200 bg-white p-3 hover:border-orange-300 ${
                      !isOnline ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={() => isOnline && onToggleCustomerSelection(customer.id)}
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                        selectedCustomerIds.has(customer.id)
                          ? "border-orange-500 bg-orange-500"
                          : "border-stone-300 hover:border-orange-400"
                      }`}
                    >
                      {selectedCustomerIds.has(customer.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{customer.name}</p>
                      {customer.dni && (
                        <p className="text-xs text-muted-foreground">
                          DNI: {customer.dni}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            onClick={onAddMembers}
            disabled={selectedCustomerIds.size === 0 || isManagingMembers || !isOnline}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
          >
            {isManagingMembers ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Agregar{" "}
            {selectedCustomerIds.size > 0 && `(${selectedCustomerIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}