import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, ForbiddenError, ValidationError } from "../../errors";
import { db, businessUsers } from "../../lib/db";

vi.mock("../../lib/db", () => ({
  db: {
    query: {
      user: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
  },
  user: { email: "email" },
  businessUsers: {},
}));

import { StaffInvitationService } from "./staff-invitation.service";

describe("StaffInvitationService", () => {
  const findFirstMock = db.query.user.findFirst as ReturnType<typeof vi.fn>;
  const insertMock = db.insert as ReturnType<typeof vi.fn>;
  const valuesMock = vi.fn();
  const returningMock = vi.fn();

  const adminCtx = {
    businessId: "biz-1",
    userId: "admin-user-1",
    isAdmin: vi.fn(() => true),
  };

  const sellerUserId = "seller-user-1";
  const pendingInvitation = {
    id: "inv-1",
    businessId: "biz-1",
    email: "qa-vendedor@example.com",
    inviteeName: "QA Vendedor",
    salesPoint: "Ruta QA",
    token: "TOKEN123",
    status: "pending",
    expiresAt: new Date(Date.now() + 86_400_000),
  };

  const repository = {
    create: vi.fn(),
    findByBusinessId: vi.fn(),
    findById: vi.fn(),
    findByToken: vi.fn(),
    updateStatus: vi.fn(),
    updateStatusByToken: vi.fn(),
  };

  const businessRepo = {
    findByUserIdAndBusinessId: vi.fn(),
  };

  const createService = () =>
    new StaffInvitationService(repository as never, businessRepo as never);

  beforeEach(() => {
    vi.clearAllMocks();
    findFirstMock.mockResolvedValue(null);
    insertMock.mockReturnValue({ values: valuesMock });
    valuesMock.mockReturnValue({ returning: returningMock });
    returningMock.mockResolvedValue([
      {
        id: "member-1",
        businessId: "biz-1",
        salesPoint: "Ruta QA",
      },
    ]);
    businessRepo.findByUserIdAndBusinessId.mockResolvedValue(null);
    repository.create.mockResolvedValue(pendingInvitation);
    repository.findByToken.mockResolvedValue(pendingInvitation);
  });

  it("only allows admins to create seller invitations", async () => {
    const service = createService();
    const sellerCtx = {
      ...adminCtx,
      isAdmin: vi.fn(() => false),
    };

    await expect(
      service.createInvitation(sellerCtx as never, {
        email: "qa-vendedor@example.com",
        name: "QA Vendedor",
        salesPoint: "Ruta QA",
        token: "TOKEN123",
        expiresAt: pendingInvitation.expiresAt,
      })
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("creates a pending invitation with the requested seller data", async () => {
    const service = createService();
    const expiresAt = pendingInvitation.expiresAt;

    await service.createInvitation(adminCtx as never, {
      email: "qa-vendedor@example.com",
      name: "QA Vendedor",
      salesPoint: "Ruta QA",
      token: "TOKEN123",
      expiresAt,
    });

    expect(repository.create).toHaveBeenCalledWith(
      adminCtx,
      expect.objectContaining({
        email: "qa-vendedor@example.com",
        inviteeName: "QA Vendedor",
        salesPoint: "Ruta QA",
        token: "TOKEN123",
        expiresAt,
        status: "pending",
      })
    );
  });

  it("blocks inviting an email that already belongs to the same business", async () => {
    const service = createService();
    findFirstMock.mockResolvedValue({ id: sellerUserId });
    businessRepo.findByUserIdAndBusinessId.mockResolvedValue({ id: "member-1" });

    await expect(
      service.createInvitation(adminCtx as never, {
        email: "qa-vendedor@example.com",
        name: "QA Vendedor",
        token: "TOKEN123",
        expiresAt: pendingInvitation.expiresAt,
      })
    ).rejects.toBeInstanceOf(ConflictError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("returns public data only for a pending valid invitation", async () => {
    const service = createService();

    await expect(service.validateToken("TOKEN123")).resolves.toEqual({
      email: "qa-vendedor@example.com",
      name: "QA Vendedor",
      salesPoint: "Ruta QA",
    });
  });

  it("creates a VENDEDOR membership when accepting an invitation", async () => {
    const service = createService();

    await expect(service.acceptInvitation("TOKEN123", sellerUserId)).resolves.toEqual({
      businessId: "biz-1",
      businessUserId: "member-1",
      role: "VENDEDOR",
      salesPoint: "Ruta QA",
    });

    expect(insertMock).toHaveBeenCalledWith(businessUsers);
    expect(valuesMock).toHaveBeenCalledWith({
      businessId: "biz-1",
      userId: sellerUserId,
      role: "VENDEDOR",
      salesPoint: "Ruta QA",
    });
    expect(repository.updateStatusByToken).toHaveBeenCalledWith("TOKEN123", "accepted", {
      acceptedBy: sellerUserId,
      acceptedAt: expect.any(Date),
    });
  });

  it("expires stale invitations before rejecting token validation", async () => {
    const service = createService();
    repository.findByToken.mockResolvedValue({
      ...pendingInvitation,
      expiresAt: new Date(Date.now() - 86_400_000),
    });

    await expect(service.validateToken("TOKEN123")).rejects.toBeInstanceOf(ValidationError);

    expect(repository.updateStatusByToken).toHaveBeenCalledWith("TOKEN123", "expired");
  });
});
