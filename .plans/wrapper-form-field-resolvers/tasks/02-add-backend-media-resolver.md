# T-002 - Add Backend Media Resolver

## Objective

Add a tenant-safe backend batch resolver that receives file and asset IDs and returns URL metadata in a single response. Also harden existing file repository access paths so private file reads and deletes cannot cross tenant boundaries.

## Requirements Covered

- `FR-011`
- `FR-012`
- `NFR-002`

## Dependencies

None. This can run in parallel with T-001.

## Files or Areas Involved

- `packages/backend/src/api/media.ts` - Create - batch resolve route
- `packages/backend/src/app.ts` - Modify - register media routes
- `packages/backend/src/services/business/file.service.ts` - Modify if needed - expose metadata shape or batch resolver helper
- `packages/backend/src/services/business/asset.service.ts` - Modify if needed - expose metadata shape or batch resolver helper
- `packages/backend/src/services/repository/file.repository.ts` - Modify - enforce `ctx.businessId` in `findById`, `findByIds`, and `softDelete`
- `packages/backend/src/services/repository/asset.repository.ts` - Review - confirm tenant filtering in equivalent methods
- `packages/backend/src/api/files.ts` - Review - ensure route behavior still uses hardened service/repository paths
- `packages/backend/src/api/assets.ts` - Review - ensure route behavior still uses tenant-safe service/repository paths

## Target API Shape

```http
POST /media/resolve
```

Request:

```json
{
  "files": ["file-id-1"],
  "assets": ["asset-id-1"]
}
```

Response:

```json
{
  "files": {
    "file-id-1": {
      "id": "file-id-1",
      "kind": "file",
      "filename": "voucher.png",
      "mimeType": "image/png",
      "sizeBytes": 12345,
      "url": "https://..."
    }
  },
  "assets": {
    "asset-id-1": {
      "id": "asset-id-1",
      "kind": "asset",
      "filename": "product.png",
      "mimeType": "image/png",
      "sizeBytes": 54321,
      "url": "https://..."
    }
  }
}
```

## Actions

1. Add `mediaRoutes` with `contextPlugin` and `servicesPlugin`.
2. Implement `POST /media/resolve` with optional `files` and `assets` arrays.
3. Deduplicate incoming IDs before resolving.
4. Use existing `FileService.getWithUrls(ctx, ids)` and `AssetService.getWithUrls(ctx, ids)` where practical.
5. Return records keyed by ID so frontend callers can attach results without order assumptions.
6. Harden `FileRepository.findById`, `findByIds`, and `softDelete` with `eq(files.businessId, ctx.businessId)`.
7. Confirm `AssetRepository` has equivalent tenant filtering and fix gaps if found.
8. Add tests for successful same-business resolution and cross-business denial/omission.

## Completion Criteria

- Backend exposes `POST /media/resolve`.
- File and asset IDs resolve in one request.
- Missing, deleted, or cross-tenant IDs are omitted or rejected consistently.
- Existing `GET /files/:id` and `GET /assets/:id` still work.
- File repository access is tenant-safe.

## Validation

- `cd packages/backend && bun test`
- Add focused backend tests for `file.repository` and `mediaRoutes`.

## Risks or Notes

- Files are private compared to assets; do not return file metadata without tenant checks.
- The response should not leak whether another tenant owns an omitted ID.
- Keep service method signatures aligned with project rule: `ctx` first.
