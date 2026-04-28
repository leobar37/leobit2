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

export function validatePreLogin(): ValidationResult {
  return {
    healthy: true,
    issues: [],
    canRepair: false,
  };
}

export async function validatePreLoginFull(): Promise<ValidationResult> {
  return validatePreLogin();
}

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
