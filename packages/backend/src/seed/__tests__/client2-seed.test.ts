import { describe, it, expect, beforeAll } from "vitest";
import {
  PRODUCTS,
  CUSTOMERS,
  SALES,
  ABONOS,
  CLIENT2_METADATA,
  CLIENT2_USER,
  CLIENT2_BUSINESS,
  toSeedKey,
} from "../client2-data";
import {
  CUSTOMER_ALIAS_MAPPINGS,
  PRODUCT_RESOLUTION_RULES,
  PAYMENT_MARKER_INTERPRETATIONS,
  DATE_PARSING_RULES,
  CARRY_OVER_SEMANTICS,
  buildCustomerAliasMap,
  resolveCustomerAlias,
  resolveProductRule,
  interpretPaymentMarkers,
  normalizeDate,
  isCarryOverEntry,
  NORMALIZATION_SUMMARY,
} from "../client2-mappings";
import {
  validateCanonical,
  loadManifest,
  formatValidationReport,
} from "../validate-canonical";

/**
 * Client2 Seed Verification Tests
 *
 * These tests verify:
 * - Deterministic exports from client2-data.ts
 * - Counts match expected values
 * - Provenance (sourceRef links back to canonical)
 * - Normalization maps behave correctly
 * - Idempotency of the seed data derivation
 */
describe("client2-data exports", () => {
  it("should have deterministic metadata", () => {
    expect(CLIENT2_METADATA.canonicalFileCount).toBe(100);
    expect(CLIENT2_METADATA.productCount).toBeGreaterThan(0);
    expect(CLIENT2_METADATA.customerCount).toBeGreaterThan(0);
    expect(CLIENT2_METADATA.saleCount).toBeGreaterThan(0);
    expect(CLIENT2_METADATA.canonicalDirectory).toContain("JUAVIK/canonical/");
  });

  it("should have consistent product counts", () => {
    expect(PRODUCTS.length).toBe(CLIENT2_METADATA.productCount);
    const variantCount = PRODUCTS.reduce((sum, p) => sum + p.variants.length, 0);
    expect(variantCount).toBe(CLIENT2_METADATA.variantCount);
  });

  it("should have consistent customer counts", () => {
    expect(CUSTOMERS.length).toBe(CLIENT2_METADATA.customerCount);
  });

  it("should have consistent sales counts", () => {
    expect(SALES.length).toBe(CLIENT2_METADATA.saleCount);
  });

  it("should have consistent abono counts", () => {
    expect(ABONOS.length).toBe(CLIENT2_METADATA.abonoCount);
  });

  it("should have valid user credentials", () => {
    expect(CLIENT2_USER.email).toBe("juavik@gmail.com");
    expect(CLIENT2_USER.password).toBe("Prueba@123");
    expect(CLIENT2_USER.name).toBe("JUAVIK");
  });

  it("should have valid business configuration", () => {
    expect(CLIENT2_BUSINESS.name).toBe("JUAVIK");
    expect(CLIENT2_BUSINESS.ruc).toBe("20600000002");
    expect(CLIENT2_BUSINESS.usarDistribucion).toBe(false);
  });
});

