# Sync Deferred Improvements Reassessment

## Current State Summary

The centralization effort completed the low-risk definition work that was originally planned. Canonical sync entity definitions now live in the shared package, frontend and backend priority/order assumptions were aligned to that shared layer, and the centralization work intentionally stopped short of changing core sync runtime behavior.

Shared definitions now exist for the canonical sync entity inventory, shared processing priorities, and the main entity subsets used by the current sync implementation. This removed drift across frontend and backend code paths where the same sync metadata had previously been maintained in multiple places.

Some sync concerns remain decentralized by design. Conflict resolution policy is still backend-owned through `ConflictResolverRegistry`, pull/apply table safety remains locally controlled in `schema-mapper.ts`, and handler registration is still manual rather than schema-generated.

## Potential Future Improvements

### 1. Conflict Policy Centralization

- **Current:** `ConflictResolverRegistry` is backend-only.
- **Potential:** Move per-entity conflict strategy into shared configuration so the policy is documented in one canonical place.
- **Assessment:** This was correctly deferred. Conflict handling affects runtime behavior directly, so centralizing it is not just a metadata cleanup.
- **Risk:** High implementation sensitivity. Any change here can alter conflict outcomes and would require careful regression testing across existing sync flows.

### 2. Pull Table Configuration

- **Current:** `schema-mapper.ts` maintains its own `VALID_TABLES` allowlist.
- **Potential:** Derive the canonical portion from shared config while keeping a local safety layer for pull/apply protection.
- **Assessment:** This was also correctly deferred. The current separation preserves a clear safety boundary for local pull application.
- **Risk:** Medium. The main concern is preserving pull/apply safety guarantees and avoiding accidental expansion of writable tables.

### 3. Schema-Driven Generator

- **Current:** Handler registration remains manual.
- **Potential:** Generate handlers and related wiring from schema definitions, as described in `docs/new-sync/FRAMEWORK.md`.
- **Assessment:** This remains a future architectural option, not a follow-up tweak to the completed centralization work.
- **Risk:** High. This is a large architectural change that would need its own discovery, design, migration strategy, and verification plan.

## Recommendations by Priority

- **High:** None. The planned centralization work is complete, and there is no high-priority follow-up required from this reassessment.
- **Medium:** Improve conflict policy documentation first, without changing runtime behavior. This gives better visibility into the current backend-only model while avoiding unnecessary churn.
- **Low:** Treat the schema-driven generator as a dedicated future project rather than an incremental continuation of the current effort.

## Next Steps

- Monitor for entity drift as new syncable entities are added.
- Document shared-vs-local sync definitions whenever a new entity is introduced.
- Revisit conflict policy centralization only if real maintenance pain or repeated drift justifies the added testing cost.
