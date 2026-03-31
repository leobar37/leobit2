/**
 * Client2 (JUAVIK) Normalization Maps
 *
 * This module provides explicit, deterministic mappings for normalizing
 * canonical notebook data into seed-ready business entities.
 *
 * Design principles:
 * - No fuzzy matching - all aliases must be explicitly declared
 * - All heuristics are documented and test-covered
 * - Unresolved identity collisions are treated as blocking errors
 */

export interface CustomerAliasMapping {
  /** The normalized canonical name */
  canonicalName: string;
  /** All recognized variations of this customer's name in the notebook */
  aliases: string[];
  /** The seed key used for database storage */
  seedKey: string;
}

export interface ProductResolutionRule {
  /** The normalized product key */
  productKey: string;
  /** The display name for the product */
  displayName: string;
  /** Product type classification */
  type: "pollo" | "huevo" | "otro";
  /** Unit of measurement */
  unit: "kg" | "unidad";
  /**
   * Match function to determine if a canonical item maps to this product.
   * Must be deterministic and based only on explicit patterns.
   */
  match: (params: {
    normalizedProductCandidate: string | null | undefined;
    rawText: string | null | undefined;
  }) => boolean;
}

export interface PaymentMarkerInterpretation {
  /** The marker symbol(s) as found in the notebook */
  marker: string;
  /** Human-readable description */
  description: string;
  /** The resulting payment status */
  paymentStatus:
    | "paid"
    | "unpaid"
    | "partially_paid"
    | "pending_yape"
    | "no_pago";
  /** The payment method if applicable */
  paymentMethod?: "efectivo" | "yape" | "plin" | "transferencia" | "tarjeta";
  /** Priority for resolution (higher = checked first) */
  priority: number;
}

export interface DateParsingRule {
  /** Pattern description */
  description: string;
  /** Examples of matching date formats */
  examples: string[];
  /** Normalization logic for dates */
  normalize: (rawDate: string | null | undefined) => string | null;
}

export interface CarryOverSemantics {
  /** Description of what constitutes a carry-over entry */
  description: string;
  /** How to identify carry-over entries */
  identification: {
    fromMarkers: string[];
    fromPaymentFlags: string[];
    fromLineType: string[];
  };
  /** How carry-over balances are treated in the seed */
  treatment: "create_abono" | "add_to_balance" | "ignore" | "block";
}

// ============================================================================
// CUSTOMER ALIAS MAPPINGS
// ============================================================================

/**
 * Known customer aliases from the JUAVIK notebook.
 * These represent the same customer appearing with different spellings.
 *
 * NOTES:
 * - Names are title-cased after alias matching
 * - Unknown spellings create new customers with review flags
 * - Collisions without a declared mapping are blocking errors
 */
export const CUSTOMER_ALIAS_MAPPINGS: CustomerAliasMapping[] = [
  {
    canonicalName: "Pancho",
    aliases: ["Pancho", "pancho", "PANCHO"],
    seedKey: "pancho",
  },
  {
    canonicalName: "Arteaga",
    aliases: ["Arteaga", "arteaga", "ARTEAGA"],
    seedKey: "arteaga",
  },
  {
    canonicalName: "Chino",
    aliases: ["Chino", "chino", "CHINO"],
    seedKey: "chino",
  },
  {
    canonicalName: "Blady",
    aliases: ["Blady", "blady", "BLADY", "Glady", "glady", "GLADY"],
    seedKey: "blady",
  },
  {
    canonicalName: "Fernetina",
    aliases: ["Fernetina", "fernetina", "FERNETINA"],
    seedKey: "fernetina",
  },
  {
    canonicalName: "Julia",
    aliases: ["Julia", "julia", "JULIA"],
    seedKey: "julia",
  },
  {
    canonicalName: "Violeta R",
    aliases: ["Violeta R", "violeta r", "VIOLETA R", "Violeta", "violeta", "VIOLETA"],
    seedKey: "violeta-r",
  },
  {
    canonicalName: "Bodega M",
    aliases: ["Bodega M", "bodega m", "BODEGA M", "Bodega", "bodega"],
    seedKey: "bodega-m",
  },
  {
    canonicalName: "Manuela Sala",
    aliases: ["Manuela sala", "Manuela Sala", "manuela sala", "MANUELA SALA", "Manuela", "manuela"],
    seedKey: "manuela-sala",
  },
  {
    canonicalName: "Rosa Cois",
    aliases: ["Rosa Cois", "Rosa Coisi", "rosa cois", "ROSA COIS"],
    seedKey: "rosa-cois",
  },
  {
    canonicalName: "Dindiferi",
    aliases: ["Dindiferi", "dindiferi", "DINDIFERI"],
    seedKey: "dindiferi",
  },
  {
    canonicalName: "Pedro Piña",
    aliases: ["Pedro Piña", "pedro piña", "PEDRO PIÑA", "Pedro Pina", "pedro pina"],
    seedKey: "pedro-pina",
  },
  {
    canonicalName: "Nelda",
    aliases: ["Nelda", "nelda", "NELDA"],
    seedKey: "nelda",
  },
  {
    canonicalName: "Ileana",
    aliases: ["Ileana", "ileana", "ILEANA"],
    seedKey: "ileana",
  },
  {
    canonicalName: "Fernandez",
    aliases: ["Fernandez", "fernandez", "FERNANDEZ", "Fernández", "fernández"],
    seedKey: "fernandez",
  },
  {
    canonicalName: "Zegarra",
    aliases: ["Zegarra", "zegarra", "ZEGARRA"],
    seedKey: "zegarra",
  },
];

