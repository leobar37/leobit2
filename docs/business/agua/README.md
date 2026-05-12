# Distribucion de Agua

`businessMode: "agua"`

Agua representa negocios que reparten bidones y recargas a clientes recurrentes. En el estado actual, el flujo base se modela como venta/entrega por unidades, no como tracking obligatorio de envases retornables ni depositos de garantia.

## Para que sirve

- Registrar clientes recurrentes de reparto.
- Vender bidones y recargas por unidad.
- Usar una experiencia de venta adaptada a pago contra entrega.
- Reusar rutas, visitas y distribucion cuando aportan al reparto.
- Dejar preparado el camino para capacidades futuras como envases retornables.

## Documentos

- [Capacidades](./capacidades.md)
- [Flujos](./flujos.md)
- [QA](./qa.md)
- [Pendientes](./pendientes.md)

## Superficies principales

| Area | Rutas |
| --- | --- |
| Ventas | `/ventas`, `/ventas/:id`, `/ventas/:id/editar` |
| Entrega / ruta | `/mi-distribucion`, `/visitas`, `/distribuciones` |
| Clientes | `/clientes`, `/clientes/nuevo`, `/clientes/:id` |
| Productos | `/productos`, `/productos/nuevo`, `/productos/:id` |
| Configuracion | `/config`, `/config/water-routes`, `/config/payment-methods`, `/config/flags` |
| Reportes | `/dashboard`, `/reportes` |

## Estado actual

Parcial y operativo para ventas/entregas por unidad. Tiene `businessMode` y defaults propios, pero varias capacidades tipicas del negocio de agua siguen como pendientes: envases retornables, depositos, frecuencia real de reparto y motor de suscripcion/recurrencia.
