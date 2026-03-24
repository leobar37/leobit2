/**
 * Member Management Hook
 * Encapsulates all state and logic for managing group members
 */
import { useState, useMemo, useCallback } from "react";
import { useCustomerGroup, useAddMembersToGroup, useRemoveMemberFromGroup, type CustomerGroup, type GroupMember } from "~/hooks/use-grupos";
import { useCustomers } from "~/hooks/use-customers";

export interface UseMemberManagementOptions {
  /** Callback when member management dialog should open */
  onOpenMemberModal: (group: CustomerGroup) => void;
  /** Callback to reset member selection state */
  onResetMemberState: () => void;
}

export interface UseMemberManagementReturn {
  /** Currently selected group ID for member management */
  selectedGroupId: string | null;
  /** Set the selected group ID */
  setSelectedGroupId: (id: string | null) => void;
  /** Open member management dialog for a group */
  handleManageMembers: (group: CustomerGroup) => void;
  /** Members of the selected group */
  members: GroupMember[];
  /** Whether members are loading */
  isLoadingMembers: boolean;
  /** Available customers (not already members) */
  availableCustomers: Array<{ id: string; name: string; dni?: string | null }>;
  /** Currently selected customer IDs for adding */
  selectedCustomerIds: Set<string>;
  /** Toggle customer selection */
  toggleCustomerSelection: (id: string) => void;
  /** Whether add/remove operations are in progress */
  isManagingMembers: boolean;
  /** Set managing state */
  setIsManagingMembers: (managing: boolean) => void;
  /** Reset member selection state */
  resetMemberState: () => void;
  /** Add selected members to the group */
  handleAddMembers: () => Promise<void>;
  /** Remove a member from the group */
  handleRemoveMember: (customerId: string, customerName: string) => Promise<void>;
}

export function useMemberManagement({
  onOpenMemberModal,
  onResetMemberState,
}: UseMemberManagementOptions): UseMemberManagementReturn {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [isManagingMembers, setIsManagingMembers] = useState(false);

  const { data: customers } = useCustomers();
  const { data: selectedGroupWithMembers, isLoading: isLoadingMembers } = useCustomerGroup(selectedGroupId);
  const addMembersMutation = useAddMembersToGroup();
  const removeMemberMutation = useRemoveMemberFromGroup();

  const members = useMemo<GroupMember[]>(
    () => (selectedGroupWithMembers?.members as GroupMember[]) || [],
    [selectedGroupWithMembers]
  );

  const availableCustomers = useMemo(
    () =>
      (customers || []).filter(
        (c) => c.id && !members.some((m) => m.customerId === c.id)
      ),
    [customers, members]
  );

  const handleManageMembers = useCallback(
    (group: CustomerGroup) => {
      setSelectedGroupId(group.id);
      onOpenMemberModal(group);
      onResetMemberState();
    },
    [onOpenMemberModal, onResetMemberState]
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

  const resetMemberState = useCallback(() => {
    setSelectedCustomerIds(new Set());
    setIsManagingMembers(false);
  }, []);

  const handleAddMembers = useCallback(async () => {
    if (!selectedGroupWithMembers || selectedCustomerIds.size === 0) return;

    setIsManagingMembers(true);
    try {
      await addMembersMutation.mutateAsync({
        groupId: selectedGroupWithMembers.id,
        customerIds: Array.from(selectedCustomerIds),
      });
      resetMemberState();
    } finally {
      setIsManagingMembers(false);
    }
  }, [selectedGroupWithMembers, selectedCustomerIds, addMembersMutation, resetMemberState]);

  const handleRemoveMember = useCallback(
    async (customerId: string, _customerName: string) => {
      if (!selectedGroupWithMembers) return;

      await removeMemberMutation.mutateAsync({
        groupId: selectedGroupWithMembers.id,
        customerId,
      });
    },
    [selectedGroupWithMembers, removeMemberMutation]
  );

  return {
    selectedGroupId,
    setSelectedGroupId,
    handleManageMembers,
    members,
    isLoadingMembers,
    availableCustomers,
    selectedCustomerIds,
    toggleCustomerSelection,
    isManagingMembers,
    setIsManagingMembers,
    resetMemberState,
    handleAddMembers,
    handleRemoveMember,
  };
}
