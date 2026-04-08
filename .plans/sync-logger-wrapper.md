# Sync Logger Wrapper Plan

## Objective

Create an in-memory ring-buffer logger (`SyncLogger`) that captures warn and error log entries from the sync subsystem, and expose a "Copiar Errores de Sync" button in the DebugWidget so users can copy the last N log entries to clipboard.

## Scope

- In scope: sync-critical `console.warn` and `console.error` calls in `pull-service.ts`, `sync-service.ts`, `coordinator.ts`, and `change-applier.ts`; `DebugActions` copy button.
- Out of scope: general app-wide logging, backend logging, log persistence to IndexedDB or file, log transport to a server.

## Verified Context

- No `createLog`, `LogStore`, `errorLog`, or similar wrapper exists anywhere in `packages/app/app/lib/sync/`.
- Sync services use raw `console.log`, `console.warn`, and `console.error` with `[SYNC]`, `[PULL]`, and `[ChangeApplier]` prefixes.
- `sync-events.ts` has a `SyncEventEmitter` but it is not used as a log transport — warn-level events are never emitted through it.
- `DebugActions` has a `copyReport` action but no sync-error-specific copy.
- `DebugWidget` is dev-only (`import.meta.env.DEV` guard).

## Assumptions

- The ring buffer cap of 50 entries is sufficient for typical debugging sessions.
- The logger will only capture sync subsystem logs, not replace all `console.*` globally.
- The copy output format will be plain text (markdown-adjacent) for readability.

## Files Involved

- `packages/app/app/lib/sync/sync-logger.ts` - **Create** - the new SyncLogger ring-buffer module
- `packages/app/app/lib/sync/pull-service.ts` - **Modify** - replace 6 critical `console.warn/error` calls
- `packages/app/app/lib/sync/sync-service.ts` - **Modify** - replace 3 critical `console.error` calls
- `packages/app/app/lib/sync/coordinator.ts` - **Modify** - replace 1 critical `console.error` call
- `packages/app/app/lib/sync/change-applier.ts` - **Modify** - replace 2 critical `console.warn` calls
- `packages/app/app/devtools/components/debug-actions.tsx` - **Modify** - add "Copiar Errores de Sync" button

## Ordered Execution Steps

### Step 1 — Create `sync-logger.ts`

- File: `packages/app/app/lib/sync/sync-logger.ts`
- Action: Create the `SyncLogger` module:
  - `SyncLogEntry` interface: `{ id: string; timestamp: Date; level: 'warn' | 'error'; prefix: string; message: string; data?: unknown }`
  - `SyncLogger` class:
    - Private `entries: SyncLogEntry[]` array capped at 50 items (ring buffer)
    - `warn(prefix: string, message: string, data?: unknown): void` — pushes entry, also calls `console.warn`
    - `error(prefix: string, message: string, data?: unknown): void` — pushes entry, also calls `console.error`
    - `getEntries(): SyncLogEntry[]` — returns all buffered entries (newest last)
    - `getRecent(level?: 'warn' | 'error', limit?: number): SyncLogEntry[]` — optional filter
    - `clear(): void`
  - Export a singleton instance: `export const syncLogger = new SyncLogger()`
  - Export type: `export type { SyncLogEntry }`

### Step 2 — Replace critical console calls in `pull-service.ts`

- File: `packages/app/app/lib/sync/pull-service.ts`
- Action: Replace the following calls with `syncLogger.*` equivalents:

  | Line | Replace | With |
  |------|---------|------|
  | ~387 | `console.warn(\`[PULL] ⚠️ Empty pull...\`)` | `syncLogger.warn('[PULL]', \`Empty pull #${this.consecutiveEmptyPulls} with hasMore=true\`)` |
  | ~391 | `console.error(\`[PULL] 🚨 STUCK...\`)` | `syncLogger.error('[PULL]', \`STUCK: ${MAX_EMPTY_PULLS} consecutive empty pulls\`)` |
  | ~409 | `console.warn(\`[PULL] ⚠️ Cursor stuck...\`)` | `syncLogger.warn('[PULL]', \`Cursor stuck #${this.consecutiveStalePulls} (got ${changes.length} changes but cursor same)\`)` |
  | ~413 | `console.error(\`[PULL] 🚨 STUCK...\`)` | `syncLogger.error('[PULL]', \`STUCK: Cursor stuck after ${MAX_STALE_PULLS} pulls\`)` |
  | ~477 | `console.error(\`[Pull] Failed to apply change...\`)` | `syncLogger.error('[Pull]', \`Failed to apply change for ${change.entityType}:${change.entityId}\`, result.error)` |
  | ~495 | `console.warn(\`[Pull] Applied N/M changes...\`)` | `syncLogger.warn('[Pull]', \`Applied ${appliedCount}/${changes.length} changes. ${failedChanges.length} failed.\`)` |

