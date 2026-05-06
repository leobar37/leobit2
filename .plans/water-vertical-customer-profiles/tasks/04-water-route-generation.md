# T-004 Water Route Generation

## Objective

Allow agua businesses to create a daily delivery route from customer profile schedules instead of manually selecting every customer from scratch.

## Requirements Covered

- `FR-005`

## Dependencies

- `T-002`

## Files or Areas Involved

- `packages/backend/src/db/schema/visitas.ts` and distribution schema - Review/Modify - Decide whether existing distribution/visit tables can represent water stops or need water-specific extension tables.
- `packages/backend/src/services/business/visita.service.ts` - Modify/Create - Generate visits from water customer profiles.
- `packages/app/app/routes/_protected.distribuciones.nueva._index.tsx` - Modify - Add water route creation experience.
- `packages/app/app/components/distribucion/` - Modify - Replace manual polleria-oriented labels/inputs where agua mode is active.

## Actions

1. Add a water route generation service that accepts date, optional route/zone, and optional preview mode.
2. Query `water_customer_profiles` where delivery schedule matches the selected date and business.
3. Prevent duplicate visits/stops for the same customer/date/route unless explicitly confirmed.
4. Create or adapt distribution/visit records with expected bidon quantity and delivery metadata.
5. Add frontend flow: select date, route/zone, preview customers, then create route.
6. Use water labels: ruta, repartidor, clientes programados, bidones esperados.
7. Keep existing manual distribution creation available for polleria.

## Completion Criteria

- Agua users can generate a route from scheduled customers.
- Duplicate generation is prevented or clearly handled.
- Generated stops are visible in the daily route screen.
- Polleria distribution flow remains intact.

## Validation

- Service tests for day matching, route filtering, duplicate prevention, and tenant isolation.
- Browser QA with customers assigned to different delivery days.

## Risks or Notes

- If existing `visitas` cannot safely store water-specific stop expectations, add a small water stop extension table rather than overloading generic status fields.
