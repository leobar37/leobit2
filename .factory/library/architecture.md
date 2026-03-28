# Architecture

Mission-specific architecture for the JUAVIK notebook-to-seed flow.

---

## System Overview

This mission adds a data-preparation pipeline in front of Avileo's existing client seed flow:

1. **Source notebook images** — handwritten sheets in `data-avileo/JUAVIK/`
2. **Canonical per-sheet extraction JSON** — one structured artifact per source image in `data-avileo/extractions/JUAVIK/canonical/`
3. **Consolidated JUAVIK seed JSON** — one business-ready dataset combining all sheets, normalization decisions, flags, and debt snapshot data
4. **Client1 seed import path** — backend seed/import logic that loads the consolidated dataset into the existing `cliente1@gmail.com` business context
5. **Post-import verification** — backend/database checks that imported balances and entity relationships match the consolidated dataset

## Existing Avileo Target Model

Relevant existing backend entities:
- `customers` — business-scoped customer records
- `sales` + `sale_items` — require business/customer/seller/product/variant relationships; debt is represented through `saleType`, `amountPaid`, and `balanceDue`
- `abonos` — business-scoped payments associated to customers (and optionally related sales)
- Existing balance/debt logic is derived from credit sales minus payments via repository/service logic; there is no dedicated persistent debts table

Existing seed path:
- `packages/backend/src/seed/index.ts` already supports `--client1`
- `packages/backend/src/seed/client1-data.ts` currently provides a static seed scaffold for `cliente1@gmail.com`
- The mission extends this path rather than inventing a different import surface

## Canonical Extraction Model

Canonical sheet extraction is the first durable representation of notebook data.

Rules:
- One canonical JSON per source image
- Preserve raw evidence (`rawLineText`, per-line entries, markers, notes)
- Represent page complexity with blocks and date metadata rather than flattening everything into one list
- Use `reviewFlags` and confidence values to expose ambiguity
- Existing pilot `pass-1` / `pass-2` files are reference material only; canonical extraction is the mission source of truth

## Consolidated Dataset Model

The consolidated JUAVIK JSON is the bridge between notebook interpretation and executable import.

Required sections:
- `customers`
- `products`
- `productVariants`
- `sales`
- `payments`
- `debtsSnapshot` (or equivalent explicit per-customer debt audit section)
- `review` / `sourceTrace` metadata

Invariants:
- Every imported customer/product/variant keeps source references back to canonical extraction evidence
- Best-effort records remain flagged
- Debt snapshot is derived from consolidated credit sales minus consolidated payments
- Consolidated JSON is the single import input for the backend seed path

## Identity and Normalization Rules

### Customers
- Normalize repeated names across sheets, but keep source trace references
- Do not lose raw spellings or ambiguous variants
- Best-effort matching is allowed only if the final consolidated record remains auditable

### Products and Variants
- Prefer reusing the existing `cliente1` catalog when possible
- Create missing products/variants when notebook evidence requires them
- Variant creation is part of the importable seed outcome, not a manual post-step

## Debt Semantics

- Notebook debt-related hints (`NP`, `xy`, `yapeo`, `pago anterior`, `actual`, carry-over notes) first become extraction semantics
- Consolidation decides whether they become credit sales, confirmed payments, contextual notes, or flagged best-effort records
- Imported Avileo debt remains computed from credit sales and payments, while the consolidated debt snapshot acts as the verification baseline

## Validation Surface

This mission validates the backend/data pipeline only:
- artifact inspection for canonical and consolidated JSON outputs
- backend tests for transformation/import logic
- executable seed/import runtime for `cliente1@gmail.com`
- post-import balance checks using existing backend debt logic

Frontend/browser validation is intentionally deferred for this mission.
