import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-keys";

export interface BulkAssignGroupsInput {
  customerIds: string[];
  groupIds: string[];
}

export function useBulkAssignGroups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerIds, groupIds }: BulkAssignGroupsInput) => {
      await Promise.all(
        groupIds.map(async (groupId) => {
          const response = await api
            .groups({ id: groupId })
            .members.post({ customerIds });
          if (response.error) throw new Error(String(response.error.value));
        })
      );
    },
    onSuccess: (_, { groupIds }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customerGroups.all });
      queryClient.invalidateQueries({
        queryKey: ["customer-groups-with-details"],
      });

      groupIds.forEach((groupId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.customerGroups.detail(groupId),
        });
      });
    },
  });
}
