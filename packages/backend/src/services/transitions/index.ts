import type { RequestContext } from "../../context/request-context";
import { createMachine, StateMachineRegistry } from "../../lib/state-machine";
import type { StaffInvitation } from "../../db/schema";
import { setupStaffInvitationTransitions } from "./staff-invitation";

export type InvitationState = "pending" | "accepted" | "rejected" | "cancelled" | "expired";

export const staffInvitationMachine = createMachine<StaffInvitation, InvitationState>({
  name: "staffInvitation",
  initialState: "pending",
  states: ["pending", "accepted", "rejected", "cancelled", "expired"],
  allowedTransitions: [
    { from: "pending", to: "accepted" },
    { from: "pending", to: "rejected" },
    { from: "pending", to: "cancelled" },
    { from: "pending", to: "expired" },
  ],
});

export interface StateMachineDependencies {
  staffInvitationDeps?: {
    businessRepo: {
      findByUserIdAndBusinessId: (userId: string, businessId: string) => Promise<unknown>;
    };
    db: {
      insert: (table: unknown, values: unknown) => Promise<unknown>;
    };
    businessUsersTable: unknown;
  };
}

export function initializeStateMachines(deps: StateMachineDependencies): void {
  if (deps.staffInvitationDeps) {
    setupStaffInvitationTransitions(staffInvitationMachine, deps.staffInvitationDeps);
  }

  StateMachineRegistry.register("staffInvitation", staffInvitationMachine);
}
