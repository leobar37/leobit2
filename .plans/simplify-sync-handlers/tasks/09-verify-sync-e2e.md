# T-009 End-to-End Verification of Sync Flows

## Objective

Verify that the complete sync flows work end-to-end for all three affected entities (sales, distribuciones, purchases) after all migration tasks are complete, with special emphasis on the cuaderno promise: daily workflows remain coherent locally before sync.

## Requirements Covered

- `NFR-001`, `NFR-002`, `NFR-003`, `NFR-004`
- `FR-019`, `FR-020`, `FR-021`

## Dependencies

- `T-008` (all tests updated)

## Files or Areas Involved

- Running dev server (backend)
- Running dev app (frontend)
- Test database
- Sync queue and engine

## Actions

1. Start backend dev server and frontend dev server
2. **Sales flow**:
   - Create an instant_sale (contado) via POS UI → verify sync succeeds
   - Before syncing, verify the local sale is visible in PGlite-backed UI
   - Create a credit sale with initial payment → verify both sale and abono sync
   - Before syncing, verify customer debt and abono history are coherent locally
   - Update sale status to "active" (confirm) → verify sync succeeds
   - Cancel a sale → verify sync succeeds, no backend state machine needed
   - Verify version conflict detection: edit same sale from two devices
3. **Distribuciones flow**:
   - Create a distribucion → verify sync succeeds
   - Before syncing, verify distribucion data remains usable locally
   - Update distribucion status (activo → en_ruta → cerrado) → verify sync succeeds
   - Add distribucion items → verify sync succeeds
4. **Purchases flow**:
   - Create a purchase (draft) → verify sync succeeds
   - Update purchase status to "pending" → verify sync
   - Update purchase status to "received" → verify inventory is updated in backend
   - Cancel a received purchase → verify inventory is decremented in backend
5. **Abono integration**:
   - Create a credit sale with S/50 advance offline
   - Verify abono appears in frontend PGlite immediately
   - Go online, verify sync creates both sale and abono on backend
   - Check customer balance reflects the payment
6. **Cuaderno offline-duration check**:
   - Simulate an extended offline session
   - Create multiple sales, abonos, distribucion updates, and purchase drafts
   - Navigate away and back; verify all entries remain available locally
   - Reconnect and verify queued operations sync without requiring backend-side creation of missing day-to-day records
7. **Regression check**:
   - Create a customer, product, tag via sync → verify still works (generic handlers unaffected)
8. Review sync logs for errors or warnings

## Completion Criteria

- All 4 sync flows complete without errors
- Inventory updates work correctly for purchases
- Credit sale with initial payment shows abono in frontend immediately
- Extended offline workflow behaves like a notebook: entries remain readable, editable where appropriate, and coherent before sync
- No regressions in generic handler entities
- Version conflict detection triggers appropriately

## Validation

- Manual testing against running dev servers
- Review backend sync logs
- Check PostgreSQL data consistency
- Check PGlite data consistency after sync

## Risks or Notes

- This is a manual verification step. Consider automating with Playwright E2E tests if time permits.
- The abono `withPreValidation` balance check may need adjustment for initial payments (see T-006 risks).
