# User Testing

Testing surface, validation readiness, and concurrency guidance for the JUAVIK notebook-to-seed mission.

---

## Validation Surface

This mission uses backend/data validation only.

### Included surfaces
- Canonical extraction artifact inspection (`python3`, file checks, source-image spot checks)
- Consolidated dataset verification (`python3`, targeted tests)
- Backend seed/import runtime for `cliente1@gmail.com`
- Post-import backend/database verification for customers, sales, payments, and balances/debts

### Excluded / deferred surfaces
- Browser/UI validation of imported notebook data
- Frontend route validation for `Cuentas por Cobrar`

Reason: the current local frontend runtime points to a different backend environment, and the user explicitly approved backend/DB/seed validation only for this mission.

## Validation Readiness Dry Run

Observed during dry run:
- Backend successfully started on `3100`
- `curl http://127.0.0.1:3100/health` returned healthy
- Frontend successfully started on `5173`
- Frontend navigation worked, but runtime requests still pointed to another backend (`100.123.96.35:5201`), so it is not an authoritative validation surface for this mission
- Existing repo commands for backend tests and seed scripts are present

## Validation Concurrency

Machine observations:
- 24 GB total RAM
- 12 CPU cores
- Multiple other dev servers/processes already active
- Dry-run memory headroom looked constrained, so use conservative execution

Mission guidance:
- Max concurrent heavy validators: **1**
- Max concurrent seed/runtime checks: **1**
- Do not run multiple destructive or stateful import validations in parallel

## Preferred Validation Sequence

1. Validate canonical extraction JSON structure and counts
2. Validate consolidated JSON structure and debt consistency
3. Run targeted backend tests for seed/import logic
4. Execute the approved import path for `cliente1@gmail.com`
5. Verify imported counts and balances against the consolidated debt snapshot
