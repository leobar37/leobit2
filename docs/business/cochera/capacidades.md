# Capacidades de Cochera

## Flags funcionales

Fuente: `packages/shared/src/business-modes/defaults.ts`.

| Flag | Valor | Significado |
| --- | --- | --- |
| `useTara` | `false` | No usa peso ni tara. |
| `useNetWeight` | `false` | No calcula kilos netos. |
| `useContainers` | `false` | No usa envases. |
| `useDeposits` | `false` | No usa depositos de envases. |
| `useSubscriptions` | `false` | Suscripciones de clientes no son parte del flujo base. |
| `useFrequency` | `false` | No hay frecuencia recurrente. |
| `defaultUnit` | `unidad` | Unidad generica; la operacion real se basa en sesiones. |
| `suggestedProducts` | `[]` | No depende del catalogo de productos para operar. |
| `closeFields` | `[]` | No usa cierre de distribucion. |
| `saleCalculatorTitle` | `Nueva Venta` | No es el centro del flujo; el checkout usa cobro de sesion. |
| `showVisitStatus` | `false` | No usa visitas de ruta. |
| `supportsCreditSettlement` | `true` | Puede registrar deuda/pago de cochera segun flujo dedicado. |
| `supportsPartialSettlement` | `true` | Pagos parciales existen en el dominio dedicado de cochera. |

## Capacidades actuales

| Capacidad | Estado | Notas |
| --- | --- | --- |
| Registro de entrada | Implementado | Crea sesion activa por placa. |
| Lista de vehiculos activos | Implementado | Muestra ocupacion actual y permite buscar/cobrar. |
| Prevencion de placa duplicada activa | Implementado | No debe existir mas de una sesion activa por placa y negocio. |
| Cobro de salida | Implementado | Calcula monto segun configuracion. |
| Tarifas y gracia | Implementado | Configurables en `/config/cochera`. |
| Tarifa por tipo de vehiculo | Implementado | Cada tipo puede usar tarifa propia o caer a la tarifa global. |
| Metodos de pago | Implementado | Configurados para el checkout de cochera. |
| Dashboard | Implementado | Usa `/dashboard` con KPIs de cochera. |
| Reportes | Implementado | Usa `/reportes` con datos de cochera. |
| Clientes/vehiculos | Parcial / dedicado | Usa superficies propias cuando se asocia cliente o vehiculo. |
| Offline-first | No aplica en fase actual | Cochera es online-only. |

## Limites funcionales

- No debe reutilizar el flujo de ventas de polleria para representar sesiones.
- No debe mezclar deudas de cochera con `/cobros` de polleria salvo que exista puente explicito.
- No debe crear rutas duplicadas como `/cochera/dashboard` o `/cochera/reportes`; se usan superficies compartidas.
- No hay integracion con barreras, camaras o reconocimiento de placa.
- Las tarifas por horario, evento o fin de semana no forman parte del motor actual.