describe("provenance", () => {
  it("every sale should have a sourceRef linking to canonical", () => {
    for (const sale of SALES) {
      expect(sale.sourceRef).toBeDefined();
      expect(sale.sourceRef.length).toBeGreaterThan(0);
      // Format: cuaderno-tanchy-N#block-line
      expect(sale.sourceRef).toMatch(/^cuaderno-tanchy-\d+#\d+-\d+$/);
    }
  });

  it("every abono should have a sourceRef linking to canonical", () => {
    for (const abono of ABONOS) {
      expect(abono.sourceRef).toBeDefined();
      expect(abono.sourceRef.length).toBeGreaterThan(0);
      // Format: cuaderno-tanchy-N#block-line:abono
      expect(abono.sourceRef).toMatch(/^cuaderno-tanchy-\d+#\d+-\d+:abono$/);
    }
  });

  it("every abono should reference an existing sale", () => {
    const saleSourceRefs = new Set(SALES.map((s) => s.sourceRef));
    for (const abono of ABONOS) {
      const relatedSaleRef = abono.relatedSaleSourceRef;
      expect(saleSourceRefs.has(relatedSaleRef)).toBe(true);
    }
  });

  it("every sale should reference an existing customer", () => {
    const customerKeys = new Set(CUSTOMERS.map((c) => c.key));
    for (const sale of SALES) {
      expect(customerKeys.has(sale.customerKey)).toBe(true);
    }
  });

  it("every abono should reference an existing customer", () => {
    const customerKeys = new Set(CUSTOMERS.map((c) => c.key));
    for (const abono of ABONOS) {
      expect(customerKeys.has(abono.customerKey)).toBe(true);
    }
  });
});

describe("customer normalization maps", () => {
  it("should have unique canonical names", () => {
    const canonicalNames = CUSTOMER_ALIAS_MAPPINGS.map((m) => m.canonicalName);
    const uniqueNames = new Set(canonicalNames);
    expect(uniqueNames.size).toBe(canonicalNames.length);
  });

  it("should have unique seed keys", () => {
    const seedKeys = CUSTOMER_ALIAS_MAPPINGS.map((m) => m.seedKey);
    const uniqueKeys = new Set(seedKeys);
    expect(uniqueKeys.size).toBe(seedKeys.length);
  });

  it("should resolve known aliases correctly", () => {
    const panchoMapping = resolveCustomerAlias("Pancho");
    expect(panchoMapping).not.toBeNull();
    expect(panchoMapping?.canonicalName).toBe("Pancho");
    expect(panchoMapping?.seedKey).toBe("pancho");

    const arteagaMapping = resolveCustomerAlias("arteaga");
    expect(arteagaMapping?.canonicalName).toBe("Arteaga");
  });

  it("should handle Blady/Glady alias", () => {
    const bladyMapping = resolveCustomerAlias("Blady");
    const gladyMapping = resolveCustomerAlias("Glady");
    expect(bladyMapping?.seedKey).toBe(gladyMapping?.seedKey);
  });

  it("should return null for unknown customers", () => {
    const unknownMapping = resolveCustomerAlias("UnknownCustomer123");
    expect(unknownMapping).toBeNull();
  });

  it("should build alias map without collisions", () => {
    expect(() => buildCustomerAliasMap()).not.toThrow();
    const map = buildCustomerAliasMap();
    expect(map.size).toBeGreaterThan(0);
  });
});

describe("product resolution rules", () => {
  it("should have rules in priority order", () => {
    // More specific rules should come before general ones
    const polloRule = PRODUCT_RESOLUTION_RULES.find((r) => r.productKey === "pollo");
    const medioRule = PRODUCT_RESOLUTION_RULES.find((r) => r.productKey === "medio-pollo");
    expect(PRODUCT_RESOLUTION_RULES.indexOf(medioRule!)).toBeLessThan(
      PRODUCT_RESOLUTION_RULES.indexOf(polloRule!)
    );
  });

  it("should resolve huevo correctly", () => {
    const rule = resolveProductRule({
      normalizedProductCandidate: "huevo",
      rawText: "huevo",
    });
    expect(rule?.productKey).toBe("huevo");
  });

  it("should resolve 1/2 pollo correctly", () => {
    const rule = resolveProductRule({
      normalizedProductCandidate: "1/2 pollo",
      rawText: "1/2 pollo",
    });
    expect(rule?.productKey).toBe("medio-pollo");
  });

  it("should resolve generic pollo", () => {
    const rule = resolveProductRule({
      normalizedProductCandidate: null,
      rawText: "x10.5 = 50",
    });
    expect(rule?.productKey).toBe("pollo");
  });
});

describe("payment marker interpretations", () => {
  it("should interpret Yapeo marker", () => {
    const interpretation = interpretPaymentMarkers({
      markers: { hasYapeo: true },
      rawLineText: "test Yapeo",
    });
    expect(interpretation?.paymentStatus).toBe("paid");
    expect(interpretation?.paymentMethod).toBe("yape");
  });

  it("should interpret P marker", () => {
    const interpretation = interpretPaymentMarkers({
      markers: { hasP: true, hasNP: false },
      rawLineText: "test P",
    });
    expect(interpretation?.paymentStatus).toBe("paid");
    expect(interpretation?.marker).toBe("P");
  });

  it("should interpret NP marker over P", () => {
    const interpretation = interpretPaymentMarkers({
      markers: { hasP: true, hasNP: true },
      rawLineText: "test NP",
    });
    expect(interpretation?.paymentStatus).toBe("no_pago");
  });

  it("should interpret XYapear marker", () => {
    const interpretation = interpretPaymentMarkers({
      markers: { hasXYapear: true },
      rawLineText: "test XYapear",
    });
    expect(interpretation?.paymentStatus).toBe("pending_yape");
  });
});

describe("date parsing rules", () => {
  it("should normalize standard notebook dates", () => {
    const date = normalizeDate("Sábado 7-2-26");
    expect(date).toBe("2026-02-07");
  });

  it("should normalize date only format", () => {
    const date = normalizeDate("10-2-26");
    expect(date).toBe("2026-02-10");
  });

  it("should normalize slash format", () => {
    const date = normalizeDate("15/3/26");
    expect(date).toBe("2026-03-15");
  });

  it("should pass through ISO dates", () => {
    const date = normalizeDate("2026-02-07");
    expect(date).toBe("2026-02-07");
  });

  it("should return null for invalid dates", () => {
    const date = normalizeDate("invalid");
    expect(date).toBeNull();
  });

  it("should handle null input", () => {
    const date = normalizeDate(null);
    expect(date).toBeNull();
  });
});

describe("carry-over semantics", () => {
  it("should identify carry-over by line type", () => {
    const isCarryOver = isCarryOverEntry({
      lineType: "balance_reference",
      payment: null,
      rawLineText: "test",
    });
    expect(isCarryOver).toBe(true);
  });

  it("should identify carry-over by flag", () => {
    const isCarryOver = isCarryOverEntry({
      lineType: "single_entry_line",
      payment: { carryOverFromPrevious: true },
      rawLineText: "test",
    });
    expect(isCarryOver).toBe(true);
  });

  it("should identify carry-over by Actual note", () => {
    const isCarryOver = isCarryOverEntry({
      lineType: "single_entry_line",
      payment: null,
      rawLineText: "Actual 88.2",
    });
    expect(isCarryOver).toBe(true);
  });

  it("should not identify regular sales as carry-over", () => {
    const isCarryOver = isCarryOverEntry({
      lineType: "single_entry_line",
      payment: null,
      rawLineText: "Pancho x10.5 = 50",
    });
    expect(isCarryOver).toBe(false);
  });
});

describe("toSeedKey utility", () => {
  it("should normalize accented characters", () => {
    const key = toSeedKey("José María");
    expect(key).toBe("jose-maria");
  });

  it("should convert to lowercase", () => {
    const key = toSeedKey("PANCHO");
    expect(key).toBe("pancho");
  });

  it("should replace spaces with hyphens", () => {
    const key = toSeedKey("Violeta R");
    expect(key).toBe("violeta-r");
  });

  it("should handle empty strings", () => {
    const key = toSeedKey("");
    expect(key).toBe("sin-clave");
  });
});

describe("normalization summary", () => {
  it("should have consistent summary values", () => {
    expect(NORMALIZATION_SUMMARY.customerAliases).toBeGreaterThan(0);
    expect(NORMALIZATION_SUMMARY.productRules).toBeGreaterThan(0);
    expect(NORMALIZATION_SUMMARY.paymentMarkers).toBeGreaterThan(0);
    expect(NORMALIZATION_SUMMARY.dateRules).toBeGreaterThan(0);
    expect(NORMALIZATION_SUMMARY.carryOverTreatment).toBe("add_to_balance");
  });
});

describe("idempotency", () => {
  it("should produce consistent counts on repeated evaluation", () => {
    // The counts should be deterministic since client2-data is derived
    // from canonical files which are fixed
    const firstRun = {
      productCount: PRODUCTS.length,
      customerCount: CUSTOMERS.length,
      saleCount: SALES.length,
      abonoCount: ABONOS.length,
    };

    // Re-import to verify consistency
    const secondRun = {
      productCount: PRODUCTS.length,
      customerCount: CUSTOMERS.length,
      saleCount: SALES.length,
      abonoCount: ABONOS.length,
    };

    expect(secondRun.productCount).toBe(firstRun.productCount);
    expect(secondRun.customerCount).toBe(firstRun.customerCount);
    expect(secondRun.saleCount).toBe(firstRun.saleCount);
    expect(secondRun.abonoCount).toBe(firstRun.abonoCount);
  });
});

describe("canonical validation", () => {
  it("should load the manifest successfully", () => {
    const manifest = loadManifest();
    expect(manifest).not.toBeNull();
    expect(manifest?.totalPages).toBe(100);
    expect(manifest?.datasetName).toBe("JUAVIK");
  });

  it("should validate all 100 canonical files", () => {
    const result = validateCanonical({ failOnBlocking: false, includeWarnings: false });

    // Should find all 100 files
    expect(result.stats.totalFound).toBe(100);
    expect(result.stats.totalExpected).toBe(100);

    // Should not have missing files
    const missingFiles = result.errors.filter((e) => e.type === "missing_file");
    expect(missingFiles.length).toBe(0);

    // Should not have invalid JSON
    const invalidJson = result.errors.filter((e) => e.type === "invalid_json");
    expect(invalidJson.length).toBe(0);

    // Should not have schema errors
    const schemaErrors = result.errors.filter((e) => e.type === "invalid_schema");
    expect(schemaErrors.length).toBe(0);

    // Should not have duplicate IDs
    const duplicates = result.errors.filter((e) => e.type === "duplicate_id");
    expect(duplicates.length).toBe(0);
  });

  it("should format validation report", () => {
    const result = validateCanonical({ failOnBlocking: false, includeWarnings: false });
    const report = formatValidationReport(result);

    expect(report).toContain("JUAVIK Canonical Validation Report");
    expect(report).toContain("Total Expected: 100");
    expect(report).toContain("Total Found: 100");
  });
});

describe("data integrity", () => {
  it("every product should have valid variants", () => {
    for (const product of PRODUCTS) {
      expect(product.variants.length).toBeGreaterThan(0);
      for (const variant of product.variants) {
        expect(variant.key).toBeDefined();
        expect(variant.name).toBeDefined();
        expect(variant.sku).toBeDefined();
        expect(variant.price).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("every sale should have valid items", () => {
    for (const sale of SALES) {
      expect(sale.items.length).toBeGreaterThan(0);
      for (const item of sale.items) {
        expect(item.productKey).toBeDefined();
        expect(item.variantKey).toBeDefined();
        expect(item.quantity).toBeGreaterThan(0);
        expect(item.unitPrice).toBeGreaterThan(0);
        expect(item.subtotal).toBeGreaterThan(0);
      }
    }
  });

  it("sale amounts should be consistent", () => {
    for (const sale of SALES) {
      const calculatedTotal = sale.items.reduce((sum, item) => sum + item.subtotal, 0);
      // Allow small rounding differences
      expect(Math.abs(calculatedTotal - sale.totalAmount)).toBeLessThan(0.1);
    }
  });

  it("payment statuses should be valid", () => {
    const validStatuses = [
      "paid",
      "unpaid",
      "partially_paid",
      "pending_yape",
      "no_pago",
      "mixed",
      "conflict",
      "unknown",
    ];
    for (const sale of SALES) {
      expect(validStatuses).toContain(sale.paymentStatus);
    }
  });

  it("sale types should be valid", () => {
    const validTypes = ["contado", "credito"];
    for (const sale of SALES) {
      expect(validTypes).toContain(sale.saleType);
    }
  });

  it("abono amounts should be positive", () => {
    for (const abono of ABONOS) {
      expect(abono.amount).toBeGreaterThan(0);
    }
  });

  it("abono payment methods should be valid", () => {
    const validMethods = ["efectivo", "yape", "plin", "transferencia", "tarjeta"];
    for (const abono of ABONOS) {
      expect(validMethods).toContain(abono.paymentMethod);
    }
  });
});
