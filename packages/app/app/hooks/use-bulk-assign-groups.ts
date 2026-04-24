import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSyncEngine } from "@avileo/drizzle-sync/react";
import { CustomerGroupService } from "~/lib/services/customer-group-service";

export interface BulkAssignGroupsInput {
  customerIds: string[];
  groupIds: string[];
}

export function useBulkAssignGroups() {
  const queryClient = useQueryClient();
  const engine = useSyncEngine();
  const customerGroupService = engine.use(
    "customerGroups",
    () => new CustomerGroupService(engine)
  );

  return useMutation({
    mutationFn: async ({ customerIds, groupIds }: BulkAssignGroupsInput) => {
      for (const groupId of groupIds) {
        await customerGroupService.addMembers(groupId, customerIds);
      }
    },
    onSuccess: (_, { groupIds }) => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      queryClient.invalidateQueries({ queryKey: ["customer-groups-with-details"] });

      groupIds.forEach((groupId) => {
        queryClient.invalidateQueries({ queryKey: ["customer-groups", groupId] });
      });
    },
  });
}
