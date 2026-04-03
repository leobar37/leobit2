# Requirements: Simplify Inventory - Remove Modes

## Overview
Eliminate the over-engineered multi-mode inventory system and consolidate into a single, predictable flow where stock management is separate from distribution tracking.

## Problem Statement
The current system has two overlapping mode systems creating a matrix of 12+ combinations:
- Business operation modes (4): inventario_propio, sin_inventario, pedidos, mixto
- Distribution modes (3): estricto, acumulativo, libre

This results in:
- Hidden UI selectors (hardcoded to "libre")
- ~300-500 lines of dead code for unused modes
- Impossible to reason about all edge cases
- High cognitive load for developers

## Functional Requirements

### FR-001: Single Distribution Flow
**Description:** All distributions shall follow a single "libre" flow without modes.
**Acceptance Criteria:**
- No mode selection in creation forms
- No mode validation in business logic
- All distributions behave consistently

### FR-002: Separate Stock Management
**Description:** Stock tracking shall be independent of distribution lifecycle.
**Acceptance Criteria:**
- No stock reservation on distribution creation
- No stock return on distribution close
- Stock managed only through direct admin adjustments
- Single source of truth: `variant_inventory` table

### FR-003: Close-Time Registration
**Description:** Vendors shall register products only when closing distributions.
**Acceptance Criteria:**
- New table `distribucion_cierre_items` stores close-time data
- Vendors input: cantidadLlevada, cantidadVendida, cantidadDevuelta
- System calculates: montoVentas, variances

### FR-004: Simplified Sale Validation
**Description:** Sales shall not validate stock based on distribution mode.
**Acceptance Criteria:**
- Remove `validarStockEstricto()` logic
- Remove modo-based validation bypasses
- Sales reference products directly

### FR-005: Data Migration
**Description:** Existing distributions shall be migrated seamlessly.
**Acceptance Criteria:**
- All existing distributions treated as "libre" mode
- No data loss during migration
- Backward compatibility during transition period

## Non-Functional Requirements

### NFR-001: Code Reduction
**Target:** Remove 60%+ of inventory-related code
**Metrics:**
- Before: ~800-1000 lines (modes + validations + hooks)
- After: ~300-400 lines (single flow)

### NFR-002: Test Coverage
**Requirement:** Maintain or improve test coverage
**Criteria:**
- All existing tests pass or are updated
- New tests for cierre flow
- Integration tests for complete workflow

### NFR-003: Offline-First Compatibility
**Requirement:** Changes must work with offline-first architecture
**Criteria:**
- Sync schemas updated
- Client-side schema versioned
- Conflict resolution handles mode-less distributions

### NFR-004: Zero Downtime Migration
**Requirement:** Deploy without service interruption
**Strategy:**
- Database migrations are backward compatible
- Feature flags for gradual rollout (if needed)
- Rollback plan documented

## Out of Scope

- Changes to product/variant definitions
- Changes to customer management
- Changes to payment processing
- New reporting features (beyond close-time data)
- Mobile app push notifications

## Success Criteria

1. All mode references removed from codebase
2. All tests passing
3. Manual QA confirms single flow works end-to-end
4. No regression in sales creation/tracking
5. Stock management simplified in admin UI

## Related Documentation

- Tutorial: `docs/tutorials/simplified-inventory-proposal/index.html`
- Analysis: `/analyze` command output (inventory management)
