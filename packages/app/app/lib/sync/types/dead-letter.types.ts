/**
 * Sync Dead Letter Types
 *
 * Types for failed operations that exceeded retry limits.
 */

export interface DeadLetterOperationRecord {
  id: string;
  business_id: string;
  operation_id: string;
  entity_type: string;
  operation: "create" | "update" | "delete";
  entity_id: string;
  data: string;
  error: string;
  sync_attempts: number;
  original_error: string | null;
  created_at: string;
}
