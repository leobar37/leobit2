import { Elysia, t } from "elysia";
import { randomUUID } from "crypto";
import { contextPlugin } from "../plugins/context";
import { servicesPlugin } from "../plugins/services";
import type { RequestContext } from "../context/request-context";
import { auth } from "../lib/auth";
import { UnauthorizedError } from "../errors";

const INVITATION_EXPIRY_DAYS = 7;

function generateInvitationCode(): string {
  return randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase();
}

export const invitationRoutes = new Elysia({ prefix: "/invitations" })
  .use(contextPlugin)
  .use(servicesPlugin)
  .post(
    "/",
    async ({ staffInvitationService, ctx, body }) => {
      const token = generateInvitationCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

      const invitation = await staffInvitationService.createInvitation(
        ctx as RequestContext,
        {
          email: body.email,
          name: body.name,
          salesPoint: body.salesPoint,
          token,
          expiresAt,
        }
      );

      return {
        success: true,
        data: {
          invitationId: invitation.id,
          token: invitation.token,
          expiresAt: invitation.expiresAt,
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        name: t.String({ minLength: 2 }),
        salesPoint: t.Optional(t.String()),
      }),
    }
  )
  .get("/", async ({ staffInvitationService, ctx }) => {
    const invitations = await staffInvitationService.getInvitations(
      ctx as RequestContext
    );

    return {
      success: true,
      data: invitations,
    };
  })
  .post(
    "/:id/cancel",
    async ({ staffInvitationService, ctx, params }) => {
      await staffInvitationService.cancelInvitation(ctx as RequestContext, params.id);

      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  );

export const publicInvitationRoutes = new Elysia({
  prefix: "/public/invitations",
})
  .use(servicesPlugin)
  .get(
    "/:token",
    async ({ staffInvitationService, params }) => {
      const data = await staffInvitationService.validateToken(params.token);

      return {
        success: true,
        data,
      };
    },
    {
      params: t.Object({ token: t.String() }),
    }
  )
  .post(
    "/accept",
    async ({ staffInvitationService, request, body }) => {
      const session = await auth.api.getSession({ headers: request.headers });

      if (!session) {
        throw new UnauthorizedError();
      }

      // Derive userId from authenticated session, ignore client-supplied userId
      await staffInvitationService.acceptInvitation(body.token, session.user.id);

      return { success: true };
    },
    {
      body: t.Object({
        token: t.String(),
      }),
    }
  );