/**
 * Build a lookup map from alias to canonical mapping.
 * Used for O(1) alias resolution.
 */
export function buildCustomerAliasMap(): Map<string, CustomerAliasMapping> {
  const map = new Map<string, CustomerAliasMapping>();
  const seenAliases = new Set<string>();

  for (const mapping of CUSTOMER_ALIAS_MAPPINGS) {
    for (const alias of mapping.aliases) {
      const normalizedAlias = alias.toLowerCase().trim();

      // Skip if we've already seen this normalized alias in a previous mapping
      if (seenAliases.has(normalizedAlias)) {
        const existingMapping = map.get(normalizedAlias);
        // Only throw if it's a real collision (different canonical names)
        if (existingMapping && existingMapping.seedKey !== mapping.seedKey) {
          throw new Error(
            `Customer alias collision: "${normalizedAlias}" maps to both ` +
              `"${existingMapping.canonicalName}" and "${mapping.canonicalName}". ` +
              `Resolve this collision in CUSTOMER_ALIAS_MAPPINGS.`
          );
        }
        // Same mapping, skip duplicate
        continue;
      }

      seenAliases.add(normalizedAlias);
      map.set(normalizedAlias, mapping);
    }
  }
  return map;
}

// Global alias map for runtime lookups
const CUSTOMER_ALIAS_MAP = buildCustomerAliasMap();

/**
 * Resolve a raw customer name to its canonical mapping.
 * Returns null if no mapping exists (caller should treat as new customer).
 */
export function resolveCustomerAlias(
  rawName: string | null | undefined
): CustomerAliasMapping | null {
  if (!rawName) return null;
  const normalized = rawName.toLowerCase().trim().replace(/[?]+$/g, "");
  return CUSTOMER_ALIAS_MAP.get(normalized) ?? null;
}

// ============================================================================
// PRODUCT RESOLUTION RULES
// ============================================================================

/**
 * Product resolution rules for identifying products from canonical text.
 *
 * ORDER MATTERS: Rules are checked in order, first match wins.
 * This allows more specific patterns (like "1/2 pollo") to match before
 * general patterns (like "pollo").
 */
export const PRODUCT_RESOLUTION_RULES: ProductResolutionRule[] = [
  {
    productKey: "medio-pollo",
    displayName: "1/2 Pollo",
    type: "pollo",
    unit: "unidad",
    match: ({ normalizedProductCandidate, rawText }) => {
      const candidate = (normalizedProductCandidate ?? "").toLowerCase();
      const raw = (rawText ?? "").toLowerCase();
      return candidate.includes("1/2 pollo") || raw.includes("1/2");
    },
  },
  {
    productKey: "tercio-pollo",
    displayName: "1/3 Pollo",
    type: "pollo",
    unit: "unidad",
    match: ({ normalizedProductCandidate, rawText }) => {
      const candidate = (normalizedProductCandidate ?? "").toLowerCase();
      const raw = (rawText ?? "").toLowerCase();
      return candidate.includes("1/3 pollo") || raw.includes("1/3");
    },
  },
  {
    productKey: "cuarto-pollo",
    displayName: "1/4 Pollo",
    type: "pollo",
    unit: "unidad",
    match: ({ normalizedProductCandidate, rawText }) => {
      const candidate = (normalizedProductCandidate ?? "").toLowerCase();
      const raw = (rawText ?? "").toLowerCase();
      return candidate.includes("1/4 pollo") || raw.includes("1/4");
    },
  },
  {
    productKey: "quinto-pollo",
    displayName: "1/5 Pollo",
    type: "pollo",
    unit: "unidad",
    match: ({ normalizedProductCandidate, rawText }) => {
      const candidate = (normalizedProductCandidate ?? "").toLowerCase();
      const raw = (rawText ?? "").toLowerCase();
      return candidate.includes("1/5 pollo") || raw.includes("1/5");
    },
  },
  {
    productKey: "huevo",
    displayName: "Huevo",
    type: "huevo",
    unit: "unidad",
    match: ({ normalizedProductCandidate, rawText }) => {
      const candidate = (normalizedProductCandidate ?? "").toLowerCase();
      const raw = (rawText ?? "").toLowerCase();
      return (
        candidate.includes("huevo") ||
        candidate === "h" ||
        candidate === "huevos" ||
        candidate === "pollo h" ||
        raw.startsWith("h") ||
        raw.includes(" h=")
      );
    },
  },
  {
    productKey: "pollo",
    displayName: "Pollo",
    type: "pollo",
    unit: "kg",
    match: ({ normalizedProductCandidate, rawText }) => {
      const candidate = (normalizedProductCandidate ?? "").toLowerCase();
      const raw = (rawText ?? "").toLowerCase();
      // Default to pollo if no specific match and raw text looks like a sale
      return !candidate || candidate === "pollo" || candidate.startsWith("x") || raw.match(/^x\d/) !== null;
    },
  },
];

