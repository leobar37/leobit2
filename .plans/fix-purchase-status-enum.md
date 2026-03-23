# Plan: Fix purchase_status Enum Mismatch (22P02 Error)

## 1. Objective

Fix the `22P02` PostgreSQL error that occurs when inserting a purchase via sync. The error `enum_in` indicates the database's `purchase_status` enum does not contain the value `"draft"` that the code is sending.

## 2. Scope

- **Backend**: PostgreSQL database (Neon), Drizzle schema, migrations
- **Files**: `scripts/check-enums.ts` (verification), `drizzle/0039_add_purchase_draft.sql` (fix), potentially `src/db/schema/enums.ts`
- **No frontend changes required** — this is a pure backend/database mismatch

## 3. Verified Context

| Item | Status | Detail |
|------|--------|--------|
| Schema defines `purchase_status` with `draft` | ✅ Verified | `src/db/schema/enums.ts:77-82` |
| Migration `0039` adds `draft` to DB enum | ✅ Verified | `drizzle/0039_add_purchase_draft.sql:2` |
| Neon DB returns `22P02 enum_in` on INSERT | ✅ Verified | Backend logs confirm `pgErrorCode: "22P02"`, `pgErrorRoutine: "enum_in"` |
| Neon enum currently missing `draft` value | 🔍 Unconfirmed | Needs verification via `check-enums.ts` |
| Root cause: DB enum vs schema mismatch | 🔍 Likely | Neon may have been seeded without running `0039` migration |

**Evidence from logs:**
```
pgErrorCode: "22P02"
pgErrorRoutine: "enum_in"
params: ...,2026-03-23,0.00,draft,,,
```

The `draft` string is being rejected as invalid for the `purchase_status` enum.

## 4. Assumptions

1. The Neon database's `purchase_status` enum does NOT contain `draft` — either because:
   - The `0039_add_purchase_draft.sql` migration was never applied to Neon, OR
   - Neon was seeded/replicated with schema from before that migration
2. The local development database has `draft` (so the issue is Neon-specific)
3. Other enum values (`pending`, `received`, `cancelled`) work correctly — only `draft` fails

## 5. Files Involved

### To Create
| File | Purpose |
|------|---------|
| `packages/backend/scripts/check-enums.ts` | Verification script — queries Neon DB to list actual enum values |

### To Modify (if needed after verification)
| File | Purpose |
|------|---------|
| `packages/backend/drizzle/0043_add_purchase_draft_to_enum.sql` | Migration to add `draft` to Neon DB enum |
| `packages/backend/src/db/schema/enums.ts` | If case needs to change (e.g., `DRAFT` instead of `draft`) |

### Existing Reference Files
| File | Purpose |
|------|---------|
| `packages/backend/drizzle/0039_add_purchase_draft.sql` | Shows how `draft` was supposed to be added |
| `packages/backend/src/db/schema/enums.ts` | Current schema definition (lowercase `draft`) |
| `packages/backend/src/db/schema/purchases.ts` | How `purchaseStatusEnum` is used in table definition |
| `packages/backend/src/services/repository/purchase.repository.ts` | Repository that performs the INSERT |

## 6. Ordered Execution Steps

### Step 1: Run verification script to confirm actual Neon enum values

```bash
cd packages/backend
bun run scripts/check-enums.ts
```

Expected output formats:
- **If `draft` is missing**: Only shows `pending`, `received`, `cancelled`
- **If case mismatch**: Shows `DRAFT` (uppercase) instead of `draft`
- **If `draft` exists**: All four values listed correctly

### Step 2: If `draft` is missing from the enum

Create and run a corrective migration:

```sql
-- drizzle/0043_add_purchase_draft_to_enum.sql
ALTER TYPE purchase_status ADD VALUE IF NOT EXISTS 'draft';
```

This is the same fix as `0039` but explicitly run as a corrective step.

### Step 3: If case mismatch (e.g., DB has `DRAFT`, schema sends `draft`)

This requires renaming the enum value. PostgreSQL doesn't support directly renaming an enum value, so:

```sql
-- Step A: Add the correct value
ALTER TYPE purchase_status ADD VALUE IF NOT EXISTS 'draft';

-- Step B: Update any existing rows that might have the wrong case
UPDATE purchases SET status = 'draft' WHERE status = 'DRAFT';
```

Then verify the schema matches (schema uses lowercase `draft`).

### Step 4: Test the fix

Trigger a new purchase creation via the app and verify:
- [ ] Sync batch succeeds (no `22P02` error)
- [ ] Backend logs show `✅` success for purchase insert
- [ ] Purchase appears in the database correctly

### Step 5: Clean up debug logging (optional)

Remove `console.log` statements added to `purchase.repository.ts` during debugging:
- Line 115: `console.log("[PurchaseRepo] INSERT purchases values:", ...)`
- Lines 139-147: Error catch block with detailed logging

## 7. Risks and Edge Cases

| Risk | Mitigation |
|------|------------|
| `ALTER TYPE ADD VALUE` locks the table | Neon is a managed DB with low traffic during dev — acceptable |
| `draft` value already exists in DB (case-different) | `IF NOT EXISTS` prevents duplicate — safe |
| Electric SQL replication conflicts | `IF NOT EXISTS` is idempotent — safe |
| Production data uses wrong enum case | Query check before migration; update rows if needed |
| Neon has different enum definition entirely | If check reveals something unexpected, escalate before modifying |

## 8. Validation Strategy

1. **Before fix**: Run `check-enums.ts` → confirm `draft` is missing or wrong-case
2. **After fix**: Run `check-enums.ts` again → confirm `draft` now appears
3. **Functional test**: Create a new purchase via the app → sync succeeds → backend log shows purchase created
4. **Rollback plan**: If fix breaks production, the `ALTER TYPE ADD VALUE` is backward-compatible (adds only if missing)

## 9. Open Questions

| Question | Answer Needed |
|----------|---------------|
| Does Neon have any existing purchase records with `draft` status? | Run `SELECT DISTINCT status FROM purchases LIMIT 10;` to check |
| Is there a possibility the local DB vs Neon DB have different schemas? | If local works but Neon fails, this confirms schema drift |
| Could Electric SQL have replicated a schema without this enum value? | Possible if Electric schema push bypassed migrations |

## 10. Step-File Mapping

| Step | Files |
|------|-------|
| Step 1 | `scripts/check-enums.ts` (run only) |
| Step 2 | `drizzle/0043_add_purchase_draft_to_enum.sql` (create + run) |
| Step 3 | `drizzle/0043_add_purchase_draft_to_enum.sql` + potential schema update |
| Step 4 | Manual test (no file changes) |
| Step 5 | `purchase.repository.ts` (remove debug logs) |
