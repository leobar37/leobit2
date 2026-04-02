import { useState, useEffect, useCallback } from "react";
import { 
  StagedPullCoordinator, 
  type StagedPullState,
  type StagedPullResult 
} from "../lib/sync/staged-pull-coordinator";
import type { PullService } from "../lib/sync/pull-service";

interface UseStagedSyncOptions {
  pullService: PullService | null;
  onProgress?: (state: StagedPullState) => void;
  onComplete?: (result: StagedPullResult) => void;
  autoStart?: boolean;
}

interface UseStagedSyncReturn {
  // States
  critical: StagedPullState;
  recent: StagedPullState;
  historical: StagedPullState;
  
  // Derived states
  isLoading: boolean;
  isUsable: boolean;
  isComplete: boolean;
  totalChanges: number;
  
  // Actions
  start: () => Promise<void>;
  reset: () => void;
}

export function useStagedSync(options: UseStagedSyncOptions): UseStagedSyncReturn {
  const { pullService, onProgress, onComplete, autoStart = true } = options;
  
  // Initialize state for all stages
  const [critical, setCritical] = useState<StagedPullState>({
    stage: "CRITICAL",
    status: "pending",
    changesApplied: 0,
  });
  
  const [recent, setRecent] = useState<StagedPullState>({
    stage: "RECENT_SALES",
    status: "pending",
    changesApplied: 0,
  });
  
  const [historical, setHistorical] = useState<StagedPullState>({
    stage: "HISTORICAL",
    status: "pending",
    changesApplied: 0,
  });

  // Create coordinator instance
  const [coordinator] = useState(() => {
    if (!pullService) return null;
    
    const coord = new StagedPullCoordinator(pullService);
    
    // Set up progress callback
    coord.setOnProgress((state) => {
      onProgress?.(state);
      
      // Update local state
      switch (state.stage) {
        case "CRITICAL":
          setCritical(state);
          break;
        case "RECENT_SALES":
          setRecent(state);
          break;
        case "HISTORICAL":
          setHistorical(state);
          break;
      }
    });
    
    return coord;
  });

  const start = useCallback(async () => {
    if (!coordinator) {
      console.warn("[useStagedSync] Cannot start: pullService not available");
      return;
    }

    try {
      const { critical, recent, historical } = await coordinator.executeStagedLoad();
      
      // Wait for historical to complete (optional, for final state)
      const historicalState = await historical;
      
      // Call onComplete with final state
      onComplete?.({
        critical,
        recent,
        historical: historicalState,
      });
    } catch (error) {
      console.error("[useStagedSync] Error during staged load:", error);
    }
  }, [coordinator, onComplete]);

  const reset = useCallback(() => {
    coordinator?.reset();
    
    setCritical({
      stage: "CRITICAL",
      status: "pending",
      changesApplied: 0,
    });
    setRecent({
      stage: "RECENT_SALES",
      status: "pending",
      changesApplied: 0,
    });
    setHistorical({
      stage: "HISTORICAL",
      status: "pending",
      changesApplied: 0,
    });
  }, [coordinator]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && pullService && coordinator) {
      start();
    }
  }, [autoStart, pullService, coordinator, start]);

  // Derived states
  const isLoading = critical.status === "loading" || recent.status === "loading";
  const isUsable = critical.status === "complete" && recent.status === "complete";
  const isComplete = isUsable && historical.status === "complete";
  const totalChanges = critical.changesApplied + recent.changesApplied + historical.changesApplied;

  return {
    critical,
    recent,
    historical,
    isLoading,
    isUsable,
    isComplete,
    totalChanges,
    start,
    reset,
  };
}
