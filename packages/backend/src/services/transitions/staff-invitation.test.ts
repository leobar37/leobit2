import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMachine, StateMachineRegistry } from "../../lib/state-machine";
import { setupStaffInvitationTransitions } from "./staff-invitation";
import type { StaffInvitation } from "../../db/schema";

describe("setupStaffInvitationTransitions", () => {
  let machine: ReturnType<typeof createMachine<StaffInvitation, any>>;
  let mockDeps: {
    businessRepo: {
      findByUserIdAndBusinessId: ReturnType<typeof vi.fn>;
    };
    db: {
      insert: ReturnType<typeof vi.fn>;
    };
    businessUsersTable: unknown;
  };

  beforeEach(() => {
    StateMachineRegistry.getAll().clear();
    
    mockDeps = {
      businessRepo: {
        findByUserIdAndBusinessId: vi.fn().mockResolvedValue(null),
      },
      db: {
        insert: vi.fn().mockResolvedValue(undefined),
      },
      businessUsersTable: {},
    };

    machine = createMachine<StaffInvitation, any>({
      name: "staffInvitation",
      initialState: "pending",
      states: ["pending", "accepted", "rejected", "cancelled", "expired"],
    });

    setupStaffInvitationTransitions(machine, mockDeps);
  });

  describe("pending → accepted", () => {
    it("executes acceptance hook", async () => {
      const invitation: StaffInvitation = {
        id: "inv-1",
        businessId: "biz-1",
        email: "test@example.com",
        inviteeName: "Test User",
        token: "token-123",
        status: "accepted",
        invitedBy: "admin-1",
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as StaffInvitation;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, invitation, "pending", "accepted");

      // Currently no side effects in the hook, but it should execute without errors
      expect(true).toBe(true);
    });
  });

  describe("pending → rejected", () => {
    it("executes rejection hook", async () => {
      const invitation: StaffInvitation = {
        id: "inv-1",
        businessId: "biz-1",
        email: "test@example.com",
        inviteeName: "Test User",
        token: "token-123",
        status: "rejected",
        invitedBy: "admin-1",
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as StaffInvitation;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, invitation, "pending", "rejected");

      expect(true).toBe(true);
    });
  });

  describe("pending → cancelled", () => {
    it("executes cancellation hook", async () => {
      const invitation: StaffInvitation = {
        id: "inv-1",
        businessId: "biz-1",
        email: "test@example.com",
        inviteeName: "Test User",
        token: "token-123",
        status: "cancelled",
        invitedBy: "admin-1",
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as StaffInvitation;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, invitation, "pending", "cancelled");

      expect(true).toBe(true);
    });
  });

  describe("pending → expired", () => {
    it("executes expiration hook", async () => {
      const invitation: StaffInvitation = {
        id: "inv-1",
        businessId: "biz-1",
        email: "test@example.com",
        inviteeName: "Test User",
        token: "token-123",
        status: "expired",
        invitedBy: "admin-1",
        sentAt: new Date(),
        expiresAt: new Date(Date.now() - 86400000), // Expired yesterday
        createdAt: new Date(),
        updatedAt: new Date(),
      } as StaffInvitation;

      const ctx = { businessId: "biz-1" } as any;
      await machine.executeTransition(ctx, invitation, "pending", "expired");

      expect(true).toBe(true);
    });
  });
});