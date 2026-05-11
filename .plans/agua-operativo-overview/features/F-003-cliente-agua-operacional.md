# F-003 Cliente Agua Operacional

## Objective

Dejar el cliente de agua como perfil operacional simple para rutas: frecuencia, días, cantidad habitual, ruta/zona e instrucciones, sin exponer depósitos, envases prestados o deuda parcial en la experiencia base.

## Scope Boundaries

- In scope: formulario, detalle/lista de clientes, DTO/hook de cliente, validaciones de perfil water, copy Perú.
- Out of scope: generación de rutas, ventas automáticas, reportes, depósitos futuros.

## Verified Context

- `packages/app/app/components/customers/customer-form-content.tsx` ya captura frecuencia, días, cantidad habitual, ruta e instrucciones.
- `packages/app/app/routes/_protected.clientes.nuevo.tsx` y `...edit.tsx` envían `waterProfile` solo en agua.
- `packages/app/app/components/customers/customer-card.tsx` y detalle muestran resumen water.
- `packages/backend/src/services/business/customer.service.ts` crea/actualiza perfiles water transaccionalmente.
- `packages/backend/src/services/repository/water-customer-profile.repository.ts` persiste campos de perfil.

## Assumptions

- `containersAtCustomer`, `depositAmount` y `depositStatus` no deben ser editables por usuario en el flujo base.
- Los clientes pueden ser recurrentes sin una suscripción formal compleja.
- Completed dependency output from `F-001`: frontend input schema, create/edit payloads, service normalization and repository input now exclude container/deposit fields; response types may still expose DB columns for compatibility/future features.

## Unknowns

- Pendiente para `F-005`: si el perfil debe guardar un producto/variante default para futuras entregas o si se decide al completar entrega.

## Likely Files or Areas Involved

- `packages/app/app/components/customers/customer-form-content.tsx` - Modify - Perfil simple y copy.
- `packages/app/app/components/customers/customer-card.tsx` - Modify - Resumen agua sin campos confusos.
- `packages/app/app/routes/_protected.clientes.$id._index.tsx` - Modify - Detalle operacional.
- `packages/app/app/routes/_protected.clientes.nuevo.tsx` - Review | Modify - Payload inicial water.
- `packages/app/app/routes/_protected.clientes.$id.edit.tsx` - Review | Modify - Evitar resets incorrectos.
- `packages/app/app/hooks/use-customers.ts` - Review | Modify - Tipos water.
- `packages/backend/src/services/business/customer.service.ts` - Review | Modify - Normalización de perfil.
- `packages/backend/src/api/customers.ts` - Review | Modify - Contrato de waterProfile.

## Feature Dependencies

- Depends on: `F-001`
- Blocks: `F-004`, `F-008`

## Human-Owned Tracking Fields

- Status: done
- Owner: unassigned
- Decision Notes: F-003 removió campos container/deposit del contrato POST/PUT de clientes y mantuvo la UI de cliente agua centrada en frecuencia, días, cantidad habitual, ruta/zona e instrucciones. La respuesta puede seguir devolviendo columnas completas por compatibilidad, pero no se renderizan ni editan en el flujo base. Tests focalizados backend pasaron; suite app completa sigue bloqueada por fallas preexistentes de harness/config.
- Manual Overrides: none

## Parallelization Notes

- Parallelizable: yes
- Reason: Puede avanzar junto a `F-002` tras foundation, con baja superposición de archivos.

## Worktree Recommendation

- Recommended: yes
- Suggested branch: `feature/agua-operativo-cliente`
- Suggested worktree path: `../wt-agua-operativo-cliente`

## Suggested `/plan` Mode

- Mode: `structured`
- Rationale: Incluye UI, hooks, API y normalización backend.

## Suggested Next Command

- `/plan .plans/agua-operativo-overview/features/F-003-cliente-agua-operacional.md`