/**
 * Resolve canonical item text to a product rule.
 * Returns the matching rule or null if no match.
 */
export function resolveProductRule(params: {
  normalizedProductCandidate: string | null | undefined;
  rawText: string | null | undefined;
}): ProductResolutionRule | null {
  for (const rule of PRODUCT_RESOLUTION_RULES) {
    if (rule.match(params)) {
      return rule;
    }
  }
  return null;
}

// ============================================================================
// PAYMENT MARKER INTERPRETATIONS
// ============================================================================

/**
 * Payment marker interpretations from notebook conventions.
 *
 * PRIORITY: Higher priority markers are checked first.
 * Example: "Yapeo" (priority 10) is checked before "P" (priority 5)
 */
export const PAYMENT_MARKER_INTERPRETATIONS: PaymentMarkerInterpretation[] = [
  {
    marker: "Yapeo",
    description: "Yape payment confirmed",
    paymentStatus: "paid",
    paymentMethod: "yape",
    priority: 20,
  },
  {
    marker: "XYapear",
    description: "Pending Yape payment (needs to Yape)",
    paymentStatus: "pending_yape",
    paymentMethod: "yape",
    priority: 19,
  },
  {
    marker: "xapo",
    description: "Abbreviated pending Yape",
    paymentStatus: "pending_yape",
    paymentMethod: "yape",
    priority: 18,
  },
  {
    marker: "X Yapear",
    description: "Pending Yape payment (alternative spelling)",
    paymentStatus: "pending_yape",
    paymentMethod: "yape",
    priority: 17,
  },
  {
    marker: "NP",
    description: "No payment (No Pago)",
    paymentStatus: "no_pago",
    priority: 15,
  },
  {
    marker: "P",
    description: "Payment confirmed (generic)",
    paymentStatus: "paid",
    paymentMethod: "efectivo",
    priority: 10,
  },
];

/**
 * Interpret payment markers from a canonical line.
 * Returns the highest priority interpretation or null.
 */
export function interpretPaymentMarkers(params: {
  markers?: {
    hasP?: boolean | null;
    hasNP?: boolean | null;
    hasYapeo?: boolean | null;
    hasXYapear?: boolean | null;
  } | null;
  rawLineText?: string | null;
}): PaymentMarkerInterpretation | null {
  const interpretations: PaymentMarkerInterpretation[] = [];
  const markers = params.markers ?? {};
  const rawText = (params.rawLineText ?? "").toLowerCase();

  if (markers.hasYapeo) {
    interpretations.push(
      PAYMENT_MARKER_INTERPRETATIONS.find((p) => p.marker === "Yapeo")!
    );
  }
  if (markers.hasXYapear || rawText.includes("xapo")) {
    interpretations.push(
      PAYMENT_MARKER_INTERPRETATIONS.find((p) => p.marker === "XYapear")!
    );
  }
  if (markers.hasNP) {
    interpretations.push(
      PAYMENT_MARKER_INTERPRETATIONS.find((p) => p.marker === "NP")!
    );
  }
  if (markers.hasP && !markers.hasNP) {
    interpretations.push(
      PAYMENT_MARKER_INTERPRETATIONS.find((p) => p.marker === "P")!
    );
  }

  if (interpretations.length === 0) {
    return null;
  }

  // Return highest priority interpretation
  return interpretations.reduce((highest, current) =>
    current.priority > highest.priority ? current : highest
  );
}

