import { useState, useMemo, useCallback } from "react";
import { Check, Loader2, UserMinus, UserPlus, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { createModal } from "~/lib/modal/create-modal";
import { useCustomerGroup, useAddMembersToGroup, useRemoveMemberFromGroup } from "~/hooks/use-grupos";
import { useCustomers } from "~/hooks/use-customers";

interface MemberDrawerData {
  groupId: string;
  groupName: string;
}

function MemberDrawerContent({
  close,
  groupId,
  groupName,
}: MemberDrawerData & { close: () => void }) {
  const isOnline = true;
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [isManagingMembers, setIsManagingMembers] = useState(false);

  const { data: groupWithMembers, isLoading: isLoadingMembers } = useCustomerGroup(groupId);
  const { data: customers } = useCustomers();
  const addMembersMutation = useAddMembersToGroup();
  const removeMemberMutation = useRemoveMemberFromGroup();

  const members = useMemo(() =>
    (groupWithMembers?.members || []) as Array<{ customerId: string; customerName: string; addedAt: Date }>,
    [groupWithMembers]
  );

  const availableCustomers = useMemo(() =>
    (customers || []).filter(
      (c) => c.id && !members.some((m) => m.customerId === c.id)
    ),
    [customers, members]
  );

  const toggleCustomerSelection = useCallback((id: string) => {
    setSelectedCustomerIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleRemoveMember = useCallback(async (customerId: string) => {
    await removeMemberMutation.mutateAsync({ groupId, customerId });
  }, [groupId, removeMemberMutation]);

  const handleAddMembers = useCallback(async () => {
    if (selectedCustomerIds.size === 0) return;

    setIsManagingMembers(true);
    try {
      await addMembersMutation.mutateAsync({
        groupId,
        customerIds: Array.from(selectedCustomerIds),
      });
      setSelectedCustomerIds(new Set());
      close();
    } finally {
      setIsManagingMembers(false);
    }
  }, [groupId, selectedCustomerIds, addMembersMutation, close]);

  return (
    <>
      <DrawerHeader className="px-4 pb-3 pt-2">
        <DrawerTitle>Gestionar Miembros</DrawerTitle>
        <DrawerDescription>
          {groupName} - {members.length} miembro{members.length !== 1 ? "s" : ""}
        </DrawerDescription>
      </DrawerHeader>

      <div className="flex-1 overflow-y-auto space-y-4 px-4 py-2">
        {!isOnline && (
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              Conéctate a internet para gestionar miembros
            </AlertDescription>
          </Alert>
        )}

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
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-card p-3"
                >
                  <span className="font-medium">{member.customerName}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-500 disabled:opacity-50"
                    onClick={() => handleRemoveMember(member.customerId)}
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
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-card p-3 hover:border-orange-300 ${
                    !isOnline ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={() => isOnline && toggleCustomerSelection(customer.id)}
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                      selectedCustomerIds.has(customer.id)
                        ? "border-orange-500 bg-orange-500"
                        : "border-muted-foreground/30 hover:border-orange-400"
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

      <DrawerFooter className="mt-auto flex-row gap-3 px-4 pb-6 pt-2 sm:flex-row sm:space-x-0">
        <Button
          variant="outline"
          onClick={close}
          disabled={isManagingMembers}
          className="h-12 flex-1 rounded-xl"
        >
          Cerrar
        </Button>
        <Button
          onClick={handleAddMembers}
          disabled={selectedCustomerIds.size === 0 || isManagingMembers || !isOnline}
          className="h-12 flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
        >
          {isManagingMembers ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          Agregar{" "}
          {selectedCustomerIds.size > 0 && `(${selectedCustomerIds.size})`}
        </Button>
      </DrawerFooter>
    </>
  );
}

export const [MemberDrawer, useMemberDrawer] = createModal<MemberDrawerData>(
  MemberDrawerContent,
  { type: "drawer" }
);
