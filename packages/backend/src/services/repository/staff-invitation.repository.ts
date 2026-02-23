import { eq, and, desc } from "drizzle-orm";
import { db } from "../../lib/db";
import { staffInvitations, type StaffInvitation, type NewStaffInvitation, invitationStatusEnum } from "../../db/schema";
import type { RequestContext } from "../../context/request-context";

export type InvitationStatus = typeof invitationStatusEnum.enumValues[number];

export class StaffInvitationRepository {
  async findById(ctx: RequestContext, id: string): Promise<StaffInvitation | undefined> {
    const invitation = await db.query.staffInvitations.findFirst({
      where: and(
        eq(staffInvitations.id, id),
        eq(staffInvitations.businessId, ctx.businessId)
      ),
    });
    return invitation;
  }

  async findByToken(token: string): Promise<StaffInvitation | undefined> {
    const invitation = await db.query.staffInvitations.findFirst({
      where: eq(staffInvitations.token, token),
    });
    return invitation;
  }

  async findByBusinessId(ctx: RequestContext): Promise<StaffInvitation[]> {
    const invitations = await db.query.staffInvitations.findMany({
      where: eq(staffInvitations.businessId, ctx.businessId),
      orderBy: desc(staffInvitations.createdAt),
    });
    return invitations;
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewStaffInvitation, "businessId" | "invitedBy" | "id" | "createdAt" | "updatedAt">
  ): Promise<StaffInvitation> {
    const [invitation] = await db
      .insert(staffInvitations)
      .values({
        ...data,
        businessId: ctx.businessId,
        invitedBy: ctx.userId,
      })
      .returning();

    return invitation;
  }

  async updateStatus(
    ctx: RequestContext,
    id: string,
    status: InvitationStatus,
    additionalData?: {
      acceptedBy?: string;
      acceptedAt?: Date;
      rejectedAt?: Date;
      cancelledAt?: Date;
    }
  ): Promise<StaffInvitation | undefined> {
    const [invitation] = await db
      .update(staffInvitations)
      .set({
        status,
        ...(additionalData?.acceptedBy !== undefined && { acceptedBy: additionalData.acceptedBy }),
        ...(additionalData?.acceptedAt !== undefined && { acceptedAt: additionalData.acceptedAt }),
        ...(additionalData?.rejectedAt !== undefined && { rejectedAt: additionalData.rejectedAt }),
        ...(additionalData?.cancelledAt !== undefined && { cancelledAt: additionalData.cancelledAt }),
        updatedAt: new Date(),
      })
      .where(and(
        eq(staffInvitations.id, id),
        eq(staffInvitations.businessId, ctx.businessId)
      ))
      .returning();

    return invitation;
  }

  async updateStatusByToken(
    token: string,
    status: InvitationStatus,
    additionalData?: {
      acceptedBy?: string;
      acceptedAt?: Date;
      rejectedAt?: Date;
    }
  ): Promise<StaffInvitation | undefined> {
    const [invitation] = await db
      .update(staffInvitations)
      .set({
        status,
        ...(additionalData?.acceptedBy !== undefined && { acceptedBy: additionalData.acceptedBy }),
        ...(additionalData?.acceptedAt !== undefined && { acceptedAt: additionalData.acceptedAt }),
        ...(additionalData?.rejectedAt !== undefined && { rejectedAt: additionalData.rejectedAt }),
        updatedAt: new Date(),
      })
      .where(eq(staffInvitations.token, token))
      .returning();

    return invitation;
  }

  async delete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .delete(staffInvitations)
      .where(and(
        eq(staffInvitations.id, id),
        eq(staffInvitations.businessId, ctx.businessId)
      ));
  }
}
