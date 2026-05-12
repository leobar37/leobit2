# Capacidades de Polleria

## Flags funcionales

Fuente: `packages/shared/src/business-modes/defaults.ts`.

| Flag | Valor | Significado |
| --- | --- | --- |
| `useTara` | `true` | La venta resta tara al peso bruto. |
| `useNetWeight` | `true` | La venta calcula kilos netos. |
| `useContainers` | `false` | No hay envases retornables como capacidad base. |
| `useDeposits` | `false` | No hay depositos de garantia por envase. |
| `useSubscriptions` | `false` | No usa suscripciones como flujo base. |
| `useFrequency` | `false` | No usa frecuencia recurrente automatica. |
| `defaultUnit` | `kg` | Unidad principal de venta. |
| `closeFields` | `llevado`, `vendido`, `devuelto` | Campos esperados en cierre de distribucion. |
| `saleCalculatorTitle` | `Venta de Pollo` | Titulo funcional de la calculadora. |
| `showVisitStatus` | `true` | Las visitas tienen estado operativo. |
| `supportsCreditSettlement` | `true` | Soporta venta a credito. |
| `supportsPartialSettlement` | `true` | Soporta abonos parciales. |

## Productos sugeridos

- Producto: `Pollo`
- Variantes: `Entero`, `1/2`, `1/4`
- Unidad base: kilos.

## Capacidades actuales

| Capacidad | Estado | Notas |
| --- | --- | --- |
| Venta por peso | Implementado | Usa peso bruto, tara y peso neto. |
| Venta al contado | Implementado | Se registra como venta pagada. |
| Venta a credito | Implementado | Genera saldo pendiente para el cliente. |
| Abonos parciales | Implementado | El cliente puede pagar deuda en partes. |
| Venta sin cliente | Implementado | Permite ventas ocasionales sin `customerId`. |
| Clientes recurrentes | Implementado | Usado para credito, visitas y cobranza. |
| Distribucion diaria | Implementado | Admin asigna productos/kilos a vendedor. |
| Mi distribucion | Implementado | Vendedor ve lo asignado para la jornada. |
| Visitas | Implementado | Permiten organizar ruta y resultado de parada. |
| Cierre de jornada | Implementado | Registra llevado, vendido y devuelto. |
| Gastos de ruta | Implementado | Se descuentan de la recaudacion operativa. |
| Productos y variantes | Implementado | Modela cortes y presentaciones. |
| Reportes | Implementado | Ventas, cobranza, stock y actividad segun superficie. |
| Offline-first | Implementado | Flujo pensado para funcionar en campo y sincronizar despues. |

## Limites funcionales

- El precio fluctua manualmente; no hay integracion automatica con mercado mayorista.
- El cierre diario depende de que el vendedor/admin registre correctamente lo devuelto.
- Las ventas sin sincronizar dependen del dispositivo hasta que vuelvan a subir.
- No se modelan lotes sanitarios, vencimientos por pieza ni trazabilidad avanzada.
