# WhatsApp Integration - Bug Fixes & Improvements

## Objective

Fix identified bugs and implement improvements to the WhatsApp integration in Avileo. The work includes: optimizing bulk message sending, adding delivery status tracking, adding template categories, adding media message support, and UI improvements for category filtering.

## Current State

- Done: Full feature analysis completed, all affected files identified
- Remaining:
  - Bug fix: Optimize bulk message sending with batch operations
  - Schema: Add "entregado" (delivered) status to messages
  - Schema: Add category field to templates
  - Feature: Add media message support (images, videos, documents)
  - Feature: Add category filters to frontend UI

## Decisions Already Made

- Evolution API as WhatsApp backend service - locked in, works well
- Inngest for async message sending - locked in, handles retries properly
- Peru phone number format (+51) - locked in, enforced in code
- Template variables: `{nombre_cliente}`, `{monto}`, `{fecha}`, `{telefono}`, `{productos}`, `{total}` - locked in, used in default templates

## Affected Files / Artifacts

- `packages/backend/src/services/business/whatsapp-message.service.ts` - status: review next - contains bulk send loop that needs optimization
- `packages/backend/src/db/schema/whatsapp-messages.ts` - status: change - needs "entregado" added to enum
- `packages/backend/src/db/schema/whatsapp-templates.ts` - status: change - needs category field added
- `packages/backend/src/services/business/default-templates.ts` - status: review next - already has category field in interface
- `packages/backend/src/services/infrastructure/evolution.service.ts` - status: change - needs sendImage/sendMedia methods
- `packages/app/app/hooks/use-whatsapp-templates.ts` - status: change - needs category filter support
- `packages/app/app/routes/_protected.config.whatsapp.templates.tsx` - status: review next - needs category selector UI

## Execution Plan

1. **Optimize bulk send**: Modify `whatsapp-message.service.ts` lines 142-188 to use batch insert instead of individual inserts in loop. Use `Promise.all` or repository batch method.

2. **Add delivered status**: Update `whatsapp-messages.ts` enum to include "entregado". Run `bun run db:generate` and `bun run db:migrate`.

3. **Add template categories**: Update `whatsapp-templates.ts` schema to add `category` field (already defined in interface in `default-templates.ts`). Categories: "cobranza", "ventas", "agradecimiento", "entrega", "otros". Run migration.

4. **Add media support**: Extend `evolution.service.ts` with `sendImage`, `sendVideo`, `sendDocument` methods. Update message service to accept media types.

5. **Add category filters**: Update frontend hooks and templates page UI to filter by category.

## Validation

- Automated: `bun run typecheck` passes, `bun run build` succeeds
- Manual: Test bulk send with 10+ customers, verify all messages created. Create template with category, verify filter works. Send image message, verify delivery.
- Acceptance: Bulk send completes in under 2s for 50 messages. Templates display category badges. Media messages send successfully via Evolution API.

## Open Questions / Assumptions

- The Evolution API is properly configured with media endpoints - assume yes based on existing text sending working
- Frontend can accept media file uploads - standard file input should work
- Category "otros" is sufficient for miscellaneous templates

## Immediate Next Action

Start with Step 1: Optimize bulk send in `whatsapp-message.service.ts` - change the for loop to use batch insert for better performance.
