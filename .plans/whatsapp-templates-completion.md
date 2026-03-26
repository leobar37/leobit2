# WhatsApp Templates Feature Completion Plan

## Objective

Fix critical schema mismatches and implement missing functionality in the WhatsApp templates feature to make it fully operational. The feature currently has runtime errors due to: (1) `saleId` column referenced but not in schema, (2) `category` column missing from database, (3) category filtering not implemented in backend, (4) incomplete test coverage.

## Scope

- In scope: Fix schema mismatches, implement category filtering, add category to create/update operations, run database migrations
- Out of scope: Media message support UI, offline message queue, E2E tests

## Verified Context

- **Verified**: `whatsapp-message.service.ts:99` passes `saleId` but column does not exist in schema
- **Verified**: `whatsapp-templates.ts` schema defines `category` field but DB migration `0018_add_whatsapp_tables.sql` does NOT create this column
- **Verified**: `inngest/whatsapp-functions.ts:35` sets status `"entregado"` - TypeScript enum already includes this value, but DB column is varchar without constraint
- **Verified**: Frontend `use-whatsapp-templates.ts:55` sends `category` filter but backend `api/whatsapp/templates.ts:11-28` ignores it
- **Verified**: `api/whatsapp/templates.ts:64-70` body DTO for create does NOT include `category` field
- **Verified**: `whatsapp-template.service.ts` create/update methods do NOT handle `category` field
- **Verified**: `whatsapp-template.repository.ts` update method does NOT update `category` field

## Assumptions

- Database is accessible for running migrations
- Evolution API credentials are configured and working
- Frontend category selector UI already exists (needs backend support to work)

## Files Involved

- `packages/backend/src/db/schema/whatsapp-messages.ts` - Modify - needs `saleId` column OR remove from service
- `packages/backend/src/db/schema/whatsapp-templates.ts` - Review - category already defined, needs migration
- `packages/backend/src/services/repository/whatsapp-message.repository.ts` - Modify - `create` method needs to handle `saleId`
- `packages/backend/src/services/business/whatsapp-message.service.ts` - Modify - remove `saleId` from create calls (safer approach)
- `packages/backend/src/api/whatsapp/templates.ts` - Modify - add `category` to query params and body DTOs
- `packages/backend/src/services/business/whatsapp-template.service.ts` - Modify - add `category` to create/update operations
- `packages/backend/src/services/repository/whatsapp-template.repository.ts` - Modify - add `category` to update method
- `packages/app/app/hooks/use-whatsapp-templates.ts` - Review - already sends category, no changes needed
- `packages/backend/drizzle/` - Generate and run migration for category column

## Ordered Execution Steps

### Step 1: Decide on `saleId` approach

**Decision needed**: Add `saleId` column to `whatsapp_messages` OR remove from service.

**Recommended**: Remove from service (Step 2) since `saleId` is optional and the feature doesn't currently use it.

### Step 2: Remove `saleId` from message creation

- **Files**: `packages/backend/src/services/business/whatsapp-message.service.ts`
- **Action**: Remove `saleId: input.saleId || null` from lines 99 and 182
- **Depends on**: None

### Step 3: Generate database migration for `category` column

- **Files**: `packages/backend/drizzle/`
- **Action**: Run `cd packages/backend && bun run db:generate` to detect schema changes
- **Depends on**: None
- **Note**: This will generate a migration adding `category` column to `whatsapp_templates`

### Step 4: Run database migration

- **Files**: `packages/backend/drizzle/`
- **Action**: Run `cd packages/backend && bun run db:migrate` to apply migration
- **Depends on**: Step 3

### Step 5: Add `category` to template API query params

- **Files**: `packages/backend/src/api/whatsapp/templates.ts`
- **Action**:
  - Add `category` to query DTO (line 23-27)
  - Pass `category` to service in `getAllTemplates` call
- **Depends on**: Step 4

### Step 6: Add `category` to template service filters

- **Files**: `packages/backend/src/services/business/whatsapp-template.service.ts`
- **Action**:
  - Add `category` to `getAllTemplates` filters interface
  - Pass `category` to repository
- **Depends on**: Step 5

### Step 7: Add `category` to template repository

- **Files**: `packages/backend/src/services/repository/whatsapp-template.repository.ts`
- **Action**:
  - Add `category` to `findMany` filters
  - Add category filter condition to query
- **Depends on**: Step 6

### Step 8: Add `category` to create template DTO

- **Files**: `packages/backend/src/api/whatsapp/templates.ts`
- **Action**: Add `category` to body DTO for POST `/whatsapp/templates/`
- **Depends on**: Step 4

### Step 9: Add `category` to update template DTO

- **Files**: `packages/backend/src/api/whatsapp/templates.ts`
- **Action**: Add `category` to body DTO for PUT `/whatsapp/templates/:id`
- **Depends on**: Step 8

### Step 10: Handle `category` in template service create

- **Files**: `packages/backend/src/services/business/whatsapp-template.service.ts`
- **Action**: Add `category` to `createTemplate` input and pass to repository
- **Depends on**: Step 8

### Step 11: Handle `category` in template service update

- **Files**: `packages/backend/src/services/business/whatsapp-template.service.ts`
- **Action**: Add `category` to `updateTemplate` input and pass to repository
- **Depends on**: Step 9

### Step 12: Handle `category` in template repository update

- **Files**: `packages/backend/src/services/repository/whatsapp-template.repository.ts`
- **Action**: Add `category` to the update method's set object
- **Depends on**: Step 11

### Step 13: Update default templates to include category

- **Files**: `packages/backend/src/services/business/default-templates.ts`
- **Action**: Assign categories to default templates (e.g., "cobranza" for debt reminder, "ventas" for sales)
- **Depends on**: Step 4

### Step 14: Validate implementation

- **Files**: All modified files
- **Action**: Run `cd packages/backend && bun run typecheck && bun run build`
- **Depends on**: All previous steps

## Risks and Edge Cases

- **Migration failure**: If migration fails due to existing data, may need to provide default value for `category`
- **Frontend/backend sync**: Frontend sends category but if backend doesn't handle it, updates silently fail
- **Enum consistency**: `templateCategoryEnum` in schema vs string literals in frontend need to stay in sync

## Validation Strategy

- **TypeScript build**: `bun run build` must pass with no errors
- **Manual testing**:
  1. Create template with category via API, verify category is stored
  2. List templates with category filter, verify correct filtering
  3. Update template category, verify change persists
  4. Send message, verify no runtime errors from missing `saleId` column

## Open Questions

- Should `saleId` be added as a proper column (linking messages to sales), or is the current optional approach sufficient?
- Should there be a default category when not specified, or should it be required?
