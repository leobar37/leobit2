/**
 * Sync MSW Handlers for E2E Tests
 *
 * These handlers provide mocking for sync operations with 1000+ pending operations.
 * Supports FR-017: Sync Testing
 */

import { http, HttpResponse } from "msw";

interface SyncOperation {
  id: string;
  entity: string;
  operation: "create" | "update" | "delete";
  data: any;
  timestamp: string;
}

interface SyncBatchRequest {
  operations: SyncOperation[];
  deviceId: string;
  lastSyncTimestamp?: string;
}

// Simulate processing delay for volume testing
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Store for tracking sync operations
let pendingOperations: SyncOperation[] = [];
let syncHistory: SyncOperation[] = [];

export function resetSyncStore() {
  pendingOperations = [];
  syncHistory = [];
}

export function getPendingOperations() {
  return pendingOperations;
}

export const syncHandlers = [
  // Batch sync endpoint
  http.post("/api/sync/batch", async ({ request }) => {
    const body = (await request.json()) as SyncBatchRequest;
    const results: any[] = [];

    // Simulate processing delay for large batches
    if (body.operations.length > 100) {
      await delay(10 * Math.ceil(body.operations.length / 100));
    }

    for (const op of body.operations) {
      // Simulate 5% conflict rate
      const hasConflict = Math.random() < 0.05;

      if (hasConflict) {
        results.push({
          idempotencyKey: op.id,
          success: false,
          error: "Conflict: version mismatch",
          serverData: op.data,
        });
      } else {
        results.push({
          idempotencyKey: op.id,
          success: true,
          serverVersion: Date.now(),
          serverTimestamp: new Date().toISOString(),
        });
        syncHistory.push(op);
      }
    }

    return HttpResponse.json({
      success: true,
      data: {
        results,
        processedAt: new Date().toISOString(),
        totalOperations: body.operations.length,
      },
    });
  }),

  // Get sync changes (pull)
  http.get("/api/sync/changes", ({ request }) => {
    const url = new URL(request.url);
    const since = url.searchParams.get("since");
    const entity = url.searchParams.get("entity");

    let changes = syncHistory;

    if (since) {
      changes = changes.filter((op) => op.timestamp > since);
    }

    if (entity) {
      changes = changes.filter((op) => op.entity === entity);
    }

    return HttpResponse.json({
      success: true,
      data: {
        changes,
        syncTimestamp: new Date().toISOString(),
      },
    });
  }),

  // Health check
  http.get("/api/sync/health", () => {
    return HttpResponse.json({
      success: true,
      data: {
        status: "healthy",
        pendingCount: pendingOperations.length,
        lastSync: new Date().toISOString(),
      },
    });
  }),
];

// Alias export for compatibility with index.ts barrel export pattern
export const handlers = syncHandlers;
