# Agua Operativo Overview Context

## Overview

El objetivo de esta iniciativa es que el negocio de agua quede operativo dentro de Avileo para el caso peruano simplificado: un administrador programa rutas, asigna un repartidor, el repartidor entrega bidones o recargas como productos normales, cobra el total al momento y el sistema actualiza ventas, inventario, cierre y reportes.

La iniciativa requiere descomposición por features porque cruza dominio, backend, frontend, inventario, distribución, ventas, seeds, reportes, sync/offline y QA. No debe mezclarse con el flujo futuro de envases retornables, préstamos, depósitos o devoluciones.

## Background

Avileo ya reconoce `businessMode = "agua"` y tiene tablas, rutas, perfiles de cliente y pantallas iniciales para agua. También hay infraestructura de envases y depósitos, pero el alcance aclarado por producto para Perú es más simple: el bidón/recarga se vende como producto editable de inventario, sin préstamo de bidones ni deuda parcial.

## Goal

Al completar las features derivadas, un negocio de agua debe poder operar el flujo completo dentro de Avileo:

1. Crear o ajustar productos vendibles de agua.
2. Registrar clientes recurrentes con ruta, frecuencia, cantidad habitual e instrucciones.
3. Generar rutas por fecha y asignarlas a repartidores.
4. Completar entregas como ventas al contado pagadas totalmente.
5. Descontar inventario y registrar recaudación.
6. Cerrar jornada y ver métricas/reportes coherentes para agua.
7. Mantener el flujo validado con pruebas y sin regresionar pollería/cochera.

## Decomposition Rationale

- Las restricciones de negocio de agua deben asentarse antes de crear ventas automáticas.
- El backend debe bloquear crédito/parcial antes de exponer el flujo operacional.
- Ruta, entrega, inventario, cierre y reporting tienen superficies de validación distintas.
- Sync/offline y QA deben validar el conjunto, no solo una pantalla aislada.
- Las features pueden planificarse con `/plan` de forma independiente usando estos briefs.

## Scope Boundaries

- In scope: agua Perú, bidones/recargas como productos normales, pago total, rutas por repartidor, inventario, cierre, dashboard/reportes, seeds, pruebas.
- Out of scope: serialización de cada bidón, depósitos, préstamos/retornos de envases, penalidades por envases dañados, optimización GPS, facturación electrónica, suscripciones complejas, WhatsApp automatizado.

## Evidence Buckets

### Verified

- `agua` existe como modo de negocio en `packages/shared/src/business-modes/schema.ts` y defaults en `packages/shared/src/business-modes/defaults.ts`.
- Los defaults de agua declaran `defaultUnit: "unidad"`, `supportsCreditSettlement: false` y `supportsPartialSettlement: false`.
- Existen tablas water en `packages/backend/src/db/schema/water.ts` y `packages/shared/src/schema.ts`.
- `CustomerService` persiste `waterProfile` y lo adjunta solo para modo agua.
- Existen APIs `/water-routes`, `/distribuciones/water/preview`, `/distribuciones/water/generate` y `/visitas/:id/water/complete`.
- El frontend muestra sección de agua en clientes, genera rutas y permite completar stops en `/mi-distribucion`.
- La UI de ventas filtra los modos de pago de agua a `pago_total`.
- El backend `SaleService` aún no usa `ctx.businessMode` ni `modeFlags` para rechazar crédito/parcial en agua.
- `completeWaterDelivery` actualiza stop/visita/balance de envases, pero no crea venta ni pago.
- Seeds de agua existen, pero algunos perfiles usan días en español mientras la generación espera day keys en inglés.

### Inferred

- Los productos semilla son editables porque se crean como productos normales y existen rutas/API de edición de producto, variante e inventario.
- El flujo base debe neutralizar o esconder campos de depósito/envases para evitar confundir al usuario de agua Perú.
- La entrega operacional debe integrar `visitas`, `sales`, `sale_items`, pagos e inventario para cerrar el negocio.

### Unknown

- Si el producto exacto vendido en una entrega se seleccionará por stop, por perfil de cliente, por ruta o por default de negocio.
- Si el stock se asignará al repartidor/ruta antes de salir o se descontará del inventario general al entregar.
- Qué nivel de soporte offline se exigirá para completar entregas en la primera entrega operativa.
