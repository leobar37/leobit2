/**
 * Change Applier Types
 * Types for applying server changes to local database
 */

import type { PullChange } from "./types";
import type { ISyncLogger } from "../core";

export interface ApplyResult {
  success: boolean;
  operation: 'insert' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  durationMs: number;
  conflictDetected?: boolean;
  error?: Error;
}

export interface BatchApplyResult {
  results: ApplyResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    conflicts: number;
    totalDurationMs: number;
  };
  entityTypesAffected: Set<string>;
}

export interface ApplierOptions {
  maxRetries?: number;
  checkConflicts?: boolean;
  conflictStrategy?: 'pre-computed-set' | 'check-db' | 'none';
  logger?: ISyncLogger;
}

export type ConflictStrategy = 'pre-computed-set' | 'check-db' | 'none';

export interface ApplyChangeOptions {
  maxRetries?: number;
  checkConflicts?: boolean;
  conflictStrategy?: ConflictStrategy;
  conflictedIds?: Set<string>;
}
