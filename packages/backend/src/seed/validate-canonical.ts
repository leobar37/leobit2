import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  stats: ValidationStats;
}

export interface ValidationError {
  type: "missing_file" | "invalid_schema" | "duplicate_id" | "blocking_flag" | "invalid_json";
  file: string;
  message: string;
  details?: unknown;
}

export interface ValidationWarning {
  type: "non_blocking_flag" | "low_confidence" | "missing_date";
  file: string;
  message: string;
  details?: unknown;
}

export interface ValidationStats {
  totalExpected: number;
  totalFound: number;
  validFiles: number;
  invalidFiles: number;
  blockingIssues: number;
  nonBlockingIssues: number;
}

export interface CanonicalLine {
  lineIndex: number;
  rawLineText: string;
  lineType: string;
  reviewFlags?: string[];
  confidence?: number;
}

export interface CanonicalBlock {
  blockIndex: number;
  lines?: CanonicalLine[];
}

export interface CanonicalFile {
  imageId: string;
  imageFile: string;
  sourceDataset?: string;
  pass?: string;
  extractedAt?: string;
  schemaVersion?: string;
  detectedDates?: Array<{ normalizedDate?: string | null }>;
  blocks?: CanonicalBlock[];
}

export interface CanonicalManifest {
  manifestVersion: string;
  datasetName: string;
  totalPages: number;
  pages: Array<{
    canonicalId: string;
    sourceImageFile: string;
    pageNumber: number;
    expected: boolean;
  }>;
  reviewFlags: {
    blocking: string[];
    nonBlocking: string[];
  };
}

const BLOCKING_REVIEW_FLAGS = [
  "pass_amount_conflict",
  "multiple_totals_unclear",
  "customer_spelling_uncertain",
];

const NON_BLOCKING_REVIEW_FLAGS = [
  "marker_P_unclear",
  "marker_H_unclear",
  "abbreviation_unclear",
  "block_date_inherited",
  "line_absent_in_pass1",
  "line_absent_in_pass2",
  "actual_note_requires_review",
];

const REQUIRED_FIELDS = [
  "imageId",
  "imageFile",
  "detectedDates",
  "blocks",
];

function getCanonicalDirectory(): string {
  return fileURLToPath(
    new URL("../../../../data-avileo/extractions/JUAVIK/canonical/", import.meta.url)
  );
}

function getManifestPath(): string {
  return fileURLToPath(
    new URL("../../../../data-avileo/extractions/JUAVIK/canonical-manifest.json", import.meta.url)
  );
}

export function loadManifest(): CanonicalManifest | null {
  try {
    const manifestPath = getManifestPath();
    if (!existsSync(manifestPath)) {
      return null;
    }
    const content = readFileSync(manifestPath, "utf8");
    return JSON.parse(content) as CanonicalManifest;
  } catch {
    return null;
  }
}

export function loadCanonicalFile(filePath: string): CanonicalFile | null {
  try {
    const content = readFileSync(filePath, "utf8");
    return JSON.parse(content) as CanonicalFile;
  } catch {
    return null;
  }
}

export function validateSchema(fileName: string, data: CanonicalFile): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (!(field in data)) {
      errors.push({
        type: "invalid_schema",
        file: fileName,
        message: `Missing required field: ${field}`,
      });
    }
  }

  if (typeof data.imageId !== "string" || data.imageId.length === 0) {
    errors.push({
      type: "invalid_schema",
      file: fileName,
      message: "Invalid or missing imageId",
    });
  }

  if (typeof data.imageFile !== "string" || data.imageFile.length === 0) {
    errors.push({
      type: "invalid_schema",
      file: fileName,
      message: "Invalid or missing imageFile",
    });
  }

  if (!Array.isArray(data.detectedDates)) {
    errors.push({
      type: "invalid_schema",
      file: fileName,
      message: "detectedDates must be an array",
    });
  }

  if (!Array.isArray(data.blocks)) {
    errors.push({
      type: "invalid_schema",
      file: fileName,
      message: "blocks must be an array",
    });
  }

  return errors;
}

export function checkBlockingFlags(fileName: string, data: CanonicalFile): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const block of data.blocks ?? []) {
    for (const line of block.lines ?? []) {
      for (const flag of line.reviewFlags ?? []) {
        if (BLOCKING_REVIEW_FLAGS.includes(flag)) {
          errors.push({
            type: "blocking_flag",
            file: fileName,
            message: `Blocking review flag found: ${flag} (block ${block.blockIndex}, line ${line.lineIndex})`,
            details: {
              blockIndex: block.blockIndex,
              lineIndex: line.lineIndex,
              flag,
              rawLineText: line.rawLineText,
            },
          });
        }
      }
    }
  }

  return errors;
}

export function checkNonBlockingFlags(fileName: string, data: CanonicalFile): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  for (const block of data.blocks ?? []) {
    for (const line of block.lines ?? []) {
      for (const flag of line.reviewFlags ?? []) {
        if (NON_BLOCKING_REVIEW_FLAGS.includes(flag)) {
          warnings.push({
            type: "non_blocking_flag",
            file: fileName,
            message: `Non-blocking review flag: ${flag} (block ${block.blockIndex}, line ${line.lineIndex})`,
            details: {
              blockIndex: block.blockIndex,
              lineIndex: line.lineIndex,
              flag,
            },
          });
        }
      }
    }
  }

  return warnings;
}

