# Seed Import

Target import model for the JUAVIK mission.

---

## Target Account
- Import into the existing `cliente1@gmail.com` account/business only
- Reuse the existing `--client1` seed path in `packages/backend/src/seed/index.ts`

## Import Input
- One consolidated JSON file under `data-avileo/consolidated/`
- This file is the single import input for notebook-derived data

## Required Imported Entities
- customers
- products
- productVariants
- sales
- payments (`abonos`)

## Debt Handling
- The consolidated dataset includes an explicit debt snapshot for audit and verification
- Avileo runtime debt remains derived from credit sales minus payments
- Post-import validation must compare imported balances with the explicit consolidated debt snapshot

## Rerun Behavior
- The import path must be executable in a bounded, observable way
- Either reruns are idempotent or they must be explicitly guarded so duplication is not silent
- The implemented rerun rule must be documented in code/tests and validated during the mission
