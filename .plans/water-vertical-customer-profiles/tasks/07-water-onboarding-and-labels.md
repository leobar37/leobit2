# T-007 Water Onboarding And Labels

## Objective

Make agua mode feel coherent from onboarding through daily workflows by replacing polleria defaults, seed data, and labels where business mode requires it.

## Requirements Covered

- `FR-010`
- `FR-011`
- `NFR-002`

## Dependencies

- `T-002`

## Files or Areas Involved

- `packages/backend/src/services/business/business.service.ts` - Modify - Seed demo data by `businessMode`.
- `packages/app/app/routes/_protected.onboarding.data.tsx` - Modify - Show water-specific seed descriptions.
- `packages/app/app/components/sales/calculator/` - Modify - Use mode-aware labels for unidad/bidones and hide polleria-only wording.
- `packages/app/app/components/distribucion/` and `packages/app/app/components/dashboard/` - Modify - Replace labels conditionally by mode.
- `packages/shared/src/business-modes/defaults.ts` - Modify - Add label metadata if existing flags are too narrow.

## Actions

1. Update demo seed behavior so agua creates water products such as Bidon 20L and Bidon 10L instead of polleria products.
2. Update onboarding copy to describe water products, routes, customers recurrentes, and envases.
3. Add or extend mode label config for terms like product unit label, route actor, distribution noun, visit action, and calculator title.
4. Apply labels in sales calculator, cart, distribution creation, route screen, customer cards, and dashboard.
5. Ensure `useTara` and `useNetWeight` hide polleria weight concepts completely in agua.

## Completion Criteria

- New agua businesses do not receive polleria seed products.
- Main agua screens do not show kg/tara/polleria-specific wording.
- Polleria wording remains unchanged.
- Suggested products from business mode defaults are actually used or replaced by a clearer seed abstraction.

## Validation

- Unit tests or integration tests for seed data by business mode.
- Browser QA from registration through onboarding for both polleria and agua.
- Visual QA in light and dark mode for affected screens.

## Risks or Notes

- Label config should stay focused. Do not build a full dynamic translation engine unless future verticals require it.
