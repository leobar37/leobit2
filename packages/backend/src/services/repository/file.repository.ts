import { eq, and, desc, isNull, inArray } from "drizzle-orm";
import { db } from "../../lib/db";
import { files, type FileRecord, type NewFileRecord } from "../../db/schema/files";
import type { RequestContext } from "../../context/request-context";

export class FileRepository {
  async findMany(
    ctx: RequestContext,
    filters?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<FileRecord[]> {
    return db.query.files.findMany({
      where: and(
        eq(files.businessId, ctx.businessId),
        isNull(files.deletedAt)
      ),
      orderBy: desc(files.createdAt),
      limit: filters?.limit,
      offset: filters?.offset,
    });
  }

  async findById(ctx: RequestContext, id: string): Promise<FileRecord | undefined> {
    return db.query.files.findFirst({
      where: and(
        eq(files.id, id),
        isNull(files.deletedAt)
      ),
    });
  }

  async findByIds(ctx: RequestContext, ids: string[]): Promise<FileRecord[]> {
    if (ids.length === 0) return [];
    
    return db.query.files.findMany({
      where: and(
        inArray(files.id, ids),
        isNull(files.deletedAt)
      ),
    });
  }

  async create(
    ctx: RequestContext,
    data: Omit<NewFileRecord, "id" | "createdAt" | "deletedAt" | "deletedBy">
  ): Promise<FileRecord> {
    const [file] = await db
      .insert(files)
      .values({
        ...data,
        businessId: ctx.businessId,
      })
      .returning();

    return file;
  }

  async createForOnboarding(
    data: Omit<NewFileRecord, "businessId" | "id" | "createdAt" | "deletedAt" | "deletedBy">
  ): Promise<FileRecord> {
    const [file] = await db
      .insert(files)
      .values({
        ...data,
        businessId: null, // Will be updated after organization creation
      })
      .returning();

    return file;
  }

  async softDelete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .update(files)
      .set({
        deletedAt: new Date(),
        deletedBy: ctx.userId,
      })
      .where(and(
        eq(files.id, id),
        isNull(files.deletedAt)
      ));
  }

  async updateBusinessId(
    id: string,
    businessId: string
  ): Promise<void> {
    await db
      .update(files)
      .set({ businessId })
      .where(eq(files.id, id));
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Omit<NewFileRecord, "id" | "createdAt" | "deletedAt" | "deletedBy">>,
    tx?: any,
    expectedVersion?: number
  ): Promise<FileRecord | null> {
    const dbOrTx = tx || db;

    if (expectedVersion !== undefined) {
      const [existing] = await dbOrTx
        .select({ version: files.version })
        .from(files)
        .where(and(
          eq(files.id, id),
          eq(files.businessId, ctx.businessId),
          isNull(files.deletedAt)
        ));

      if (!existing) {
        return null;
      }

      if (existing.version !== expectedVersion) {
        throw new Error(
          `Version conflict: expected version ${expectedVersion} but server has version ${existing.version}. The record was modified by another device. Please refresh and try again.`
        );
      }
    }

    const [file] = await dbOrTx
      .update(files)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(files.id, id),
        eq(files.businessId, ctx.businessId),
        isNull(files.deletedAt)
      ))
      .returning();

    return file || null;
  }
}
