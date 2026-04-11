import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { db } from "../lib/db";
import { userProfiles } from "../db/schema/user-profiles";
import { UnauthorizedError } from "../errors";

export const profileRoutes = new Elysia({ prefix: "/profile" })
  .use(requireAuth)
  .get("/me", async (ctx) => {
    const user = (ctx as any).user;
    if (!user?.id) {
      throw new UnauthorizedError();
    }

    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, user.id),
    });

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        dni: profile?.dni ?? null,
        phone: profile?.phone ?? null,
        birthDate: profile?.birthDate ?? null,
        avatarId: profile?.avatarId ?? null,
      },
    };
  })
  .put(
    "/me",
    async (ctx) => {
      const user = (ctx as any).user;
      const body = ctx.body as Record<string, unknown>;
      if (!user?.id) {
        throw new UnauthorizedError();
      }

      const existingProfile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, user.id),
      });

      const dniValue = body.dni;
      const phoneValue = body.phone;
      const birthDateValue = body.birthDate;
      const avatarIdValue = body.avatarId;

      const profileData = {
        userId: user.id,
        dni: dniValue === "" || dniValue === undefined || dniValue === null ? null : String(dniValue),
        phone: phoneValue === "" || phoneValue === undefined || phoneValue === null ? null : String(phoneValue),
        birthDate: birthDateValue === "" || birthDateValue === undefined || birthDateValue === null ? null : String(birthDateValue),
        avatarId: avatarIdValue === "" || avatarIdValue === undefined || avatarIdValue === null ? (existingProfile?.avatarId ?? null) : String(avatarIdValue),
        updatedAt: new Date(),
      };

      let profile;
      if (existingProfile) {
        [profile] = await db
          .update(userProfiles)
          .set(profileData)
          .where(eq(userProfiles.userId, user.id))
          .returning();
      } else {
        [profile] = await db.insert(userProfiles).values(profileData).returning();
      }

      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          dni: profile.dni,
          phone: profile.phone,
          birthDate: profile.birthDate,
          avatarId: profile.avatarId,
        },
      };
    },
    {
      body: t.Object({
        dni: t.Optional(t.Union([t.String({ maxLength: 20 }), t.Null()])),
        phone: t.Optional(t.Union([t.String({ maxLength: 50 }), t.Null()])),
        birthDate: t.Optional(t.Union([t.String({ format: "date" }), t.Null()])),
        avatarId: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  );
