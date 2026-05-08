# T-005 Water Delivery Execution

## Objective

Let repartidores complete water route stops and record what actually happened at each delivery.

## Requirements Covered

- `FR-006`
- `FR-007`
- `FR-008`
- `NFR-001`

## Dependencies

- `T-004`

## Files or Areas Involved

- `packages/app/app/routes/_protected.mi-distribucion.tsx` - Modify - Show water route stop workflow.
- `packages/app/app/components/visitas/` - Modify/Create - Add water delivery dialog/card.
- `packages/app/app/components/sales/new-sale/` - Review/Modify - Reuse sale/payment capture for bidon delivery where appropriate.
- `packages/backend/src/services/business/` - Modify/Create - Complete water stop and write sale/container/deposit effects transactionally.

## Actions

1. Show each water stop with customer name, address, delivery instructions, expected bidons, container balance, and deposit warning.
2. Add completion UI for delivered bidons, empty containers collected, damaged/lost containers, sale/payment mode, and notes.
3. On completion, create or update the sale/payment record as needed.
4. Write container ledger entries for delivered, collected, damaged, lost, or adjusted containers.
5. Update cached aggregate container balance on the water customer profile inside the same transaction.
6. Support non-delivery outcomes such as no atendido, reprogramado, and cancelado with reasons.
7. Make the UI fast for mobile route work: large touch targets, clear primary action, no polleria kg/tara language.

## Completion Criteria

- A repartidor can complete a route stop from mobile.
- Container balances change only through ledger-producing actions.
- Delivery status is visible after completion.
- Sales/cobros behavior remains consistent with existing payment rules.

## Validation

- Backend tests for transactional stop completion and ledger effects.
- Browser QA for delivered, no attended, and damaged/lost scenarios.
- Verify route list updates without page refresh issues.

## Risks or Notes

- Avoid coupling container ledger logic directly to UI-only calculations. Backend service should own the final balance update.
