import type { StaffInvitationRepository, InvitationStatus } from "../repository/staff-invitation.repository";
import type { BusinessRepository } from "../repository/business.repository";
import { RequestContext } from "../../context/request-context";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from "../../errors";
import type { StaffInvitation } from "../../db/schema";
import { db, businessUsers, user } from "../../lib/db";
import { eq } from "drizzle-orm";

export interface CreateInvitationData {
  email: string;
  name: string;
  salesPoint?: string;
  token: string;
  expiresAt: Date;
}

export interface PublicInvitationData {
  email: string;
  name: string;
  salesPoint: string | null;
}

export class StaffInvitationService {
  constructor(
    private repository: StaffInvitationRepository,
    private businessRepo: BusinessRepository
  ) {}

  async createInvitation(
    ctx: RequestContext,
    data: Omit<CreateInvitationData, "token" | "expiresAt"> & { token: string; expiresAt: Date }
  ): Promise<StaffInvitation> {
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("No tienes permiso para invitar miembros");
    }

    // Check if user with this email already exists
    const existingAccount = await db.query.user.findFirst({
      where: eq(user.email, data.email),
    });

    if (existingAccount) {
      // Check if user already has a membership in THIS business
      const existingMembership = await this.businessRepo.findByUserIdAndBusinessId(
        existingAccount.id,
        ctx.businessId
      );

      if (existingMembership) {
        throw new ConflictError("Este email ya pertenece a este negocio");
      }
    }

    return this.repository.create(ctx, {
      email: data.email,
      inviteeName: data.name,
      salesPoint: data.salesPoint || null,
      token: data.token,
      expiresAt: data.expiresAt,
      status: "pending" as InvitationStatus,
      sentAt: new Date(),
    });
  }

  async getInvitations(ctx: RequestContext): Promise<StaffInvitation[]> {
    // Any member of the business can view invitations
    return this.repository.findByBusinessId(ctx);
  }

  async cancelInvitation(ctx: RequestContext, id: string): Promise<void> {
    if (!ctx.isAdmin()) {
      throw new ForbiddenError("No tienes permiso para cancelar invitaciones");
    }

    const invitation = await this.repository.findById(ctx, id);

    if (!invitation) {
      throw new NotFoundError("Invitación");
    }

    if (invitation.status !== "pending") {
      throw new ValidationError("Solo se pueden cancelar invitaciones pendientes");
    }

    await this.repository.updateStatus(ctx, id, "cancelled", {
      cancelledAt: new Date(),
    });
  }

  async validateToken(token: string): Promise<PublicInvitationData> {
    const invitation = await this.repository.findByToken(token);

    if (!invitation) {
      throw new NotFoundError("Invitación");
    }

    if (invitation.status !== "pending") {
      throw new ValidationError("Invitación ya procesada");
    }

    if (invitation.expiresAt < new Date()) {
      await this.repository.updateStatusByToken(token, "expired");
      throw new ValidationError("Invitación expirada");
    }

    return {
      email: invitation.email,
      name: invitation.inviteeName,
      salesPoint: invitation.salesPoint,
    };
  }

  async acceptInvitation(
    token: string,
    userId: string
  ): Promise<{
    businessId: string;
    businessUserId: string;
    role: "VENDEDOR";
    salesPoint: string | null;
  }> {
    const invitation = await this.repository.findByToken(token);

    if (!invitation) {
      throw new NotFoundError("Invitación");
    }

    if (invitation.status !== "pending") {
      throw new ValidationError("Invitación ya procesada");
    }

    if (invitation.expiresAt < new Date()) {
      await this.repository.updateStatusByToken(token, "expired");
      throw new ValidationError("Invitación expirada");
    }

    // Check if user already has a membership in THIS business
    const existingMembership = await this.businessRepo.findByUserIdAndBusinessId(
      userId,
      invitation.businessId
    );

    if (existingMembership) {
      throw new ConflictError("El usuario ya pertenece a este negocio");
    }

    // Create the membership
    const [membership] = await db
      .insert(businessUsers)
      .values({
        businessId: invitation.businessId,
        userId: userId,
        role: "VENDEDOR",
        salesPoint: invitation.salesPoint,
      })
      .returning();

    // Update invitation status
    await this.repository.updateStatusByToken(token, "accepted", {
      acceptedBy: userId,
      acceptedAt: new Date(),
    });

    return {
      businessId: membership.businessId,
      businessUserId: membership.id,
      role: "VENDEDOR",
      salesPoint: membership.salesPoint,
    };
  }
}

