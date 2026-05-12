# Capacidades de Agua

## Flags funcionales

Fuente: `packages/shared/src/business-modes/defaults.ts`.

| Flag | Valor | Significado |
| --- | --- | --- |
| `useTara` | `false` | No usa peso ni tara. |
| `useNetWeight` | `false` | No calcula kilos netos. |
| `useContainers` | `false` | Envases retornables no son capacidad base actual. |
| `useDeposits` | `false` | Depositos de garantia no son capacidad base actual. |
| `useSubscriptions` | `true` | El cliente puede tener comportamiento recurrente/suscripcion conceptual. |
| `useFrequency` | `false` | No hay frecuencia recurrente automatizada en el default actual. |
| `customCustomerFields` | `defaultOrderQuantity` | Cliente puede guardar cantidad sugerida de pedido. |
| `defaultUnit` | `unidad` | Unidad principal de venta. |
| `closeFields` | `entregado` | Cierre enfocado en unidades entregadas. |
| `saleCalculatorTitle` | `Entrega de Agua` | Titulo funcional de la venta. |
| `showVisitStatus` | `true` | Las visitas siguen siendo utiles para reparto. |
| `supportsCreditSettlement` | `false` | El flujo principal es pago contra entrega. |
| `supportsPartialSettlement` | `false` | No soporta abonos parciales por defecto. |

## Productos sugeridos

- Producto: `Bidon`
  - Variantes: `20L`, `10L`
- Producto: `Recarga`
  - Variantes: `20L`, `10L`

## Capacidades actuales

| Capacidad | Estado | Notas |
| --- | --- | --- |
| Venta por unidad | Implementado | Bidones/recargas se venden como unidades. |
| Pago contra entrega | Implementado como regla funcional | No se prioriza credito ni pagos parciales. |
| Clientes recurrentes | Parcial | Existe campo de cantidad sugerida; falta recurrencia completa. |
| Rutas/visitas | Parcial | Reusa superficies de distribucion y visitas donde aplica. |
| Productos sugeridos | Implementado | Defaults proponen bidones y recargas. |
| Reportes compartidos | Parcial | Depende de la cobertura de reportes generales. |
| Envases retornables | Pendiente | No forma parte del flujo base actual. |
| Depositos de garantia | Pendiente | No forma parte del flujo base actual. |
| Frecuencia automatica | Pendiente | `useFrequency` esta desactivado. |

## Limites funcionales

- No se rastrea cada envase por numero de serie.
- No se administra un libro de depositos.
- No se auto-generan visitas por frecuencia semanal/quincenal.
- No hay flujo completo de baja de cliente con devolucion de envases.
- La cobranza compartida no debe tratar agua como polleria si el modo no soporta liquidacion parcial.
