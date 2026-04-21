# Drizzle Sync Codegen (SDK + Hooks) Context

## Overview

This plan migrates Avileo frontend sync consumption to a two-layer generated architecture:

1. A pure local-first SDK layer (Prisma-style CRUD surface, no React dependency)
2. A React hooks layer built on top of that SDK with TanStack Query

The main goal is to stop generating remote-first hooks that call API routes directly, and instead generate offline-first frontend primitives that write to local PGlite and enqueue sync operations.

## Background

The current generator pipeline still emits `generated/hooks.ts` with Eden API calls (`api.*.get/post/put/delete`), while the app relies on manual service-based hooks (`use-sales.ts`, `use-customers.ts`, etc.) for local-first behavior. This creates duplicated data paths and prevents full migration to library-generated frontend infrastructure.

## Goal

At completion, generated artifacts provide:

- `sdk.ts`: entity-scoped local-first API (`findById`, `findByBusiness`, `create`, `update`, `delete`)
- `hooks.ts`: React hooks that consume SDK methods (not direct API calls)
- React provider/runtime wiring so app code can use generated hooks with implicit business scope
- Migration path from manual hooks/services to generated SDK + hooks, with complex domain flows (sales lifecycle) layered on top of generated primitives

## Verified Context

- `packages/drizzle-sync/src/config/generator.ts` still emits remote-first hooks through `generateHooksFile(...)`.
- `packages/drizzle-sync/src/config/generators/hooks-generator.ts` generates hooks with direct API calls via `api.<path>.*`.
- `packages/drizzle-sync/src/config/generators/local-first-hooks-generator.ts` exists and already generates local-first mutation factories, but is not used by the main generator pipeline and lacks complete query coverage.
- `packages/app/app/lib/sync/generated/hooks.ts` is currently remote-first and not the authoritative offline-first path.
- `packages/app/app/hooks/use-sales.ts` and other manual hooks use local services and remain the real production path.
- `packages/app/app/lib/sync/service-provider.tsx` still constructs app-local `SyncService`, `PullService`, `SyncCoordinator`, and service instances manually.

## Inferred Context

- The fastest path is to make generator output authoritative first (SDK + hooks), then progressively migrate manual hooks.
- Complex domain transitions (for example sales draft/confirm/finalize flows) should remain explicit composition logic on top of generated CRUD primitives, not baked into generator internals.
- Business scope must be implicit at SDK instance construction time; methods should not require passing tenant scope repeatedly.

## Unknowns

- Whether all current complex hooks can be fully replaced or if a subset should remain as domain wrappers permanently.
- Whether generated hook naming should preserve existing hook names for drop-in compatibility, or use a new namespace and migrate imports gradually.
- Whether backend sync schemas need compatibility windows for both nested parent payloads and separate child operations.

## Key Decisions

- Keep architecture split: pure SDK first, hooks second.
- Make business scope implicit in SDK context.
- Prefer basic generated APIs over complex generated business workflows.
- Keep codegen-driven offline-first behavior as default for generated frontend data access.

## Scope Boundaries

- In scope: generator pipeline, generated SDK/hooks contracts, React provider integration, phased hook migration, sync contract alignment for sales/sale_items, validation and rollout.
- Out of scope: redesigning backend business domains, replacing Drizzle/Zod stack, rewriting all sales business transitions into generated code, replacing TanStack Query.
