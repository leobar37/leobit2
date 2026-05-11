# F-005 Entrega Como Venta Inventario

## Objective

Convertir la entrega de agua en una transacción operacional completa: al marcar bidones entregados, se debe registrar una venta al contado pagada totalmente, asociarla a la visita, registrar método de pago y descontar inventario del producto/variante vendido.

## Scope Boundaries

- In scope: completar stop, crear/confirmar venta, sale items, pago total, selección o default de producto/variante, descuento de inventario, asociación visita-venta.
- Out of scope: depósitos/envases retornables, deuda parcial, reportes agregados, sync final.

## Verified Context

- `packages/backend/src/services/business/visita.service.ts` contiene `completeWaterDelivery` pero no crea ventas.
- `packages/backend/src/services/business/sale.service.ts` crea ventas y actualiza visita cuando recibe `visitaId`.
- `packages/backend/src/services/repository/product-variant.repository.ts` maneja inventario de variantes.
- `packages/app/app/routes/_protected.mi-distribucion.tsx` permite ingresar bidones entregados y completar stop.
- `packages/app/app/hooks/use-visitas.ts` llama `api.visitas({ id }).water.complete.post`.

## Assumptions

- La entrega debe ser pago total (`pago_total`, `contado`) porque `F-002` lo garantiza.
- El producto/variante vendido debe ser editable por admin y no hardcodeado a un seed fijo.
- El descuento de inventario debe preservar reglas existentes de productos/variantes.
- Completed dependency output from `F-002`: backend now rejects `credito`, `a_cuenta`, `debe_todo`, and incomplete `pago_total` for `ctx.businessMode === "agua"`; delivery-created sales should use `contado` + `pago_total` + full `amountPaid`.
- Completed dependency output from `F-004`: route generation creates distribucion, visitas and waterDeliveryStops transactionally; duplicate distribucion per vendedor/fecha is guarded; seed water has compatible day keys and a repartidor demo.

## Unknowns

- Resuelto durante ejecución: el repartidor selecciona explícitamente una variante en el stop; no se usa ID hardcodeado ni configuración default de seed.
- Resuelto durante ejecución: primera versión captura método de pago; referencias/comprobantes digitales quedan fuera de esta feature.

## Likely Files or Areas Involved

- `packages/backend/src/services/business/visita.service.ts` - Modify - Orquestar entrega → venta → inventario.
- `packages/backend/src/services/business/sale.service.ts` - Review | Modify - Reuso para ventas desde visita.
- `packages/backend/src/services/repository/water-customer-profile.repository.ts` - Review | Modify - Stop data necesaria.
- `packages/backend/src/api/visitas.ts` - Modify - Contrato de completar entrega con pago/producto.
- `packages/app/app/routes/_protected.mi-distribucion.tsx` - Modify - UI de cantidad, producto y pago total.
- `packages/app/app/hooks/use-visitas.ts` - Modify - Payload/response de entrega.
- `packages/app/app/hooks/use-products*.ts` - Review - Selección de productos de agua.
- `packages/backend/src/services/repository/product-variant.repository.ts` - Review | Modify - Ajuste inventario.

## Feature Dependencies

- Depends on: `F-002`, `F-004`
- Blocks: `F-006`, `F-007`, `F-008`

## Human-Owned Tracking Fields

- Status: done
- Owner: unassigned
- Decision Notes: F-005 implementó entrega transaccional de agua: `completeWaterDelivery` crea venta activa contado/pago_total con `amountPaid = totalAmount`, crea `sale_item` para la variante seleccionada, descuenta inventario y asocia `saleId` a la visita. Frontend exige seleccionar variante y método de pago. Se preservan visitas normales/pollería; no_atendido/reprogramado no crean venta. Tests/build focalizados pasaron; no existe test dedicado de `VisitaService.completeWaterDelivery` todavía.
- Manual Overrides: none

## Parallelization Notes

- Parallelizable: no
- Reason: Es el núcleo transaccional y toca ventas, visitas, inventario y UI operacional.

## Worktree Recommendation

- Recommended: no
- Suggested branch: `feature/agua-operativo-entrega-venta`
- Suggested worktree path: `../wt-agua-operativo-entrega-venta`

## Suggested `/plan` Mode

- Mode: `structured`
- Rationale: Feature cross-domain de alto acoplamiento y alto riesgo.

## Suggested Next Command

- `/plan .plans/agua-operativo-overview/features/F-005-entrega-como-venta-inventario.md`
