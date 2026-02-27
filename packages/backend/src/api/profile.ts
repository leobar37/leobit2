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
      const body = ctx.body as any;
      if (!user?.id) {
        throw new UnauthorizedError();
      }

      const existingProfile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, user.id),
      });

      const profileData = {
        userId: user.id,
        dni: body.dni ?? null,
        phone: body.phone ?? null,
        birthDate: body.birthDate ?? null,
        avatarId: body.avatarId ?? existingProfile?.avatarId ?? null,
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
        dni: t.Optional(t.String({ maxLength: 20 })),
        phone: t.Optional(t.String({ maxLength: 50 })),
        birthDate: t.Optional(t.String({ format: "date" })),
        avatarId: t.Optional(t.String()),
      }),
    }
  );
