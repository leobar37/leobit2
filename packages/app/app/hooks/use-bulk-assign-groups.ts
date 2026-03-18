import { useQueryClient } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";
import { useOfflineAwareMutation } from "./use-offline-aware-mutation";

export interface BulkAssignGroupsInput {
  customerIds: string[];
  groupIds: string[];
}

export function useBulkAssignGroups() {
  const queryClient = useQueryClient();

  return useOfflineAwareMutation({
    mutationFn: async ({ customerIds, groupIds }: BulkAssignGroupsInput) => {
      await Promise.all(
        groupIds.map(async (groupId) => {
          await api.groups({ id: groupId }).members.post({ customerIds });
        })
      );
    },
    offlineMessage: "Se requiere conexión a internet para asignar grupos",
    onSuccess: (_, { groupIds }) => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      queryClient.invalidateQueries({ queryKey: ["customer-groups-with-details"] });

      groupIds.forEach((groupId) => {
        queryClient.invalidateQueries({ queryKey: ["customer-groups", groupId] });
      });
    },
  });
}
