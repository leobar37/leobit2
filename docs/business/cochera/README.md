# Cochera

`businessMode: "cochera"`

Cochera representa negocios pequenos de estacionamiento que necesitan registrar entradas, ver vehiculos activos, cobrar salidas y revisar ingresos. A diferencia de polleria y agua, el flujo actual de cochera es online-only y usa entidades dedicadas para sesiones, configuracion y pagos.

## Para que sirve

- Registrar ingreso de vehiculos por placa.
- Ver ocupacion y vehiculos activos.
- Cobrar salida con tarifa, gracia, redondeo y descuentos.
- Configurar tarifas, espacios y metodos de pago.
- Revisar dashboard y reportes de cochera.
- Mantener pagos/deudas de cochera aislados del flujo de cobranza de polleria.

## Documentos

- [Capacidades](./capacidades.md)
- [Flujos](./flujos.md)
- [QA](./qa.md)
- [Pendientes](./pendientes.md)

## Superficies principales

| Area | Rutas |
| --- | --- |
| Operacion diaria | `/cochera`, `/cochera/entrada`, `/cochera/cobrar/:id` |
| Configuracion | `/config`, `/config/cochera` |
| Dashboard | `/dashboard` |
| Reportes | `/reportes` |
| Clientes / vehiculos | Superficies y hooks propios de cochera cuando aplica |

## Estado actual

Implementado como vertical propio con `businessMode: "cochera"`. Reusa superficies principales de Avileo cuando conviene (`/dashboard`, `/reportes`, `/config`) y usa rutas exclusivas para la operacion diaria.
