# T-003 Customer Profile UI

## Objective

Update customer screens so agua businesses can capture and view operational profile data, while polleria remains unchanged.

## Requirements Covered

- `FR-002`
- `FR-003`
- `FR-004`
- `NFR-001`
- `NFR-002`
- `NFR-003`

## Dependencies

- `T-002`

## Files or Areas Involved

- `packages/app/app/components/customers/customer-form-content.tsx` - Modify - Add water profile section behind business mode.
- `packages/app/app/routes/_protected.clientes.nuevo.tsx` - Modify - Submit base customer plus profile.
- `packages/app/app/routes/_protected.clientes.$id.edit.tsx` - Modify - Load and edit water profile.
- `packages/app/app/routes/_protected.clientes._index.tsx` and customer card components - Modify - Show water summaries for agua.
- `packages/app/app/routes/_protected.clientes.$id._index.tsx` - Modify - Show operational water profile details.
- `packages/app/app/hooks/use-customers.ts` - Modify - Support typed water profile payloads/responses.

## Actions

1. Add form schema fields for frequency, delivery days, default bidon quantity, route/zone, deposit status, and delivery instructions.
2. Render water fields only when `useBusinessMode().mode === "agua"`.
3. Group water fields under a compact mobile-first section titled around delivery setup, not generic "extra fields".
4. Submit water profile data as `waterProfile`, not as unstructured custom fields.
5. On customer list cards for agua, show the next delivery day, default bidon quantity, and container/deposit signal.
6. On customer detail for agua, show current container balance, deposit status, schedule, route/zone, and instructions.
7. Keep polleria screens visually and behaviorally unchanged.

## Completion Criteria

- Agua customer create/edit screens capture all required profile fields.
- Polleria customer create/edit screens do not show water fields.
- Customer detail explains why the fields exist by making schedule, envases, and deposits visible.
- Mobile layout has no overlapping fields or hidden CTA.

## Validation

- Run app unit/integration tests around customers.
- Manual QA at 390x844 and 320px width.
- Browser QA: create and edit one polleria customer and one agua customer.

## Risks or Notes

- Avoid making the form feel like a spreadsheet. Use grouped controls, chips for delivery days, and short helper text only where it prevents mistakes.
