# Polleria

`businessMode: "polleria"`

Polleria es el vertical base de Avileo. Cubre la venta de pollo por peso, normalmente con vendedores que salen a ruta, reciben una distribucion diaria, venden al contado o credito y cierran la jornada reportando kilos vendidos/devueltos.

## Para que sirve

- Reemplazar el cuaderno de ventas, cuentas por cobrar y distribucion diaria.
- Registrar ventas por peso con tara y kilos netos.
- Llevar deuda de clientes y abonos parciales.
- Controlar vendedores, puntos de venta, visitas y cierre de jornada.
- Trabajar offline-first en campo y sincronizar cuando vuelva la conexion.

## Documentos

- [Capacidades](./capacidades.md)
- [Flujos](./flujos.md)
- [QA](./qa.md)
- [Pendientes](./pendientes.md)

## Superficies principales

| Area | Rutas |
| --- | --- |
| Ventas | `/ventas`, `/ventas/:id`, `/ventas/:id/editar`, `/ventas/:id/editar/calculadora` |
| Distribucion | `/distribuciones`, `/distribuciones/nueva`, `/distribuciones/:id/editar`, `/mi-distribucion` |
| Clientes y cobranza | `/clientes`, `/clientes/nuevo`, `/clientes/:id`, `/cobros`, `/cobros/nuevo` |
| Productos | `/productos`, `/productos/nuevo`, `/productos/:id` |
| Operacion diaria | `/visitas` |
| Reportes | `/reportes`, `/reportes/cuentas-por-cobrar`, `/reportes/alertas-stock`, `/reportes/compras-sugeridas` |
| Configuracion | `/config`, `/config/puntos-venta`, `/config/payment-methods`, `/config/flags` |

## Estado actual

Implementado como vertical principal. Sus capacidades estan integradas en los flujos compartidos de Avileo y son el punto de referencia para ventas, distribucion, clientes, credito, abonos y offline-first.
