import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { findSchema, isVersionCompatible, loadSchema, validateSchema } from "./schema-loader";

describe("schema-loader", () => {
  it("validates schema shape", () => {
    const valid = {
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      entities: {
        customers: {
          name: "customers",
          tableName: "customers",
          columns: [],
          config: {},
          graph: { parents: [], children: [], priority: 1 },
        },
      },
    };

    expect(validateSchema(valid)).toBe(true);
    expect(validateSchema({})).toBe(false);
  });

  it("checks major version compatibility", () => {
    expect(isVersionCompatible("1.0.0")).toBe(true);
    expect(isVersionCompatible("1.4.2")).toBe(true);
    expect(isVersionCompatible("2.0.0")).toBe(false);
  });

  it("loads schema from file", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "schema-loader-"));

    try {
      const schemaPath = join(tempDir, "sync.schema.json");
      const schemaData = {
        version: "1.0.0",
        generatedAt: new Date().toISOString(),
        entities: {
          customers: {
            name: "customers",
            tableName: "customers",
            columns: [],
            config: {},
            graph: { parents: [], children: [], priority: 1 },
          },
        },
      };

      await writeFile(schemaPath, JSON.stringify(schemaData), "utf-8");
      const loaded = await loadSchema(schemaPath);

      expect(loaded.version).toBe("1.0.0");
      expect(Object.keys(loaded.entities)).toContain("customers");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("finds schema up parent directories", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "schema-find-"));

    try {
      const nestedDir = join(tempDir, "a", "b");
      const schemaPath = join(tempDir, "sync.schema.json");
      await writeFile(schemaPath, "{}", "utf-8");

      const found = findSchema(nestedDir);
      expect(found).toBe(schemaPath);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
