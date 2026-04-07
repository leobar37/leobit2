/**
 * Pre-login validators
 * 
 * Validates local storage state before login to detect:
 * - Corrupt sync cursors
 * - Invalid schema versions
 * - Orphaned storage keys
 * - Inconsistent sync state
 * - Old/stale data (no sync in 30 days)
 * - PGlite schema mismatch
 */

import { getLocalDatabaseName, getPullCursorStorageKey } from "~/lib/session-storage";

export interface ValidationIssue {
  type: "cursor" | "schema" | "storage" | "sync" | "data";
  severity: "warning" | "critical";
  message: string;
  details?: string;
}

export interface ValidationResult {
  healthy: boolean;
  issues: ValidationIssue[];
  canRepair: boolean;
}

/**
 * Validate sync cursor format
 * Cursors should be ISO timestamps or timestamp_opId format
 */
function validateCursors(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (typeof window === "undefined" || !localStorage) {
    return issues;
  }

  const cursorKeys: string[] = [];
  
  // Find all cursor keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("avileo_pull_cursor")) {
      cursorKeys.push(key);
    }
  }

  for (const key of cursorKeys) {
    const value = localStorage.getItem(key);
    
    if (!value) {
      issues.push({
        type: "cursor",
        severity: "warning",
        message: `Cursor vacío encontrado: ${key}`,
        details: "El cursor existe pero no tiene valor",
      });
      continue;
    }

    // Check valid cursor formats
    // Format 1: ISO 8601 timestamp (e.g., "2026-03-07T18:07:41.784Z")
    // Format 2: timestamp_opId (e.g., "2026-03-07T18:07:41.784Z_op-123")
    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z/;
    const legacyPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z/; // Older format
    
    if (!isoPattern.test(value) && !legacyPattern.test(value)) {
      // Check if it's a cursor with _op suffix
      const parts = value.split("_op-");
      if (parts.length > 1) {
        const timestamp = parts[0];
        if (!isoPattern.test(timestamp) && !legacyPattern.test(timestamp)) {
          issues.push({
            type: "cursor",
            severity: "critical",
            message: `Cursor corrupto: ${key}`,
            details: `El cursor tiene formato inválido: ${value.substring(0, 50)}...`,
          });
        }
      } else {
        issues.push({
          type: "cursor",
          severity: "critical",
          message: `Cursor corrupto: ${key}`,
          details: `El cursor tiene formato inválido: ${value.substring(0, 50)}...`,
        });
      }
    }

    // Check for future timestamps (cursor in the future = likely corrupt)
    try {
      const timestamp = value.split("_op-")[0];
      const cursorDate = new Date(timestamp);
      const now = new Date();
      if (cursorDate > now) {
        issues.push({
          type: "cursor",
          severity: "critical",
          message: `Cursor del futuro detectado: ${key}`,
          details: `El cursor (${cursorDate.toISOString()}) está en el futuro`,
        });
      }
    } catch {
      // Invalid date format - already caught above
    }
  }

  // Check for old/stale data (no sync in 30 days)
  const STALE_THRESHOLD_DAYS = 30;
  let mostRecentCursor: Date | null = null;

  for (const key of cursorKeys) {
    const value = localStorage.getItem(key);
    if (!value) continue;

    try {
      const timestamp = value.split("_op-")[0];
      const cursorDate = new Date(timestamp);
      if (!isNaN(cursorDate.getTime())) {
        if (!mostRecentCursor || cursorDate > mostRecentCursor) {
          mostRecentCursor = cursorDate;
        }
      }
    } catch {
      // Invalid date, already handled above
    }
  }

  if (mostRecentCursor) {
    const now = new Date();
    const daysSinceLastSync = (now.getTime() - mostRecentCursor.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastSync > STALE_THRESHOLD_DAYS) {
      issues.push({
        type: "data",
        severity: "warning",
        message: "Datos desactualizados",
        details: `Última sincronización hace ${Math.floor(daysSinceLastSync)} días. Se recomienda sincronizar.`,
      });
    }
  }

  return issues;
}

/**
 * Validate schema version in localStorage
 */
function validateSchemaVersion(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (typeof window === "undefined" || !localStorage) {
    return issues;
  }

  const schemaVersion = localStorage.getItem("avileo_schema_version");
  const schemaHash = localStorage.getItem("avileo_schema_hash");
  
  if (schemaVersion !== null) {
    const version = parseInt(schemaVersion, 10);
    if (isNaN(version) || version < 0) {
      issues.push({
        type: "schema",
        severity: "critical",
        message: "Versión de schema inválida",
        details: `El valor '${schemaVersion}' no es un número válido`,
      });
    }
  }

  // Check for orphaned schema hash without version
  if (schemaHash && !schemaVersion) {
    issues.push({
      type: "schema",
      severity: "warning",
      message: "Hash de schema huérfano",
      details: "Existe avileo_schema_hash pero no avileo_schema_version",
    });
  }

  return issues;
}

/**
 * Validate storage consistency
 * Detect orphaned keys and inconsistent state
 */
