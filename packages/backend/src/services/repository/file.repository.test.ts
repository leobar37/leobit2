import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { FileRepository } from "./file.repository";
import { db } from "../../lib/db";
import { files } from "../../db/schema/files";
import type { RequestContext } from "../../context/request-context";

// Helper to create a test context for a specific business
function makeCtx(businessId: string): RequestContext {
  return {
    userId: "user-1",
    businessId,
    businessUserId: "bu-1",
    role: "owner",
    permissions: [],
  } as RequestContext;
}

describe("FileRepository tenant boundaries", () => {
  const repo = new FileRepository();
  const ctxA = makeCtx("biz-a");
  const ctxB = makeCtx("biz-b");

  beforeEach(async () => {
    await db.delete(files);
  });

  it("findById returns file only for same business", async () => {
    const [fileA] = await db
      .insert(files)
      .values({
        businessId: "biz-a",
        filename: "a.png",
        storagePath: "path/a.png",
        mimeType: "image/png",
        sizeBytes: 100,
      })
      .returning();

    await db.insert(files).values({
      businessId: "biz-b",
      filename: "b.png",
      storagePath: "path/b.png",
      mimeType: "image/png",
      sizeBytes: 100,
    });

    const foundA = await repo.findById(ctxA, fileA.id);
    expect(foundA).toBeDefined();
    expect(foundA?.businessId).toBe("biz-a");

    const notFoundB = await repo.findById(ctxB, fileA.id);
    expect(notFoundB).toBeUndefined();
  });

  it("findByIds returns only same-business files", async () => {
    const [fileA] = await db
      .insert(files)
      .values({
        businessId: "biz-a",
        filename: "a.png",
        storagePath: "path/a.png",
        mimeType: "image/png",
        sizeBytes: 100,
      })
      .returning();

    const [fileB] = await db
      .insert(files)
      .values({
        businessId: "biz-b",
        filename: "b.png",
        storagePath: "path/b.png",
        mimeType: "image/png",
        sizeBytes: 100,
      })
      .returning();

    const resultsA = await repo.findByIds(ctxA, [fileA.id, fileB.id]);
    expect(resultsA).toHaveLength(1);
    expect(resultsA[0].id).toBe(fileA.id);

    const resultsB = await repo.findByIds(ctxB, [fileA.id, fileB.id]);
    expect(resultsB).toHaveLength(1);
    expect(resultsB[0].id).toBe(fileB.id);
  });

  it("softDelete only affects same-business file", async () => {
    const [fileA] = await db
      .insert(files)
      .values({
        businessId: "biz-a",
        filename: "a.png",
        storagePath: "path/a.png",
        mimeType: "image/png",
        sizeBytes: 100,
      })
      .returning();

    await db.insert(files).values({
      businessId: "biz-b",
      filename: "b.png",
      storagePath: "path/b.png",
      mimeType: "image/png",
      sizeBytes: 100,
    });

    await repo.softDelete(ctxB, fileA.id);

    const stillThere = await db.select().from(files).where(eq(files.id, fileA.id));
    expect(stillThere[0].deletedAt).toBeNull();
  });
});
