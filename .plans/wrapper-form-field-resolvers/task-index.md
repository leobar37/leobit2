# Wrapper Form Field Resolvers - Task Index

## Summary

- Mode: Structured
- Slug: `wrapper-form-field-resolvers`
- Requirements File: `requirements.md`
- Checklist File: `checklist.json`

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` generic wrapper | T-003 |
| `FR-002` resolvePayload | T-003 |
| `FR-003` media fields to IDs | T-001, T-003 |
| `FR-004` existing ID passthrough | T-001, T-003, T-007 |
| `FR-005` resolved object to ID | T-001, T-003, T-007 |
| `FR-006` File upload to ID | T-001, T-003, T-007 |
| `FR-007` handleResolvedSubmit | T-003 |
| `FR-008` resolver lookup by name | T-003, T-004 |
| `FR-009` fileField/assetField | T-001 |
| `FR-010` generic media field | T-004 |
| `FR-011` backend batch resolver | T-002 |
| `FR-012` frontend resolve client/hooks | T-001, T-002 |
| `FR-013` centralized upload client | T-001 |
| `FR-014` migrate existing flows | T-005, T-006 |
| `FR-015` preserve ID payload contracts | T-003, T-005, T-006 |
| `NFR-001` testable units | T-001, T-003, T-007 |
| `NFR-002` tenant boundaries | T-002, T-007 |
| `NFR-003` generic base API | T-003, T-004 |
| `NFR-004` normal forms unaffected | T-003, T-007 |
| `NFR-005` incremental migration | T-005, T-006 |
| `NFR-006` no partial payloads | T-001, T-003, T-007 |

## Task List

| Task ID | File | Purpose | Dependencies |
| --- | --- | --- | --- |
| `T-001` | `tasks/01-create-field-resolver-core.md` | Create generic field resolver contracts plus file/asset upload and resolve clients | none |
| `T-002` | `tasks/02-add-backend-media-resolver.md` | Add tenant-safe backend batch resolver for file/asset IDs | none |
| `T-003` | `tasks/03-create-use-wrapper-form.md` | Implement `useWrapperForm`, `resolvePayload`, and `handleResolvedSubmit` | T-001 |
| `T-004` | `tasks/04-create-form-media-field.md` | Create generic form media field that reads resolver config from wrapper context | T-001, T-003 |
| `T-005` | `tasks/05-migrate-product-profile-flows.md` | Migrate product image and profile avatar flows to wrapper resolvers | T-002, T-003, T-004 |
| `T-006` | `tasks/06-migrate-payment-purchase-config-flows.md` | Migrate payment proof, purchase receipt, QR/config, active asset flows | T-002, T-003, T-004 |
| `T-007` | `tasks/07-tests-and-cleanup.md` | Add coverage, remove/replace duplicated upload paths, and verify regressions | T-005, T-006 |

## Suggested Execution Order

1. `T-001` - Frontend resolver foundation can start independently.
2. `T-002` - Backend batch resolver and tenant hardening can run in parallel with T-001.
3. `T-003` - Wrapper form depends on field resolver contracts from T-001.
4. `T-004` - UI field depends on wrapper context and resolver lookup.
5. `T-005` - Migrate low-risk product/profile flows first.
6. `T-006` - Migrate more workflow-heavy payment/purchase/config flows after the wrapper proves out.
7. `T-007` - Add final tests, cleanup, and regression verification after migrations.

## Notes

- T-001 and T-002 are intentionally independent so backend and frontend foundations can proceed in parallel.
- T-005 should be used to validate the final API shape before T-006 migrates more complex flows.
- Do not remove legacy hooks/components until T-007 confirms no remaining imports depend on them.
