import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

type ProductType = "pollo" | "huevo" | "otro";
type ProductUnit = "kg" | "unidad";
type SaleType = "contado" | "credito";
type PaymentMethod = "efectivo" | "yape" | "plin" | "transferencia" | "tarjeta";

interface CanonicalDetectedDate {
  normalizedDate: string | null;
}

interface CanonicalItem {
  rawText?: string | null;
  normalizedProductCandidate?: string | null;
  quantityText?: string | null;
  unitPrice?: number | null;
  lineAmount?: number | null;
}

interface CanonicalEntry {
  entryType: string;
  amount?: number | null;
}

interface CanonicalLine {
  lineIndex: number;
  rawLineText: string;
  lineType: string;
  customer?: {
    rawName?: string | null;
    normalizedCandidate?: string | null;
  } | null;
  entries?: CanonicalEntry[];
  items?: CanonicalItem[];
  amounts?: {
    subtotal?: number | null;
    total?: number | null;
    amountPaid?: number | null;
    balanceDue?: number | null;
  } | null;
  payment?: {
    paymentStatus?: string | null;
    yapeoConfirmed?: boolean | null;
  } | null;
  markers?: {
    hasP?: boolean | null;
    hasNP?: boolean | null;
    hasYapeo?: boolean | null;
    hasXYapear?: boolean | null;
  } | null;
  reviewFlags?: string[];
}

interface CanonicalBlock {
  blockIndex: number;
  date?: {
    normalizedDate?: string | null;
    inheritedFromPreviousBlock?: boolean | null;
  } | null;
  lines?: CanonicalLine[];
}

interface CanonicalFile {
  imageId: string;
  imageFile: string;
  detectedDates?: CanonicalDetectedDate[];
  blocks?: CanonicalBlock[];
}

export interface Client2VariantSeed {
  key: string;
  name: string;
  sku: string;
  unitQuantity: number;
  price: number;
  initialInventory: number;
}

export interface Client2ProductSeed {
  key: string;
  name: string;
  type: ProductType;
  unit: ProductUnit;
  basePrice: string;
  isActive: boolean;
  variants: Client2VariantSeed[];
}

export interface Client2CustomerSeed {
  key: string;
  name: string;
  dni: string | null;
  phone: string | null;
  address: string | null;
  notes: string;
}

