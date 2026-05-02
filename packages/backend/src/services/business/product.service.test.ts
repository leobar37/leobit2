import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductService } from "./product.service";
import { db } from "../../lib/db";
import { NotFoundError, ValidationError } from "../../errors";

vi.mock("../../lib/db", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

describe("ProductService category contracts", () => {
  const transactionMock = db.transaction as ReturnType<typeof vi.fn>;

  const ctx = {
    businessId: "biz-1",
    businessUserId: "business-user-1",
    hasPermission: vi.fn((permission: string) =>
      permission === "products.manage" || permission === "inventory.read"
    ),
  };

  const category = {
    id: "cat-1",
    businessId: "biz-1",
    name: "Pollo Fresco",
    color: "#f97316",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const product = {
    id: "prod-1",
    businessId: "biz-1",
    name: "Pechuga",
    categoryId: "cat-1",
    unit: "kg" as const,
    basePrice: "15.00",
    costPrice: "10.00",
    isActive: true,
    imageId: null,
    hasVariants: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: {
      id: "cat-1",
      name: "Pollo Fresco",
      color: "#f97316",
    },
  };

  const createRepository = () => ({
    findById: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  });

  const createVariantRepository = () => ({
    create: vi.fn(),
  });

  const createCategoryRepository = () => ({
    findById: vi.fn(),
  });

  const mockTransaction = () => {
    const tx = {
      execute: vi.fn().mockResolvedValue([{ txid: "67890" }]),
    };

    transactionMock.mockImplementation(async (callback) => callback(tx as never));
    return tx;
  };

  beforeEach(() => {
    transactionMock.mockReset();
    ctx.hasPermission.mockClear();
  });

  it("creates a product with a business-owned categoryId", async () => {
    const repository = createRepository();
    const variantRepo = createVariantRepository();
    const categoryRepo = createCategoryRepository();
    const tx = mockTransaction();

    categoryRepo.findById.mockResolvedValue(category);
    repository.create.mockResolvedValue(product);

    const service = new ProductService(repository as never, variantRepo as never, categoryRepo as never);
    const result = await service.createProduct(ctx as never, {
      name: "Pechuga",
      categoryId: "cat-1",
      unit: "kg",
      basePrice: 15,
      costPrice: 10,
    });

    expect(result).toEqual({ data: product, txid: 67890 });
    expect(categoryRepo.findById).toHaveBeenCalledWith(ctx, "cat-1");
    expect(repository.create).toHaveBeenCalledWith(
      ctx,
      {
        name: "Pechuga",
        categoryId: "cat-1",
        unit: "kg",
        basePrice: "15",
        costPrice: "10",
        isActive: true,
        imageId: undefined,
        hasVariants: false,
      },
      tx
    );
    expect(variantRepo.create).toHaveBeenCalledWith(
      ctx,
      {
        productId: "prod-1",
        name: "Estándar",
        unitQuantity: "1",
        price: "15",
        costPrice: "10",
        isActive: true,
      },
      tx
    );
  });

  it("clears the category when update receives categoryId null", async () => {
    const repository = createRepository();
    const variantRepo = createVariantRepository();
    const categoryRepo = createCategoryRepository();
    const tx = mockTransaction();

    repository.findById.mockResolvedValue(product);
    repository.update.mockResolvedValue({
      ...product,
      categoryId: null,
      category: null,
    });

    const service = new ProductService(repository as never, variantRepo as never, categoryRepo as never);
    const result = await service.updateProduct(ctx as never, "prod-1", {
      categoryId: null,
    });

    expect(result.data.categoryId).toBeNull();
    expect(repository.update).toHaveBeenCalledWith(
      ctx,
      "prod-1",
      {
        categoryId: null,
        name: undefined,
        unit: undefined,
        basePrice: undefined,
        costPrice: undefined,
        isActive: undefined,
        imageId: undefined,
      },
      tx
    );
    expect(categoryRepo.findById).not.toHaveBeenCalled();
  });

  it("treats explicit undefined categoryId in update as category clearing", async () => {
    const repository = createRepository();
    const variantRepo = createVariantRepository();
    const categoryRepo = createCategoryRepository();
    const tx = mockTransaction();

    repository.findById.mockResolvedValue(product);
    repository.update.mockResolvedValue({
      ...product,
      categoryId: null,
      category: null,
    });

    const service = new ProductService(repository as never, variantRepo as never, categoryRepo as never);
    await service.updateProduct(ctx as never, "prod-1", {
      categoryId: undefined,
    });

    expect(repository.update).toHaveBeenCalledWith(
      ctx,
      "prod-1",
      expect.objectContaining({ categoryId: null }),
      tx
    );
  });

  it("rejects assigning a category from another business", async () => {
    const repository = createRepository();
    const variantRepo = createVariantRepository();
    const categoryRepo = createCategoryRepository();

    categoryRepo.findById.mockResolvedValue(undefined);

    const service = new ProductService(repository as never, variantRepo as never, categoryRepo as never);

    await expect(
      service.createProduct(ctx as never, {
        name: "Pechuga",
        categoryId: "foreign-category",
        unit: "kg",
        basePrice: 15,
      })
    ).rejects.toThrow(NotFoundError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects conflicting category filters", async () => {
    const repository = createRepository();
    const variantRepo = createVariantRepository();
    const categoryRepo = createCategoryRepository();

    const service = new ProductService(repository as never, variantRepo as never, categoryRepo as never);

    await expect(
      service.getProducts(ctx as never, {
        categoryId: "cat-1",
        uncategorized: true,
      })
    ).rejects.toThrow(ValidationError);

    expect(repository.findMany).not.toHaveBeenCalled();
  });

  it("assigns a new categoryId when updating a product", async () => {
    const repository = createRepository();
    const variantRepo = createVariantRepository();
    const categoryRepo = createCategoryRepository();
    const tx = mockTransaction();

    const newCategory = {
      id: "cat-2",
      businessId: "biz-1",
      name: "Huevos",
      color: "#eab308",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    repository.findById.mockResolvedValue(product);
    categoryRepo.findById.mockResolvedValue(newCategory);
    repository.update.mockResolvedValue({
      ...product,
      categoryId: "cat-2",
      category: {
        id: "cat-2",
        name: "Huevos",
        color: "#eab308",
      },
    });

    const service = new ProductService(repository as never, variantRepo as never, categoryRepo as never);
    const result = await service.updateProduct(ctx as never, "prod-1", {
      categoryId: "cat-2",
    });

    expect(result.data.categoryId).toBe("cat-2");
    expect(categoryRepo.findById).toHaveBeenCalledWith(ctx, "cat-2");
    expect(repository.update).toHaveBeenCalledWith(
      ctx,
      "prod-1",
      expect.objectContaining({ categoryId: "cat-2" }),
      tx
    );
  });

  it("rejects cross-business category assignment on update", async () => {
    const repository = createRepository();
    const variantRepo = createVariantRepository();
    const categoryRepo = createCategoryRepository();

    repository.findById.mockResolvedValue(product);
    categoryRepo.findById.mockResolvedValue(undefined);

    const service = new ProductService(repository as never, variantRepo as never, categoryRepo as never);

    await expect(
      service.updateProduct(ctx as never, "prod-1", {
        categoryId: "foreign-category",
      })
    ).rejects.toThrow(NotFoundError);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it("filters products by categoryId in getProducts", async () => {
    const repository = createRepository();
    const variantRepo = createVariantRepository();
    const categoryRepo = createCategoryRepository();

    categoryRepo.findById.mockResolvedValue(category);
    repository.findMany.mockResolvedValue([product]);

    const service = new ProductService(repository as never, variantRepo as never, categoryRepo as never);
    const result = await service.getProducts(ctx as never, {
      categoryId: "cat-1",
    });

    expect(result).toEqual([product]);
    expect(categoryRepo.findById).toHaveBeenCalledWith(ctx, "cat-1");
    expect(repository.findMany).toHaveBeenCalledWith(ctx, { categoryId: "cat-1" });
  });

  it("filters uncategorized products in getProducts", async () => {
    const repository = createRepository();
    const variantRepo = createVariantRepository();
    const categoryRepo = createCategoryRepository();

    const uncategorizedProduct = {
      ...product,
      categoryId: null,
      category: null,
    };

    repository.findMany.mockResolvedValue([uncategorizedProduct]);

    const service = new ProductService(repository as never, variantRepo as never, categoryRepo as never);
    const result = await service.getProducts(ctx as never, {
      uncategorized: true,
    });

    expect(result).toEqual([uncategorizedProduct]);
    expect(repository.findMany).toHaveBeenCalledWith(ctx, { uncategorized: true });
  });

  it("counts products by categoryId", async () => {
    const repository = createRepository();
    const variantRepo = createVariantRepository();
    const categoryRepo = createCategoryRepository();

    categoryRepo.findById.mockResolvedValue(category);
    repository.count.mockResolvedValue(5);

    const service = new ProductService(repository as never, variantRepo as never, categoryRepo as never);
    const result = await service.countProducts(ctx as never, {
      categoryId: "cat-1",
    });

    expect(result).toBe(5);
    expect(categoryRepo.findById).toHaveBeenCalledWith(ctx, "cat-1");
    expect(repository.count).toHaveBeenCalledWith(ctx, { categoryId: "cat-1", uncategorized: undefined, isActive: undefined });
  });

  it("counts uncategorized products", async () => {
    const repository = createRepository();
    const variantRepo = createVariantRepository();
    const categoryRepo = createCategoryRepository();

    repository.count.mockResolvedValue(3);

    const service = new ProductService(repository as never, variantRepo as never, categoryRepo as never);
    const result = await service.countProducts(ctx as never, {
      uncategorized: true,
    });

    expect(result).toBe(3);
    expect(repository.count).toHaveBeenCalledWith(ctx, { categoryId: undefined, uncategorized: true, isActive: undefined });
  });
});
