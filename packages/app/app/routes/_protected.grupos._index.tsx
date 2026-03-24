import { useMemo, useCallback, useState } from "react";
import { Search, Users, Trash2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
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
  useUpdateCustomerGroup,
  useDeleteCustomerGroup,
  type CustomerGroup,
} from "~/hooks/use-grupos";
import { GroupCard } from "~/components/grupos/group-card";
import { GroupFormDrawer } from "~/components/grupos/group-form-drawer";
import { MemberDialog } from "~/components/grupos/member-dialog";
import { useMemberManagement } from "~/hooks/use-member-management";

export default function GroupsPage() {
  useSetLayout({ title: "Grupos de Clientes" });
  const navigate = useNavigate();

  const { data: groups, isLoading } = useCustomerGroups();

  const updateMutation = useUpdateCustomerGroup();
  const deleteMutation = useDeleteCustomerGroup();

  const dialogs = useGrupoDialogs();

  const [search, setSearch] = useState("");

  const memberManagement = useMemberManagement({
    onOpenMemberModal: dialogs.memberModal.open,
    onResetMemberState: dialogs.resetMemberState,
  });

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups || [];
    const lowerSearch = search.toLowerCase();
    return (groups || []).filter((group: CustomerGroup) =>
      group.name.toLowerCase().includes(lowerSearch)
    );
  }, [groups, search]);

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

  const handleCloseMemberDialog = useCallback(() => {
    dialogs.memberModal.close();
    dialogs.resetMemberState();
    memberManagement.setSelectedGroupId(null);
  }, [dialogs, memberManagement]);

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
          <p className="text-muted-foreground">
            {search ? "No se encontraron grupos" : "No hay grupos de clientes"}
          </p>
        </div>
      )}

      {filteredGroups.length > 0 && (
        <div className="space-y-3">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onClick={() => navigate(`/grupos/${group.id}`)}
              onEdit={(g) => {
                dialogs.setDialogMode("edit");
                dialogs.setGroupName(g.name);
                dialogs.formModal.open(g);
              }}
              onDelete={(g) => dialogs.deleteModal.open(g)}
              onManageMembers={memberManagement.handleManageMembers}
            />
          ))}
        </div>
      )}

      <GroupFormDrawer
        isOpen={dialogs.formModal.isOpen}
        data={{
          mode: dialogs.dialogMode,
          groupName: dialogs.groupName,
          onGroupNameChange: dialogs.setGroupName,
          onSubmit: handleUpdateGroup,
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
            handleCloseMemberDialog();
          }
        }}
        groupName={dialogs.memberModal.data?.name || ""}
        members={memberManagement.members}
        isLoadingMembers={memberManagement.isLoadingMembers}
        availableCustomers={memberManagement.availableCustomers}
        selectedCustomerIds={memberManagement.selectedCustomerIds}
        onToggleCustomerSelection={memberManagement.toggleCustomerSelection}
        onRemoveMember={memberManagement.handleRemoveMember}
        onAddMembers={memberManagement.handleAddMembers}
        isManagingMembers={memberManagement.isManagingMembers}
      />
    </div>
  );
}
