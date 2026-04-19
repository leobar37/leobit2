# T-006: Validate, Migrate, and Rollout

## Objective

Final validation, documentation, and rollout of the library for production use. This task ensures the library is ready for adoption beyond Avileo.

## Linked Requirements

- **NFR-001:** Tree-Shakeable Bundle
- **NFR-002:** TypeScript Support
- **NFR-005:** Performance
- **NFR-006:** Backward Compatibility During Migration

## Concrete Files and Directories

### Files to Create

| File | Purpose |
|------|---------|
| `packages/drizzle-sync/README.md` | Usage documentation |
| `packages/drizzle-sync/CHANGELOG.md` | Version history |

### Files to Update

| File | Changes |
|------|---------|
| `AGENTS.md` | Add library references |
| `packages/drizzle-sync/package.json` | Finalize version and exports |

## Implementation Outline

### Step 1: Create README Documentation

Create comprehensive documentation covering:
- Installation instructions
- Quick start examples for frontend and backend
- API reference for all entrypoints
- Architecture diagram
- Migration guide from Avileo sync

### Step 2: Create CHANGELOG

Document initial release with:
- Added features (core types, PGlite adapters, server engine)
- Breaking changes (none for initial release)
- Migration notes

### Step 3: Run Performance Benchmarks

```bash
# Benchmark enqueue latency
cd packages/drizzle-sync && bun run benchmark:enqueue

# Benchmark batch processing
cd packages/drizzle-sync && bun run benchmark:batch

# Benchmark pull service
cd packages/drizzle-sync && bun run benchmark:pull
```

### Step 4: Run E2E Tests

```bash
# Frontend E2E tests
cd packages/app && bun run test:e2e

# Backend E2E tests
cd packages/backend && bun run test:e2e
```

### Step 5: Update AGENTS.md

Add library references to project documentation:
- Add `@avileo/drizzle-sync` to package documentation map
- Update import patterns section
- Add library to skills section

### Step 6: Final Validation Checklist

- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] Performance benchmarks within 5% of baseline
- [ ] Documentation complete
- [ ] No deprecation warnings in production build
- [ ] Tree-shaking verified (bundle size analysis)
- [ ] TypeScript strict mode passes

### Step 7: Remove Deprecation Re-Exports

After all validation passes, remove the deprecated re-export files from Avileo:
- `packages/app/app/lib/sync/change-applier.ts`
- `packages/app/app/lib/sync/schema-mapper.ts`
- `packages/app/app/lib/sync/queue/pg-sync-queue.ts`
- `packages/app/app/lib/sync/sync-logger.ts`
- `packages/backend/src/services/sync/framework/SyncEngine.ts`
- `packages/backend/src/services/sync/framework/ConflictResolver.ts`
- `packages/backend/src/services/sync/handlers/BaseSyncHandler.ts`
- `packages/backend/src/services/sync/sync-logger.ts`

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Production issues after removal | Feature flag for library usage during rollout |
| Documentation drift | Generate API docs from TypeScript |
| Performance regression | Benchmark before/after extraction |
| Bundle size increase | Tree-shaking verification |

## Validation Criteria

- [ ] All E2E tests pass
- [ ] Performance benchmarks within 5% of baseline
- [ ] Documentation complete (README, CHANGELOG, API reference)
- [ ] No deprecation warnings in production build
- [ ] Tree-shaking verified (check bundle size)
- [ ] TypeScript strict mode passes
- [ ] AGENTS.md updated with library references
