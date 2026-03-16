import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomerGroupService } from "~/lib/sync/service-provider";

export interface BulkAssignGroupsInput {
  customerIds: string[];
  groupIds: string[];
}

export function useBulkAssignGroups() {
  const customerGroupService = useCustomerGroupService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerIds, groupIds }: BulkAssignGroupsInput) => {
      await Promise.all(
        groupIds.map((groupId) => customerGroupService.addMembers(groupId, customerIds))
      );
    },
    onSuccess: async (_, { groupIds }) => {
      await queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      await queryClient.invalidateQueries({ queryKey: ["customer-groups-with-details"] });

      await Promise.all(
        groupIds.map((groupId) =>
          queryClient.invalidateQueries({ queryKey: ["customer-groups", groupId] })
        )
      );
    },
  });
}