function validateStorage(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (typeof window === "undefined" || !localStorage) {
    return issues;
  }

  const allKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) allKeys.push(key);
  }

  // Check for orphaned avileo keys
  const avileoKeys = allKeys.filter(k => k.startsWith("avileo_"));
  const validKeyPrefixes = [
    "avileo_pull_cursor",
    "avileo_schema_version",
    "avileo_schema_hash",
    "avileo_local_db_namespace",
    "avileo-calculator-last",
  ];

  for (const key of avileoKeys) {
    const isValid = validKeyPrefixes.some(prefix => key.startsWith(prefix));
    if (!isValid) {
      issues.push({
        type: "storage",
        severity: "warning",
        message: `Key desconocida en storage: ${key}`,
        details: "Esta key no pertenece a ningún sistema conocido",
      });
    }
  }

  // Check for inconsistent state: namespace without database name
  const namespace = localStorage.getItem("avileo_local_db_namespace");
  const hasCursor = avileoKeys.some(k => k.startsWith("avileo_pull_cursor"));
  
  if (!namespace && hasCursor) {
    issues.push({
      type: "storage",
      severity: "warning",
      message: "Inconsistencia de namespace",
      details: "Existen cursores pero no hay namespace configurado",
    });
  }

  // Check for FORCE_RESET flag (indicates previous crash)
  const forceReset = localStorage.getItem("AVILEO_FORCE_RESET");
  if (forceReset === "true") {
    issues.push({
      type: "sync",
      severity: "critical",
      message: "Reset forzado pendiente",
      details: "El sistema detectó un crash anterior y requiere reparación",
    });
  }

  return issues;
}

/**
 * Check if IndexedDB databases exist and are accessible
 * This is async and should be called separately
 */
export async function checkIndexedDBHealth(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  
  if (typeof window === "undefined" || !window.indexedDB) {
    return issues;
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      // If we timeout, assume DB is locked/corrupt
      issues.push({
        type: "sync",
        severity: "critical",
        message: "IndexedDB no responde",
        details: "La base de datos local está bloqueada o corrupta",
      });
      resolve(issues);
    }, 3000);

    try {
      const dbName = getLocalDatabaseName();
      const request = window.indexedDB.open(dbName);

      request.onerror = () => {
        clearTimeout(timeout);
        issues.push({
          type: "sync",
          severity: "critical",
          message: "Error al acceder a IndexedDB",
          details: `No se pudo abrir la base de datos: ${dbName}`,
        });
        resolve(issues);
      };

      request.onsuccess = () => {
        clearTimeout(timeout);
        const db = request.result;
        
        // Check if database is empty (new database, will be initialized)
        // or has the expected tables
        const hasSchemaTable = db.objectStoreNames.contains("sync_schema_version");
        const hasAnyTable = db.objectStoreNames.length > 0;
        
        // If database has NO tables at all, it's a fresh empty database
        // This is OK - PGlite will initialize it
        if (!hasAnyTable) {
          console.log("[LoginValidator] Database is empty (new), will be initialized");
          try {
            db.close();
          } catch {
            // Ignore
          }
          resolve(issues);
          return;
        }
        
        // If database has tables BUT NOT the schema table, it's corrupt
        if (!hasSchemaTable) {
          issues.push({
            type: "schema",
            severity: "critical",
            message: "Tabla de versión de schema no encontrada",
            details: "La base de datos local existe pero no tiene la estructura esperada",
          });
        }
        
        try {
          db.close();
        } catch {
          // Ignore
        }
        resolve(issues);
      };

      request.onblocked = () => {
        clearTimeout(timeout);
        issues.push({
          type: "sync",
          severity: "warning",
          message: "IndexedDB bloqueada",
          details: "Otra pestaña o proceso está usando la base de datos",
        });
        resolve(issues);
      };
    } catch (error) {
      clearTimeout(timeout);
      issues.push({
        type: "sync",
        severity: "critical",
        message: "Error crítico de IndexedDB",
        details: error instanceof Error ? error.message : "Error desconocido",
      });
      resolve(issues);
    }
  });
}

/**
 * Run all pre-login validations
 * Returns validation result with issues found
 */
export function validatePreLogin(): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Run synchronous validations
  issues.push(...validateCursors());
  issues.push(...validateSchemaVersion());
  issues.push(...validateStorage());

  // Determine if healthy
  const criticalIssues = issues.filter(i => i.severity === "critical");
  const hasCritical = criticalIssues.length > 0;

  return {
    healthy: issues.length === 0,
    issues,
    canRepair: hasCritical || issues.length > 2, // Can repair if critical or many warnings
  };
}

/**
 * Run full validation including async IndexedDB check
 */
export async function validatePreLoginFull(): Promise<ValidationResult> {
  const syncResult = validatePreLogin();
  
  // Add async IndexedDB check
  const dbIssues = await checkIndexedDBHealth();
  const allIssues = [...syncResult.issues, ...dbIssues];
  
  const criticalIssues = allIssues.filter(i => i.severity === "critical");
  
  return {
    healthy: allIssues.length === 0,
    issues: allIssues,
    canRepair: criticalIssues.length > 0 || allIssues.length > 2,
  };
}

/**
 * Get a summary message for the validation result
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.healthy) {
    return "Todo está en orden";
  }

  const criticalCount = result.issues.filter(i => i.severity === "critical").length;
  const warningCount = result.issues.filter(i => i.severity === "warning").length;

  if (criticalCount > 0) {
    return `${criticalCount} problema${criticalCount > 1 ? "s" : ""} crítico${criticalCount > 1 ? "s" : ""} detectado${criticalCount > 1 ? "s" : ""}`;
  }

  return `${warningCount} advertencia${warningCount > 1 ? "s" : ""} detectada${warningCount > 1 ? "s" : ""}`;
}