### Step 3 — Replace critical console calls in `sync-service.ts`

- File: `packages/app/app/lib/sync/sync-service.ts`
- Action: Replace the following calls:

  | Line | Replace | With |
  |------|---------|------|
  | ~1198 | `console.error(\`[SYNC] Operation marked as FAILED...\`)` | `syncLogger.error('[SYNC]', 'Operation marked as FAILED', { operationId: id, entityType: op?.entity_type, ... })` |
  | ~1068 | `console.error("Failed to delete operation:", error)` | `syncLogger.error('[SYNC]', 'Failed to delete operation', { operationId })` |
  | ~1089 | `console.error("Failed to delete operations:", error)` | `syncLogger.error('[SYNC]', 'Failed to delete operations', { count: operationIds.length })` |

### Step 4 — Replace critical console calls in `coordinator.ts`

- File: `packages/app/app/lib/sync/coordinator.ts`
- Action: Replace the following call:

  | Line | Replace | With |
  |------|---------|------|
  | ~104 | `console.error(\`[SyncCoordinator] 🚨 Pull sync is stuck...\`)` | `syncLogger.error('[SyncCoordinator]', \`Pull sync is stuck: ${reason} after ${consecutiveStalePulls} pulls\`)` |

### Step 5 — Replace critical console calls in `change-applier.ts`

- File: `packages/app/app/lib/sync/change-applier.ts`
- Action: Replace the following calls:

  | Line | Replace | With |
  |------|---------|------|
  | ~80 | `console.warn(\`[ChangeApplier] Retrying change...\`)` | `syncLogger.warn('[ChangeApplier]', \`Retrying change for ${tableName}:${change.entityId} (${retriesLeft} retries left)\`)` |
  | ~184 | `console.warn(\`[ChangeApplier] Record ... not found for update...\`)` | `syncLogger.warn('[ChangeApplier]', \`Record ${tableName}:${id} not found for update, converting to insert\`)` |

### Step 6 — Add "Copiar Errores de Sync" button in `DebugActions`

- File: `packages/app/app/devtools/components/debug-actions.tsx`
- Action:
  1. Import `syncLogger` from `~/lib/sync/sync-logger`
  2. Add a `copySyncErrors` async function that:
     - Calls `syncLogger.getEntries()`
     - Formats each entry as `[LEVEL] [TIMESTAMP] [PREFIX] MESSAGE` (data as JSON if present)
     - Joins with newlines
     - Copies via `navigator.clipboard.writeText()`
     - Shows a success/failure toast via `useToast()`
  3. Add a new entry to the `actions` array:
     - Icon: `AlertTriangle` (from lucide-react)
     - Label: `"Copiar Errores"`
     - Description: `"Copia últimos errores y warnings de sync"`
     - Color: `"text-yellow-600"`
     - Action: `copySyncErrors`

## Risks and Edge Cases

- If no entries exist in the buffer, the copy button should copy an empty string (or a "No errors" message) — must not throw.
- The ring buffer cap of 50 means very long debug sessions may lose early entries — acceptable for this tool's purpose.
- `syncLogger` is a singleton; no need to pass it through React context.
- The `data` field in `SyncLogEntry` can be large (e.g., full operation payloads at line ~1198). Truncate to 500 chars per entry when formatting for clipboard.

## Validation Strategy

- TypeScript compiles without errors after all replacements.
- Import `syncLogger` in `debug-actions.tsx` and call `syncLogger.getEntries()` — verify it returns an array.
- In the browser devtools, trigger a sync error scenario (e.g., go offline during sync) and verify the log entry appears in `syncLogger.getEntries()`.
- Tap "Copiar Errores" and paste into a text editor — verify entries are formatted readably.
- Verify the existing "Copiar Reporte" button still works.

## Open Questions

- Should the copy output include only `error`-level entries, or both `warn` and `error`? **Decision: include both (warn + error), as cursor-stuck warnings are also relevant for bug reports.**
- Should the buffer be persisted across page reloads? **Decision: no — in-memory only, consistent with a devtools utility.**
