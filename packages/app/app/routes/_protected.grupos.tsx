import { useMemo, useCallback, useState } from "react";
import { Plus, Search, Users, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSetLayout } from "~/components/layout/app-layout";
import { useGrupoDialogs } from "~/hooks/use-grupo-dialogs";
import {
  useCustomerGroups,
  useCreateCustomerGroup,
  useUpdateCustomerGroup,
  useDeleteCustomerGroup,
  useAddMembersToGroup,
  useRemoveMemberFromGroup,
  useCustomerGroup,
  type CustomerGroup,
  type GroupMember,
} from "~/hooks/use-grupos";
import { useCustomers } from "~/hooks/use-customers";
import { GroupCard } from "~/components/grupos/group-card";
import { GroupFormDrawer } from "~/components/grupos/group-form-drawer";
import { MemberDialog } from "~/components/grupos/member-dialog";

export default function GroupsPage() {
  useSetLayout({ title: "Grupos de Clientes" });

  const { data: groups, isLoading } = useCustomerGroups();
  const { data: customers } = useCustomers();

  const createMutation = useCreateCustomerGroup();
  const updateMutation = useUpdateCustomerGroup();
  const deleteMutation = useDeleteCustomerGroup();
  const addMembersMutation = useAddMembersToGroup();
  const removeMemberMutation = useRemoveMemberFromGroup();

  const dialogs = useGrupoDialogs();

  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const { data: selectedGroupWithMembers, isLoading: isLoadingMembers } =
    useCustomerGroup(selectedGroupId);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups || [];
    const lowerSearch = search.toLowerCase();
    return (groups || []).filter((group: CustomerGroup) =>
      group.name.toLowerCase().includes(lowerSearch)
    );
  }, [groups, search]);

  const groupMembers = useMemo<GroupMember[]>(
    () => (selectedGroupWithMembers?.members as GroupMember[]) || [],
    [selectedGroupWithMembers]
  );

  const memberCustomerIds = useMemo(
    () => new Set(groupMembers.map((m) => m.customerId)),
    [groupMembers]
  );

  const availableCustomers = useMemo(
    () =>
      (customers || []).filter(
        (c) => c.id && !memberCustomerIds.has(c.id)
      ),
    [customers, memberCustomerIds]
  );

  const handleManageMembers = useCallback((group: CustomerGroup) => {
    setSelectedGroupId(group.id);
    dialogs.memberModal.open(group);
    dialogs.resetMemberState();
  }, [dialogs]);

  const handleCreateGroup = useCallback(async () => {
    if (!dialogs.groupName.trim()) return;

    dialogs.setIsSubmitting(true);
    try {
      await createMutation.mutateAsync({ name: dialogs.groupName.trim() });
      dialogs.resetFormState();
      dialogs.formModal.close();
    } finally {
      dialogs.setIsSubmitting(false);
    }
  }, [dialogs, createMutation]);

  const handleUpdateGroup = useCallback(async () => {
    const editingGroup = dialogs.formModal.data as CustomerGroup | undefined;
    if (!editingGroup || !dialogs.groupName.trim()) return;

    dialogs.setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync({
        id: editingGroup.id,
        name: dialogs.groupName.trim(),
      });
      dialogs.resetFormState();
      dialogs.formModal.close();
    } finally {
      dialogs.setIsSubmitting(false);
    }
  }, [dialogs, updateMutation]);

  const handleDeleteGroup = useCallback(async () => {
    const deletingGroup = dialogs.deleteModal.data;
    if (!deletingGroup) return;

    dialogs.setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({ id: deletingGroup.id });
      dialogs.deleteModal.close();
    } finally {
      dialogs.setIsDeleting(false);
    }
  }, [dialogs, deleteMutation]);

  const handleAddMembers = useCallback(async () => {
    const selectedGroup = dialogs.memberModal.data;
    if (!selectedGroup || dialogs.selectedCustomerIds.size === 0) return;

    dialogs.setIsManagingMembers(true);
    try {
      await addMembersMutation.mutateAsync({
        groupId: selectedGroup.id,
        customerIds: Array.from(dialogs.selectedCustomerIds),
      });
      dialogs.resetMemberState();
    } finally {
      dialogs.setIsManagingMembers(false);
    }
  }, [dialogs, addMembersMutation]);

  const handleRemoveMember = useCallback(
    async (customerId: string, _customerName: string) => {
      const selectedGroup = dialogs.memberModal.data;
      if (!selectedGroup) return;

      await removeMemberMutation.mutateAsync({
        groupId: selectedGroup.id,
        customerId,
      });
    },
    [dialogs, removeMemberMutation]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar grupos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-12 rounded-[20px] border-stone-200/80 bg-white/75 pl-11 pr-4 shadow-[0_1px_6px_rgba(15,23,42,0.02)] placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-orange-200"
        />
      </div>

      {filteredGroups.length === 0 && !isLoading && (
        <div className="py-8 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">
            {search ? "No se encontraron grupos" : "No hay grupos de clientes"}
          </p>
          {!search && (
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => {
                dialogs.resetFormState();
                dialogs.formModal.open();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear primer grupo
            </Button>
          )}
        </div>
      )}

      {filteredGroups.length > 0 && (
        <div className="space-y-3">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onEdit={(g) => {
                dialogs.setDialogMode("edit");
                dialogs.setGroupName(g.name);
                dialogs.formModal.open(g);
              }}
              onDelete={(g) => dialogs.deleteModal.open(g)}
              onManageMembers={handleManageMembers}
            />
          ))}
        </div>
      )}

      <div className="fixed bottom-28 right-4 z-50">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
          onClick={() => {
            dialogs.resetFormState();
            dialogs.setDialogMode("create");
            dialogs.formModal.open();
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <GroupFormDrawer
        isOpen={dialogs.formModal.isOpen}
        data={{
          mode: dialogs.dialogMode,
          groupName: dialogs.groupName,
          onGroupNameChange: dialogs.setGroupName,
          onSubmit:
            dialogs.dialogMode === "create"
              ? handleCreateGroup
              : handleUpdateGroup,
          isSubmitting: dialogs.isSubmitting,
        }}
        onClose={() => {
          dialogs.formModal.close();
          dialogs.resetFormState();
        }}
      />

      <Sheet
        open={dialogs.deleteModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            dialogs.deleteModal.close();
            dialogs.setIsDeleting(false);
          }
        }}
      >
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Eliminar Grupo</SheetTitle>
            <SheetDescription>
              ¿Estás seguro de que deseas eliminar el grupo &quot;
              {dialogs.deleteModal.data?.name}&quot;? Esta acción eliminará todos
              los miembros asociados.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="mt-6 flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => {
                dialogs.deleteModal.close();
                dialogs.setIsDeleting(false);
              }}
              disabled={dialogs.isDeleting}
              className="h-12 flex-1 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteGroup}
              disabled={dialogs.isDeleting}
              className="h-12 flex-1 rounded-xl bg-red-500 hover:bg-red-600"
            >
              {dialogs.isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Eliminar grupo
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <MemberDialog
        isOpen={dialogs.memberModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            dialogs.memberModal.close();
            dialogs.resetMemberState();
            setSelectedGroupId(null);
          }
        }}
        groupName={dialogs.memberModal.data?.name || ""}
        members={groupMembers}
        isLoadingMembers={isLoadingMembers}
        availableCustomers={availableCustomers}
        selectedCustomerIds={dialogs.selectedCustomerIds}
        onToggleCustomerSelection={dialogs.toggleCustomerSelection}
        onRemoveMember={handleRemoveMember}
        onAddMembers={handleAddMembers}
        isManagingMembers={dialogs.isManagingMembers}
      />
    </div>
  );
}