// ============================================================================
// DATE PARSING RULES
// ============================================================================

/**
 * Date parsing rules for the JUAVIK notebook date format.
 *
 * The notebook uses Peruvian date conventions:
 * - "Sábado 7-2-26" → 2026-02-07
 * - "Martes 10-2-26" → 2026-02-10
 *
 * Year handling: Two-digit years are assumed to be 20XX.
 */
export const DATE_PARSING_RULES: DateParsingRule[] = [
  {
    description: "ISO date format (already normalized) - check first to avoid misinterpreting years",
    examples: ["2026-02-07", "2026-02-10"],
    normalize: (rawDate) => {
      if (!rawDate) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        return rawDate;
      }
      return null;
    },
  },
  {
    description: "Standard notebook format with day name",
    examples: ["Sábado 7-2-26", "Martes 10-2-26"],
    normalize: (rawDate) => {
      if (!rawDate) return null;
      const match = rawDate.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
      if (!match) return null;

      const [, day, month, yearShort] = match;
      const fullYear = yearShort.length === 2 ? `20${yearShort}` : yearShort;

      const paddedDay = day.padStart(2, "0");
      const paddedMonth = month.padStart(2, "0");

      return `${fullYear}-${paddedMonth}-${paddedDay}`;
    },
  },
  {
    description: "Date only format",
    examples: ["7-2-26", "10/2/26"],
    normalize: (rawDate) => {
      if (!rawDate) return null;
      const match = rawDate.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
      if (!match) return null;

      const [, day, month, yearShort] = match;
      const fullYear = yearShort.length === 2 ? `20${yearShort}` : yearShort;

      const paddedDay = day.padStart(2, "0");
      const paddedMonth = month.padStart(2, "0");

      return `${fullYear}-${paddedMonth}-${paddedDay}`;
    },
  },
];

/**
 * Normalize a raw date string to ISO format (YYYY-MM-DD).
 * Returns null if the date cannot be parsed.
 */
export function normalizeDate(rawDate: string | null | undefined): string | null {
  if (!rawDate) return null;

  for (const rule of DATE_PARSING_RULES) {
    const normalized = rule.normalize(rawDate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

// ============================================================================
// CARRY-OVER BALANCE SEMANTICS
// ============================================================================

/**
 * Carry-over balance semantics for the JUAVIK notebook.
 *
 * Carry-over entries represent:
 * 1. Previous balance brought forward ("Actual 88.2")
 * 2. Outstanding debts from prior days
 * 3. Multi-day transactions
 *
 * TREATMENT: By default, carry-over amounts are treated as balance references
 * and are NOT seeded as new sales. They inform the customer's balance
 * but don't create duplicate transactions.
 */
export const CARRY_OVER_SEMANTICS: CarryOverSemantics = {
  description:
    "Carry-over entries represent balances brought forward from previous days. " +
    "These are typically marked with 'Actual' notes or appear in inherited-date blocks.",
  identification: {
    fromMarkers: ["Actual"],
    fromPaymentFlags: ["carryOverFromPrevious"],
    fromLineType: ["balance_reference"],
  },
  treatment: "add_to_balance",
};

/**
 * Check if a line represents a carry-over entry.
 */
export function isCarryOverEntry(params: {
  lineType?: string;
  payment?: {
    carryOverFromPrevious?: boolean | null;
  } | null;
  rawLineText?: string;
  blockDate?: {
    inheritedFromPreviousBlock?: boolean | null;
  } | null;
}): boolean {
  // Check for balance reference line type
  if (params.lineType === "balance_reference") {
    return true;
  }

  // Check for carry-over flag
  if (params.payment?.carryOverFromPrevious) {
    return true;
  }

  // Check for "Actual" note in raw text
  if (params.rawLineText?.toLowerCase().includes("actual")) {
    return true;
  }

  // Check for inherited date block
  if (params.blockDate?.inheritedFromPreviousBlock) {
    // Additional heuristics could go here
    return false; // Not all inherited date entries are carry-over
  }

  return false;
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

/**
 * Summary of all normalization maps for verification.
 */
export const NORMALIZATION_SUMMARY = {
  customerAliases: CUSTOMER_ALIAS_MAPPINGS.length,
  productRules: PRODUCT_RESOLUTION_RULES.length,
  paymentMarkers: PAYMENT_MARKER_INTERPRETATIONS.length,
  dateRules: DATE_PARSING_RULES.length,
  carryOverTreatment: CARRY_OVER_SEMANTICS.treatment,
} as const;
