import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { db } from "../lib/db";
import { userProfiles } from "../db/schema/user-profiles";
import { r2Storage } from "../services/r2-storage.service";

export const profileRoutes = new Elysia({ prefix: "/profile" })
  .use(requireAuth)
  .get("/me", async (ctx) => {
    const user = (ctx as any).user;
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, user.id),
    });

    const avatarUrl = profile?.avatarUrl
      ? await r2Storage.getFileUrl(profile.avatarUrl)
      : null;

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        dni: profile?.dni ?? null,
        phone: profile?.phone ?? null,
        birthDate: profile?.birthDate ?? null,
        avatarUrl,
      },
    };
  })
  .put(
    "/me",
    async (ctx) => {
      const user = (ctx as any).user;
      const body = ctx.body as any;
      
      const existingProfile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, user.id),
      });

      const profileData = {
        userId: user.id,
        dni: body.dni ?? null,
        phone: body.phone ?? null,
        birthDate: body.birthDate ?? null,
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
          avatarUrl: profile.avatarUrl,
        },
      };
    },
    {
      body: t.Object({
        dni: t.Optional(t.String({ maxLength: 20 })),
        phone: t.Optional(t.String({ maxLength: 50 })),
        birthDate: t.Optional(t.String({ format: "date" })),
      }),
    }
  )
  .post(
    "/avatar",
    async (ctx) => {
      const user = (ctx as any).user;
      const body = ctx.body as any;
      const { file } = body;

      if (!file || file.size === 0) {
        return { success: false, error: "No file provided" };
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        return {
          success: false,
          error: "Invalid file type. Only JPEG, PNG and WebP allowed",
        };
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return { success: false, error: "File too large. Max 5MB" };
      }

      const extension = file.name.split(".").pop();
      const path = `users/${user.id}/avatars/${crypto.randomUUID()}.${extension}`;

      const buffer = await file.arrayBuffer();
      await r2Storage.uploadFile(path, { buffer, type: file.type });

      const existingProfile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, user.id),
      });

      if (existingProfile?.avatarUrl) {
        try {
          await r2Storage.deleteFile(existingProfile.avatarUrl);
        } catch {
        }
      }

      if (existingProfile) {
        await db
          .update(userProfiles)
          .set({ avatarUrl: path, updatedAt: new Date() })
          .where(eq(userProfiles.userId, user.id));
      } else {
        await db.insert(userProfiles).values({
          userId: user.id,
          avatarUrl: path,
          updatedAt: new Date(),
        });
      }

      const avatarUrl = await r2Storage.getFileUrl(path);

      return {
        success: true,
        data: { avatarUrl },
      };
    },
    {
      body: t.Object({
        file: t.File(),
      }),
    }
  );
