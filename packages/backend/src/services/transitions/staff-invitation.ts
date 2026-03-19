import type { StateMachine } from "../../lib/state-machine";
import type { StaffInvitation } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export type InvitationState = "pending" | "accepted" | "rejected" | "cancelled" | "expired";

export function setupStaffInvitationTransitions(
  machine: StateMachine<StaffInvitation, InvitationState>,
  deps: {
    businessRepo: {
      findByUserIdAndBusinessId: (userId: string, businessId: string) => Promise<unknown>;
    };
    db: {
      insert: (table: unknown, values: unknown) => Promise<unknown>;
    };
    businessUsersTable: unknown;
  }
): void {
  machine
    // pending → accepted: Create business membership + set acceptedAt
    .onTransition("pending", "accepted", async (ctx: RequestContext, invitation: StaffInvitation, tx?: unknown) => {
      // Set accepted timestamp
      // Note: The actual businessUsers insert is done in the service,
      // but we could move it here for consistency
      
      // Side effect: Could send notification to admin
      // Side effect: Could create activity log
    })

    // pending → rejected: Set rejectedAt
    .onTransition("pending", "rejected", async (_ctx, _invitation) => {
      // Set rejected timestamp
      // Side effect: Could notify inviter
    })

    // pending → cancelled: Set cancelledAt
    .onTransition("pending", "cancelled", async (_ctx, _invitation) => {
      // Set cancelled timestamp
      // Side effect: Could notify invitee if they have an account
    })

    // pending → expired: Set expired (by cron job)
    .onTransition("pending", "expired", async (_ctx, _invitation) => {
      // Automatic expiration
      // Side effect: Could clean up unused tokens
    });
}