export function validateCanonical(options?: {
  failOnBlocking?: boolean;
  includeWarnings?: boolean;
}): ValidationResult {
  const { failOnBlocking = true, includeWarnings = true } = options ?? {};

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const manifest = loadManifest();
  if (!manifest) {
    errors.push({
      type: "missing_file",
      file: "canonical-manifest.json",
      message: "Manifest file not found or invalid",
    });

    return {
      valid: false,
      errors,
      warnings,
      stats: {
        totalExpected: 100,
        totalFound: 0,
        validFiles: 0,
        invalidFiles: 0,
        blockingIssues: 0,
        nonBlockingIssues: 0,
      },
    };
  }

  const canonicalDir = getCanonicalDirectory();
  if (!existsSync(canonicalDir)) {
    errors.push({
      type: "missing_file",
      file: canonicalDir,
      message: "Canonical directory does not exist",
    });

    return {
      valid: false,
      errors,
      warnings,
      stats: {
        totalExpected: manifest.totalPages,
        totalFound: 0,
        validFiles: 0,
        invalidFiles: 0,
        blockingIssues: 0,
        nonBlockingIssues: 0,
      },
    };
  }

  const foundFiles = readdirSync(canonicalDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const foundIds = new Set<string>();
  const expectedIds = new Set(manifest.pages.map((p) => p.canonicalId));
  let validFiles = 0;
  let invalidFiles = 0;
  let blockingIssues = 0;
  let nonBlockingIssues = 0;

  for (const fileName of foundFiles) {
    const filePath = join(canonicalDir, fileName);
    const data = loadCanonicalFile(filePath);

    if (!data) {
      errors.push({
        type: "invalid_json",
        file: fileName,
        message: "Failed to parse JSON file",
      });
      invalidFiles++;
      continue;
    }

    const schemaErrors = validateSchema(fileName, data);
    errors.push(...schemaErrors);

    if (schemaErrors.length > 0) {
      invalidFiles++;
    }

    if (foundIds.has(data.imageId)) {
      errors.push({
        type: "duplicate_id",
        file: fileName,
        message: `Duplicate imageId: ${data.imageId}`,
      });
      invalidFiles++;
    } else {
      foundIds.add(data.imageId);
    }

    if (!expectedIds.has(data.imageId)) {
      errors.push({
        type: "invalid_schema",
        file: fileName,
        message: `Unexpected imageId not in manifest: ${data.imageId}`,
      });
      invalidFiles++;
    }

    const blockingFlags = checkBlockingFlags(fileName, data);
    if (failOnBlocking) {
      errors.push(...blockingFlags);
    }
    blockingIssues += blockingFlags.length;

    if (includeWarnings) {
      const nonBlocking = checkNonBlockingFlags(fileName, data);
      warnings.push(...nonBlocking);
      nonBlockingIssues += nonBlocking.length;
    }

    if (schemaErrors.length === 0 && !foundIds.has(data.imageId)) {
      validFiles++;
    }
  }

  for (const page of manifest.pages) {
    if (!foundIds.has(page.canonicalId)) {
      errors.push({
        type: "missing_file",
        file: `${page.canonicalId}.json`,
        message: `Expected canonical file not found for page ${page.pageNumber}`,
      });
    }
  }

  const hasBlockingErrors = errors.some(
    (e) => e.type === "blocking_flag" || e.type === "missing_file" || e.type === "duplicate_id"
  );

  return {
    valid: errors.length === 0 || (!failOnBlocking && !hasBlockingErrors),
    errors,
    warnings,
    stats: {
      totalExpected: manifest.totalPages,
      totalFound: foundFiles.length,
      validFiles,
      invalidFiles,
      blockingIssues,
      nonBlockingIssues,
    },
  };
}

export function formatValidationReport(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push("JUAVIK Canonical Validation Report");
  lines.push("=".repeat(60));
  lines.push("");

  lines.push(`Total Expected: ${result.stats.totalExpected}`);
  lines.push(`Total Found: ${result.stats.totalFound}`);
  lines.push(`Valid Files: ${result.stats.validFiles}`);
  lines.push(`Invalid Files: ${result.stats.invalidFiles}`);
  lines.push(`Blocking Issues: ${result.stats.blockingIssues}`);
  lines.push(`Non-Blocking Issues: ${result.stats.nonBlockingIssues}`);
  lines.push("");

  if (result.errors.length > 0) {
    lines.push("ERRORS:");
    lines.push("-".repeat(40));
    for (const error of result.errors) {
      lines.push(`[${error.type}] ${error.file}`);
      lines.push(`  ${error.message}`);
      if (error.details) {
        lines.push(`  Details: ${JSON.stringify(error.details)}`);
      }
      lines.push("");
    }
  }

  if (result.warnings.length > 0) {
    lines.push("WARNINGS:");
    lines.push("-".repeat(40));
    const limitedWarnings = result.warnings.slice(0, 20);
    for (const warning of limitedWarnings) {
      lines.push(`[${warning.type}] ${warning.file}`);
      lines.push(`  ${warning.message}`);
      lines.push("");
    }
    if (result.warnings.length > 20) {
      lines.push(`... and ${result.warnings.length - 20} more warnings`);
    }
  }

  lines.push("-".repeat(40));
  lines.push(`RESULT: ${result.valid ? "✓ PASSED" : "✗ FAILED"}`);
  lines.push("=".repeat(60));

  return lines.join("\n");
}

export function validateAndExit(options?: { failOnBlocking?: boolean }): never {
  const result = validateCanonical(options);
  console.log(formatValidationReport(result));

  if (!result.valid) {
    console.error("\n❌ Validation failed with errors.");
    process.exit(1);
  }

  console.log("\n✓ Validation passed.");
  process.exit(0);
}

if (import.meta.main) {
  const failOnBlocking = !process.argv.includes("--ignore-blocking");
  validateAndExit({ failOnBlocking });
}
