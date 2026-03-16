import { useState, useCallback } from "react";
import { createModal } from "~/hooks/use-modal";
import type { CustomerGroup } from "~/hooks/use-grupos";

const useFormModal = createModal<CustomerGroup | void>();
const useDeleteModal = createModal<CustomerGroup>();
const useMemberModal = createModal<CustomerGroup>();

export type DialogMode = "create" | "edit";

export interface GrupoDialogsState {
  formModal: ReturnType<typeof useFormModal>;
  dialogMode: DialogMode;
  setDialogMode: (mode: DialogMode) => void;
  groupName: string;
  setGroupName: (name: string) => void;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
  resetFormState: () => void;

  deleteModal: ReturnType<typeof useDeleteModal>;
  isDeleting: boolean;
  setIsDeleting: (deleting: boolean) => void;

  memberModal: ReturnType<typeof useMemberModal>;
  selectedCustomerIds: Set<string>;
  toggleCustomerSelection: (id: string) => void;
  isManagingMembers: boolean;
  setIsManagingMembers: (managing: boolean) => void;
  resetMemberState: () => void;
}

export function useGrupoDialogs(): GrupoDialogsState {
  const formModal = useFormModal();
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [groupName, setGroupName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deleteModal = useDeleteModal();
  const [isDeleting, setIsDeleting] = useState(false);

  const memberModal = useMemberModal();
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [isManagingMembers, setIsManagingMembers] = useState(false);

  const resetFormState = useCallback(() => {
    setDialogMode("create");
    setGroupName("");
    setIsSubmitting(false);
  }, []);

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

  const resetMemberState = useCallback(() => {
    setSelectedCustomerIds(new Set());
    setIsManagingMembers(false);
  }, []);

  return {
    formModal,
    dialogMode,
    setDialogMode,
    groupName,
    setGroupName,
    isSubmitting,
    setIsSubmitting,
    resetFormState,

    deleteModal,
    isDeleting,
    setIsDeleting,

    memberModal,
    selectedCustomerIds,
    toggleCustomerSelection,
    isManagingMembers,
    setIsManagingMembers,
    resetMemberState,
  };
}
