import { useState, useEffect, useCallback, useMemo } from "react";
import {
  validatePreLogin,
  validatePreLoginFull,
  type ValidationResult,
} from "~/lib/validators/login-validators";
import { clearSyncStorage } from "~/lib/session-storage";

export type HealthStatus = "checking" | "healthy" | "warning" | "critical";

export interface LoginHealthState {
  status: HealthStatus;
  result: ValidationResult | null;
  isChecking: boolean;
  canLogin: boolean;
  warningMessage: string | null;
}

export interface LoginHealthActions {
  repair: () => Promise<void>;
  ignore: () => void;
  recheck: () => void;
}

/**
 * Hook to check login health before allowing authentication
 * 
 * Runs validation checks on mount and provides actions to repair or ignore issues
 */
export function useLoginHealth(): LoginHealthState & LoginHealthActions {
  const [status, setStatus] = useState<HealthStatus>("checking");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const runValidation = useCallback(async () => {
    setIsChecking(true);
    setStatus("checking");

    // Quick sync check first
    const syncResult = validatePreLogin();
    
    // If no critical issues from sync check, do full async check
    const criticalCount = syncResult.issues.filter(i => i.severity === "critical").length;
    
    if (criticalCount === 0 && syncResult.issues.length <= 2) {
      // Do full check including IndexedDB
      const fullResult = await validatePreLoginFull();
      setResult(fullResult);
      
      if (fullResult.healthy) {
        setStatus("healthy");
      } else {
        const critical = fullResult.issues.filter(i => i.severity === "critical").length;
        setStatus(critical > 0 ? "critical" : "warning");
      }
    } else {
      // Skip IndexedDB check if we already have critical issues
      setResult(syncResult);
      setStatus(criticalCount > 0 ? "critical" : "warning");
    }
    
    setIsChecking(false);
  }, []);

  // Run validation on mount
  useEffect(() => {
    runValidation();
  }, [runValidation]);

  /**
   * Repair action: Clear all sync storage and reload the page
   */
  const repair = useCallback(async () => {
    console.log("[LoginHealth] ========================================");
    console.log("[LoginHealth] REPAIR BUTTON CLICKED");
    console.log("[LoginHealth] ========================================");
    console.log("[LoginHealth] Starting repair process...");
    
    try {
      console.log("[LoginHealth] Calling clearSyncStorage...");
      // Clear all sync-related storage
      await clearSyncStorage({ preserveSession: false });
      
      console.log("[LoginHealth] Repair complete! Reloading in 1 second...");
      
      // Small delay to ensure logs are printed before reload
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("[LoginHealth] Repair failed with error:", error);
      console.error("[LoginHealth] Stack:", error instanceof Error ? error.stack : "N/A");
      // Even if repair fails, try to reload anyway
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }, []);

  /**
   * Ignore action: Allow login despite issues (user's choice)
   */
  const ignore = useCallback(() => {
    console.log("[LoginHealth] User chose to ignore issues:", result?.issues);
    
    // Downgrade status to allow login
    if (status === "critical") {
      setStatus("warning");
    }
  }, [status, result]);

  /**
   * Recheck action: Run validation again
   */
  const recheck = useCallback(() => {
    runValidation();
  }, [runValidation]);

  // Can login if healthy or warning (but not critical unless user ignores)
  const canLogin = status === "healthy" || status === "warning";

  // Generate warning message based on actual issues
  const warningMessage = useMemo(() => {
    if (!result || result.healthy) return null;
    
    const criticalCount = result.issues.filter(i => i.severity === "critical").length;
    const warningCount = result.issues.filter(i => i.severity === "warning").length;
    const dataIssues = result.issues.filter(i => i.type === "data");
    
    // If there are data-specific issues, show the first one
    if (dataIssues.length > 0) {
      return dataIssues[0].message;
    }
    
    // Otherwise show count summary
    if (criticalCount > 0) {
      return `${criticalCount} problema${criticalCount > 1 ? "s" : ""} crítico${criticalCount > 1 ? "s" : ""}`;
    }
    
    if (warningCount > 0) {
      return `${warningCount} advertencia${warningCount > 1 ? "s" : ""}`;
    }
    
    return null;
  }, [result]);

  return {
    status,
    result,
    isChecking,
    canLogin,
    warningMessage,
    repair,
    ignore,
    recheck,
  };
}
