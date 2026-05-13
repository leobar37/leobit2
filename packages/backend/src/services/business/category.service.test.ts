import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryService } from "./category.service";
import { db } from "../../lib/db";
import { ConflictError, NotFoundError } from "../../errors";

vi.mock("../../lib/db", () => ({
  db: {
    transaction: vi.fn(),
    select: vi.fn(),
  },
}));

describe("CategoryService", () => {
  const transactionMock = db.transaction as ReturnType<typeof vi.fn>;
  const selectMock = db.select as ReturnType<typeof vi.fn>;

  const ctx = {
    businessId: "biz-1",
    businessUserId: "business-user-1",
    hasPermission: vi.fn((permission: string) => permission === "products.manage"),
  };

  const category = {
    id: "cat-1",
    businessId: "biz-1",
    name: "Pollo Fresco",
    color: "#f97316",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createRepository = () => ({
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  });

  const mockTransaction = () => {
    const tx = {
      execute: vi.fn().mockResolvedValue([]),
    };

    transactionMock.mockImplementation(async (callback) => callback(tx as never));
    return tx;
  };

  const mockAssignedProductCount = (count: number) => {
    const whereMock = vi.fn().mockResolvedValue([{ count }]);
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    selectMock.mockReturnValue({ from: fromMock });
    return { fromMock, whereMock };
  };

  beforeEach(() => {
    transactionMock.mockReset();
    selectMock.mockReset();
    ctx.hasPermission.mockClear();
  });

  it("creates a category when name is unique in the business", async () => {
    const repository = createRepository();
    repository.count.mockResolvedValue(0);
    repository.create.mockResolvedValue(category);
    const tx = mockTransaction();

    const service = new CategoryService(repository as never);
    const result = await service.createCategory(ctx as never, {
      name: "  Pollo Fresco  ",
      color: "#123456",
    });

    expect(result).toEqual(category);
    expect(repository.count).toHaveBeenCalledWith(ctx, { name: "Pollo Fresco" });
    expect(repository.create).toHaveBeenCalledWith(
      ctx,
      { name: "Pollo Fresco", color: "#123456" },
      tx
    );
  });

  it("updates a category and preserves business scope", async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(category);
    repository.count.mockResolvedValue(0);
    repository.update.mockResolvedValue({ ...category, name: "Huevo", color: "#654321" });
    const tx = mockTransaction();

    const service = new CategoryService(repository as never);
    const result = await service.updateCategory(ctx as never, "cat-1", {
      name: " Huevo ",
      color: "#654321",
    });

    expect(result.name).toBe("Huevo");
    expect(repository.findById).toHaveBeenCalledWith(ctx, "cat-1");
    expect(repository.count).toHaveBeenCalledWith(ctx, { name: "Huevo", excludeId: "cat-1" });
    expect(repository.update).toHaveBeenCalledWith(
      ctx,
      "cat-1",
      { name: "Huevo", color: "#654321" },
      tx
    );
  });

  it("deletes a category when no products are assigned", async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(category);
    const { whereMock } = mockAssignedProductCount(0);

    const service = new CategoryService(repository as never);
    await service.deleteCategory(ctx as never, "cat-1");

    expect(repository.findById).toHaveBeenCalledWith(ctx, "cat-1");
    expect(whereMock).toHaveBeenCalledTimes(1);
    expect(repository.delete).toHaveBeenCalledWith(ctx, "cat-1");
  });

  it("lists categories for the current business context", async () => {
    const repository = createRepository();
    repository.findAll.mockResolvedValue([category]);

    const service = new CategoryService(repository as never);
    const result = await service.listCategories(ctx as never);

    expect(result).toEqual([category]);
    expect(repository.findAll).toHaveBeenCalledWith(ctx);
  });

  it("rejects duplicate category names case-insensitively within the same business", async () => {
    const repository = createRepository();
    repository.count.mockResolvedValue(1);

    const service = new CategoryService(repository as never);

    await expect(
      service.createCategory(ctx as never, {
        name: "pollo fresco",
      })
    ).rejects.toThrow(ConflictError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("blocks deletion when products are assigned to the category", async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(category);
    mockAssignedProductCount(2);

    const service = new CategoryService(repository as never);

    await expect(service.deleteCategory(ctx as never, "cat-1")).rejects.toThrow(ConflictError);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("does not expose categories from another business", async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(undefined);

    const service = new CategoryService(repository as never);

    await expect(service.getCategory(ctx as never, "foreign-category")).rejects.toThrow(
      NotFoundError
    );
    expect(repository.findById).toHaveBeenCalledWith(ctx, "foreign-category");
  });

  it("rejects update with duplicate name case-insensitively within the same business", async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(category);
    repository.count.mockResolvedValue(1);

    const service = new CategoryService(repository as never);

    await expect(
      service.updateCategory(ctx as never, "cat-1", {
        name: "pollo fresco",
      })
    ).rejects.toThrow(ConflictError);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it("blocks updating a category from another business", async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(undefined);

    const service = new CategoryService(repository as never);

    await expect(
      service.updateCategory(ctx as never, "foreign-category", {
        name: "Nuevo nombre",
      })
    ).rejects.toThrow(NotFoundError);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it("blocks deleting a category from another business", async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(undefined);

    const service = new CategoryService(repository as never);

    await expect(service.deleteCategory(ctx as never, "foreign-category")).rejects.toThrow(
      NotFoundError
    );

    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("allows same category name in different businesses", async () => {
    const repository = createRepository();
    repository.count.mockResolvedValue(0);
    repository.create.mockResolvedValue(category);
    const tx = mockTransaction();

    const otherCtx = {
      ...ctx,
      businessId: "biz-2",
    };

    const service = new CategoryService(repository as never);
    const result = await service.createCategory(otherCtx as never, {
      name: "Pollo Fresco",
      color: "#123456",
    });

    expect(result).toEqual(category);
    expect(repository.count).toHaveBeenCalledWith(otherCtx, { name: "Pollo Fresco" });
    expect(repository.create).toHaveBeenCalledWith(
      otherCtx,
      { name: "Pollo Fresco", color: "#123456" },
      tx
    );
  });
});
