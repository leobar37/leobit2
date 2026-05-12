# Negocios en Avileo

Esta carpeta es la fuente de verdad funcional para los tipos de negocio soportados por Avileo. Su objetivo es responder rapido:

- Que puede hacer cada negocio hoy.
- Que rutas y superficies usa.
- Que capacidades son compartidas y cuales son especificas.
- Que queda pendiente antes de escalar el vertical.

La llave canonica para cada negocio es `businessMode`. Antes de cambiar flujos por negocio, tambien se debe leer [`../../contract.md`](../../contract.md).

## Negocios actuales

| `businessMode` | Negocio | Estado funcional | Documentacion |
| --- | --- | --- | --- |
| `polleria` | Polleria / venta de pollo | Implementado | [polleria](./polleria/README.md) |
| `agua` | Distribucion de agua | Parcial / operativo basico | [agua](./agua/README.md) |
| `cochera` | Cochera / estacionamiento | Implementado online-only | [cochera](./cochera/README.md) |

## Matriz funcional

| Capacidad | Polleria | Agua | Cochera |
| --- | --- | --- | --- |
| Venta principal | Pollo por peso | Bidones y recargas por unidad | Cobro de salida por sesion |
| Clientes | Opcionales o recurrentes | Recurrentes con cantidad sugerida | Opcionales, asociados a vehiculos cuando aplica |
| Cobranza | Credito, abonos y pagos parciales | Pago contra entrega; sin liquidacion parcial por defecto | Deudas/pagos propios de cochera, aislados de polleria |
| Distribucion / rutas | Distribucion diaria, visitas y cierre | Reuso parcial de distribucion/visitas para entregas | No aplica |
| Inventario | Kilos asignados, vendidos y devueltos | Unidades entregadas | Ocupacion de espacios, no stock de productos |
| Reportes | Ventas, cuentas por cobrar, stock y actividad | Reportes compartidos donde aplique | Reportes de ingresos y sesiones de cochera |
| Configuracion | Productos, puntos de venta, metodos de pago, flags | Productos de agua y rutas de agua | Tarifas, gracia, espacios y metodos permitidos |
| Offline / sync | Offline-first | Hereda capacidades offline del flujo compartido | Online-only en la fase actual |
| Roles | Admin y vendedor | Admin y repartidor/vendedor | Admin y vendedor/operador |
| Rutas principales | `/ventas`, `/mi-distribucion`, `/visitas`, `/cobros` | `/ventas`, `/mi-distribucion`, `/clientes`, `/config/water-routes` | `/cochera`, `/cochera/entrada`, `/cochera/cobrar/:id`, `/config/cochera` |

## Estructura por negocio

Cada negocio debe mantener estos archivos:

```text
docs/business/{businessMode}/
├── README.md        # Resumen funcional y estado actual
├── capacidades.md  # Que puede hacer hoy, flags, rutas y limites
├── flujos.md       # Flujos operativos principales
├── qa.md           # Checklist manual minimo
└── pendientes.md   # Gaps, decisiones abiertas y mejoras futuras
```

## Reglas para agregar o actualizar negocios

1. Usar siempre el `businessMode` canonico definido en `packages/shared/src/business-modes/schema.ts`.
2. Reflejar los flags de `packages/shared/src/business-modes/defaults.ts` en `capacidades.md`.
3. Separar capacidades actuales de pendientes futuros.
4. Si una ruta o pantalla es compartida, documentar como se adapta por negocio en vez de duplicarla conceptualmente.
5. Si un flujo cambia el modelo mental del usuario, documentarlo como flujo especifico del negocio.
6. Mantener texto funcional en espanol y referencias tecnicas con nombres reales de rutas, flags y tablas.

## Fuentes de verdad relacionadas

- Contrato de decisiones por vertical: [`../../contract.md`](../../contract.md)
- Defaults de capacidades: `packages/shared/src/business-modes/defaults.ts`
- Schema de `businessMode`: `packages/shared/src/business-modes/schema.ts`
- Rutas frontend: `packages/app/app/routes`
- Guia QA de cocheras: [`../qa/avileo-cocheras-manual-testing.md`](../qa/avileo-cocheras-manual-testing.md)