export interface Client2SaleSeed {
  sourceRef: string;
  customerKey: string;
  saleDate: string;
  saleType: SaleType;
  totalAmount: number;
  amountPaid: number;
  paymentStatus: string;
  reviewFlags: string[];
  rawLineText: string;
  items: Array<{
    productKey: string;
    variantKey: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export interface Client2AbonoSeed {
  sourceRef: string;
  relatedSaleSourceRef: string;
  customerKey: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes: string;
}

export const CLIENT2_USER = {
  email: "juavik@gmail.com",
  password: "Prueba@123",
  name: "JUAVIK",
};

export const CLIENT2_BUSINESS = {
  name: "JUAVIK",
  ruc: "20600000002",
  address: "Datos importados desde cuaderno JUAVIK",
  phone: "999999999",
  email: "juavik@gmail.com",
  modoOperacion: "inventario_propio" as const,
  controlKilos: true,
  usarDistribucion: false,
  permitirVentaSinStock: false,
};

interface ProductAccumulator {
  key: string;
  name: string;
  type: ProductType;
  unit: ProductUnit;
  priceVariants: Set<number>;
  needsVariableVariant: boolean;
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function round3(value: number) {
  return Number(value.toFixed(3));
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function toSeedKey(value: string) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "sin-clave";
}

function formatPrice(value: number) {
  return value.toFixed(2);
}

function priceKey(value: number) {
  return `price-${formatPrice(value)}`;
}

function makeVariantSku(productKey: string, variantKey: string) {
  const normalized = `${productKey}-${variantKey}`.replace(/[^a-z0-9-]/gi, "-");
  return normalized.toUpperCase().slice(0, 50);
}

function normalizeCustomerName(rawName: string | null | undefined, fileNumber: number, lineIndex: number) {
  const cleaned = (rawName ?? "")
    .replace(/[?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return `Cliente no identificado ${String(fileNumber).padStart(3, "0")}-${String(lineIndex).padStart(2, "0")}`;
  }

  if (cleaned.length < 2) {
    return `Cliente ${cleaned.toUpperCase()}`;
  }

  return titleCase(cleaned);
}

interface ProductResolution {
  key: string;
  name: string;
  type: ProductType;
  unit: ProductUnit;
  fraction?: number; // For chicken fractions: 0.5, 0.33, 0.25, 0.2
}

function detectFraction(rawText: string | null | undefined): number | null {
  if (!rawText) return null;
  
  const text = rawText.toLowerCase();
  
  // Check for explicit fractions
  if (text.includes("1/2") || text.includes("medio")) return 0.5;
  if (text.includes("1/3")) return 0.333;
  if (text.includes("1/4") || text.includes("cuarto")) return 0.25;
  if (text.includes("1/5")) return 0.2;
  
  // Check for patterns like "8 1/2" which means 8.5
  const mixedMatch = text.match(/(\d+)\s+1\/2/);
  if (mixedMatch) {
    return parseInt(mixedMatch[1]) + 0.5;
  }
  
  return null;
}

function resolveProductSeed(item: CanonicalItem | undefined): ProductResolution {
  const candidate = (item?.normalizedProductCandidate ?? "").toLowerCase();
  const rawText = (item?.rawText ?? "").toLowerCase();
  
  // Detect fraction from raw text
  const fraction = detectFraction(item?.rawText);

  // Fractional pollo variants all redirect to plain "Pollo" with kilo
  if (
    candidate.includes("1/2 pollo") ||
    candidate.includes("1/3 pollo") ||
    candidate.includes("1/4 pollo") ||
    candidate.includes("1/5 pollo") ||
    rawText.includes("1/2") ||
    rawText.includes("1/3") ||
    rawText.includes("1/4") ||
    rawText.includes("1/5")
  ) {
    return { 
      key: "pollo", 
      name: "Pollo", 
      type: "pollo" as const, 
      unit: "kg" as const,
      fraction: fraction || 0.5 // Default to 0.5 if we can't detect
    };
  }

  if (
    candidate.includes("huevo") ||
    candidate === "h" ||
    candidate === "huevos" ||
    candidate === "pollo h" ||
    rawText.startsWith("h") ||
    rawText.includes(" h=")
  ) {
    return { key: "huevo", name: "Huevo", type: "huevo" as const, unit: "unidad" as const };
  }

  // Plain pollo (no fraction) - check for fraction in raw text anyway
  if (!candidate || candidate === "pollo" || candidate.startsWith("x")) {
    return { 
      key: "pollo", 
      name: "Pollo", 
      type: "pollo" as const, 
      unit: "kg" as const,
      fraction: fraction || undefined
    };
  }

  // All other products (Chancho, Arroz, Criolla, etc.) - keep them as-is
  const normalizedName = titleCase(candidate);
  const isUnitProduct = candidate.includes("huevo") || candidate.includes("1/");

  return {
    key: toSeedKey(normalizedName),
    name: normalizedName,
    type: candidate.includes("huevo") ? ("huevo" as const) : ("otro" as const),
    unit: isUnitProduct ? ("unidad" as const) : ("kg" as const),
  };
}

function normalizePaymentStatus(line: CanonicalLine, totalAmount: number) {
  const rawStatus = line.payment?.paymentStatus ?? "unknown";

  if (rawStatus === "partial") {
    return "partially_paid";
  }

  if (rawStatus === "no_payment") {
    return "unpaid";
  }

  if (rawStatus === "pending") {
    return "pending_yape";
  }

  if (rawStatus !== "unknown") {
    return rawStatus;
  }

  if (line.markers?.hasYapeo) {
    return "paid";
  }

  if (line.markers?.hasXYapear) {
    return "pending_yape";
  }

  if (line.markers?.hasNP) {
    return "no_pago";
  }

  if (line.markers?.hasP) {
    return "paid";
  }

  if (typeof line.amounts?.amountPaid === "number" && line.amounts.amountPaid > 0) {
    return line.amounts.amountPaid >= totalAmount ? "paid" : "partially_paid";
  }

  return "unpaid";
}

function resolveSaleAmount(line: CanonicalLine) {
  if (typeof line.amounts?.total === "number" && line.amounts.total > 0) {
    return round2(line.amounts.total);
  }

  if (typeof line.amounts?.subtotal === "number" && line.amounts.subtotal > 0) {
    return round2(line.amounts.subtotal);
  }

  const saleEntries = (line.entries ?? []).filter(
    (entry) => ["sale", "product_fragment"].includes(entry.entryType) && typeof entry.amount === "number"
  );

  if (saleEntries.length === 0) {
    return null;
  }

  return round2(saleEntries.reduce((sum, entry) => sum + (entry.amount ?? 0), 0));
}

function getCanonicalDirectory() {
  return fileURLToPath(new URL("../../../../data-avileo/extractions/JUAVIK/canonical/", import.meta.url));
}

function loadCanonicalFiles() {
  const canonicalDir = getCanonicalDirectory();

  return readdirSync(canonicalDir)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => {
      const leftNumber = Number(left.match(/(\d+)/)?.[1] ?? 0);
      const rightNumber = Number(right.match(/(\d+)/)?.[1] ?? 0);
      return leftNumber - rightNumber;
    })
    .map((fileName) => {
      const fullPath = `${canonicalDir}${fileName}`;
      const content = readFileSync(fullPath, "utf8");
      return {
        fileName,
        fileNumber: Number(fileName.match(/(\d+)/)?.[1] ?? 0),
        data: JSON.parse(content) as CanonicalFile,
      };
    });
}

function deriveClient2Data() {
  const canonicalFiles = loadCanonicalFiles();
  const productMap = new Map<string, ProductAccumulator>();
  const customerMap = new Map<string, Client2CustomerSeed>();
  const sales: Client2SaleSeed[] = [];
  const abonos: Client2AbonoSeed[] = [];

  let lastKnownDate: string | null = null;

  for (const canonicalFile of canonicalFiles) {
    const detectedDate = canonicalFile.data.detectedDates?.find((entry) => entry.normalizedDate)?.normalizedDate ?? null;

    for (const block of canonicalFile.data.blocks ?? []) {
      const inheritedDate = block.date?.inheritedFromPreviousBlock ? lastKnownDate : null;
      const blockDate: string = block.date?.normalizedDate ?? inheritedDate ?? detectedDate ?? lastKnownDate ?? "2026-01-01";

      lastKnownDate = blockDate;

      for (const line of block.lines ?? []) {
        const rawCustomerName = line.customer?.normalizedCandidate ?? line.customer?.rawName;
        const customerName = normalizeCustomerName(rawCustomerName, canonicalFile.fileNumber, line.lineIndex);
        const customerKey = toSeedKey(customerName);

        if (!customerMap.has(customerKey)) {
          customerMap.set(customerKey, {
            key: customerKey,
            name: customerName,
            dni: null,
            phone: null,
            address: null,
            notes: `Importado desde ${canonicalFile.data.imageId}`,
          });
        }

        if (!["single_entry_line", "multi_entry_line"].includes(line.lineType)) {
          continue;
        }

        const totalAmount = resolveSaleAmount(line);
        if (totalAmount === null || totalAmount <= 0) {
          continue;
        }

        const paymentStatus = normalizePaymentStatus(line, totalAmount);
        const yapeConfirmed = Boolean(line.payment?.yapeoConfirmed || line.markers?.hasYapeo);
        const explicitAmountPaid = typeof line.amounts?.amountPaid === "number" ? round2(line.amounts.amountPaid) : null;
        const shouldCreateAbono = yapeConfirmed || paymentStatus === "partially_paid";
        const saleType: SaleType = paymentStatus === "paid" && !shouldCreateAbono ? "contado" : "credito";
        const amountPaid = saleType === "contado" ? totalAmount : 0;

        const primaryItem = (line.items ?? []).find(
          (item) => typeof item.lineAmount === "number" || typeof item.unitPrice === "number"
        ) ?? line.items?.[0];

        const resolvedProduct = resolveProductSeed(primaryItem);
        const accumulator = productMap.get(resolvedProduct.key) ?? {
          ...resolvedProduct,
          priceVariants: new Set<number>(),
          needsVariableVariant: false,
        };

        // Pollo uses "kilo" variant; other products use price-based variants
        let variantKey: string;
        let unitPrice: number;
        let quantity: number;

        // Special handling for Pollo: use fraction as kilo quantity if available
        if (resolvedProduct.key === "pollo" && resolvedProduct.fraction) {
          // Fraction detected (1/2, 1/3, 1/4, 1/5, or mixed like "8 1/2")
          quantity = round3(resolvedProduct.fraction);
          unitPrice = round2(totalAmount / quantity);
          variantKey = "kilo";
        } else if (typeof primaryItem?.unitPrice === "number" && primaryItem.unitPrice > 0) {
          unitPrice = round2(primaryItem.unitPrice);
          quantity = round3(totalAmount / unitPrice);
          accumulator.priceVariants.add(unitPrice);
          
          // For Pollo, always use "kilo" variant. For others, use price-based key
          variantKey = resolvedProduct.key === "pollo" ? "kilo" : priceKey(unitPrice);
        } else {
          unitPrice = round2(totalAmount);
          quantity = 1;
          accumulator.needsVariableVariant = true;
          variantKey = resolvedProduct.key === "pollo" ? "kilo" : "variable";
        }

        productMap.set(resolvedProduct.key, accumulator);

        const sourceRef = `${canonicalFile.data.imageId}#${block.blockIndex}-${line.lineIndex}`;

        sales.push({
          sourceRef,
          customerKey,
          saleDate: blockDate,
          saleType,
          totalAmount,
          amountPaid,
          paymentStatus,
          reviewFlags: [...(line.reviewFlags ?? [])],
          rawLineText: line.rawLineText,
          items: [
            {
              productKey: resolvedProduct.key,
              variantKey,
              quantity,
              unitPrice: round2(unitPrice),
              subtotal: totalAmount,
            },
          ],
        });

        if (shouldCreateAbono) {
          const abonoAmount = explicitAmountPaid && explicitAmountPaid > 0 ? explicitAmountPaid : yapeConfirmed ? totalAmount : null;

          if (abonoAmount && abonoAmount > 0) {
            abonos.push({
              sourceRef: `${sourceRef}:abono`,
              relatedSaleSourceRef: sourceRef,
              customerKey,
              paymentDate: blockDate,
              amount: abonoAmount,
              paymentMethod: yapeConfirmed ? "yape" : "efectivo",
              notes: `Pago importado desde ${sourceRef}`,
            });
          }
        }
      }
    }
  }

  const products: Client2ProductSeed[] = [...productMap.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((product) => {
      // Pollo: Force ONLY one variant "kilo" - ignore all price variants
      if (product.key === "pollo") {
        return {
          key: "pollo",
          name: "Pollo",
          type: "pollo" as const,
          unit: "kg" as const,
          basePrice: "25.00",
          isActive: true,
          variants: [
            {
              key: "kilo",
              name: "kilo",
              sku: "POLLO-KG",
              unitQuantity: 1,
              price: 25.0,
              initialInventory: 1000,
            },
          ],
        };
      }

      // Other products: Generate variants dynamically from prices seen in data
      const sortedPrices = [...product.priceVariants].sort((left, right) => left - right);
      const variants: Client2VariantSeed[] = sortedPrices.map((price) => ({
        key: priceKey(price),
        name: `S/ ${formatPrice(price)}`,
        sku: makeVariantSku(product.key, priceKey(price)),
        unitQuantity: 1,
        price,
        initialInventory: 100,
      }));

      if (product.needsVariableVariant) {
        variants.push({
          key: "variable",
          name: "Monto variable",
          sku: makeVariantSku(product.key, "variable"),
          unitQuantity: 1,
          price: sortedPrices[0] ?? 0,
          initialInventory: 100,
        });
      }

      return {
        key: product.key,
        name: product.name,
        type: product.type,
        unit: product.unit,
        basePrice: formatPrice(sortedPrices[0] ?? 0),
        isActive: true,
        variants,
      };
    });

  const customers = [...customerMap.values()].sort((left, right) => left.name.localeCompare(right.name));

  sales.sort((left, right) => {
    return (
      left.saleDate.localeCompare(right.saleDate) ||
      left.sourceRef.localeCompare(right.sourceRef)
    );
  });

  abonos.sort((left, right) => {
    return (
      left.paymentDate.localeCompare(right.paymentDate) ||
      left.sourceRef.localeCompare(right.sourceRef)
    );
  });

  return {
    products,
    customers,
    sales,
    abonos,
    metadata: {
      canonicalFileCount: canonicalFiles.length,
      productCount: products.length,
      variantCount: products.reduce((sum, product) => sum + product.variants.length, 0),
      customerCount: customers.length,
      saleCount: sales.length,
      abonoCount: abonos.length,
      canonicalDirectory: getCanonicalDirectory(),
    },
  };
}

const CLIENT2_DATASET = deriveClient2Data();

export const PRODUCTS = CLIENT2_DATASET.products;
export const CUSTOMERS = CLIENT2_DATASET.customers;
export const SALES = CLIENT2_DATASET.sales;
export const ABONOS = CLIENT2_DATASET.abonos;
export const CLIENT2_METADATA = CLIENT2_DATASET.metadata;
