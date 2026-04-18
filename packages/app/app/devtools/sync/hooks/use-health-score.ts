import { useState, useEffect, useRef, useCallback } from "react";
import { useSyncState } from "~/lib/sync/service-provider";
import type { HealthScore, HealthScoreFactor, HealthStatusLevel } from "../types";

const SCORE_WEIGHTS = {
  failed: 5,
  conflict: 3,
  deadLetter: 10,
  consecutiveFailures: 2,
  queueAgeHours: 2,
} as const;

const HEALTH_THRESHOLDS = {
  healthy: 80,
  warning: 50,
  critical: 0,
} as const;

export interface UseHealthScoreReturn {
  healthScore: HealthScore;
  isLoading: boolean;
}

export function useHealthScore(): UseHealthScoreReturn {
  const syncState = useSyncState();
  const [healthScore, setHealthScore] = useState<HealthScore>({
    score: 100,
    status: "healthy",
    factors: [],
    previousScore: null,
    trend: null,
  });
  const previousScoreRef = useRef<number | null>(null);
  const previousFactorsRef = useRef<Map<string, number>>(new Map());

  const calculateHealthScore = useCallback(() => {
    const { push, isStuck, pull } = syncState;

    if (isStuck) {
      return {
        score: 0,
        status: "stuck" as HealthStatusLevel,
        factors: [],
        previousScore: previousScoreRef.current,
        trend: null,
      };
    }

    const factors: HealthScoreFactor[] = [];

    let score = 100;

    if (push.failed > 0) {
      const deduction = push.failed * SCORE_WEIGHTS.failed;
      factors.push({ name: "Operaciones fallidas", deduction, value: push.failed });
      score = Math.max(0, score - deduction);
    }

    if (push.conflict > 0) {
      const deduction = push.conflict * SCORE_WEIGHTS.conflict;
      factors.push({ name: "Conflictos", deduction, value: push.conflict });
      score = Math.max(0, score - deduction);
    }

    if (push.deadLetter > 0) {
      const deduction = push.deadLetter * SCORE_WEIGHTS.deadLetter;
      factors.push({ name: "Dead Letter", deduction, value: push.deadLetter });
      score = Math.max(0, score - deduction);
    }

    if (pull.consecutiveFailures > 0) {
      const deduction = pull.consecutiveFailures * SCORE_WEIGHTS.consecutiveFailures;
      factors.push({ name: "Fallos consecutivos de pull", deduction, value: pull.consecutiveFailures });
      score = Math.max(0, score - deduction);
    }

    let status: HealthStatusLevel = "healthy";
    if (score < HEALTH_THRESHOLDS.warning) {
      status = "critical";
    } else if (score < HEALTH_THRESHOLDS.healthy) {
      status = "warning";
    }

    let trend: "improving" | "stable" | "degrading" | null = null;
    const prevScore = previousScoreRef.current;
    if (prevScore !== null) {
      if (score > prevScore) {
        trend = "improving";
      } else if (score < prevScore) {
        trend = "degrading";
      } else {
        trend = "stable";
      }
    }

    previousScoreRef.current = score;

    return {
      score,
      status,
      factors,
      previousScore: prevScore,
      trend,
    };
  }, [syncState]);

  useEffect(() => {
    const newScore = calculateHealthScore();
    setHealthScore((prev) => ({
      ...newScore,
      previousScore: prev.previousScore,
    }));
  }, [calculateHealthScore]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newScore = calculateHealthScore();
      setHealthScore((prev) => ({
        ...newScore,
        previousScore: prev.score,
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [calculateHealthScore]);

  return {
    healthScore,
    isLoading: false,
  };
}

export function getHealthScoreColor(score: number): string {
  if (score >= HEALTH_THRESHOLDS.healthy) return "text-green-600";
  if (score >= HEALTH_THRESHOLDS.warning) return "text-yellow-600";
  return "text-red-600";
}

export function getHealthScoreBgColor(score: number): string {
  if (score >= HEALTH_THRESHOLDS.healthy) return "bg-green-50 border-green-200";
  if (score >= HEALTH_THRESHOLDS.warning) return "bg-yellow-50 border-yellow-200";
  return "bg-red-50 border-red-200";
}

export function getHealthStatusBadgeColor(status: HealthStatusLevel): string {
  switch (status) {
    case "healthy":
      return "bg-green-500";
    case "warning":
      return "bg-yellow-500";
    case "critical":
      return "bg-red-500";
    case "stuck":
      return "bg-amber-500";
    default:
      return "bg-gray-500";
  }
}