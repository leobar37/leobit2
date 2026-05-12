# Flujos de Agua

## 1. Configuracion inicial

1. El admin crea o selecciona un negocio con `businessMode: "agua"`.
2. Configura productos de agua: bidones y recargas.
3. Configura metodos de pago.
4. Si aplica, configura rutas de reparto.

Rutas principales: `/business/create`, `/productos`, `/config/payment-methods`, `/config/water-routes`.

## 2. Registro de cliente recurrente

1. El admin o repartidor registra cliente.
2. Guarda datos de contacto y direccion.
3. Define cantidad sugerida de pedido cuando aplica.
4. El cliente queda disponible para futuras entregas.

Ruta principal: `/clientes/nuevo`.

## 3. Entrega / venta

1. El repartidor selecciona cliente o registra venta directa.
2. Elige producto: bidon o recarga.
3. Ingresa cantidad en unidades.
4. Cobra contra entrega con metodo permitido.
5. La venta queda registrada sin tara ni kilos netos.

Rutas principales: `/ventas`, `/mi-distribucion`, `/visitas`.

## 4. Ruta diaria

1. El negocio organiza entregas del dia.
2. El repartidor revisa visitas o distribucion.
3. Marca entregas realizadas.
4. Cierra o revisa lo entregado.

Rutas principales: `/distribuciones`, `/mi-distribucion`, `/visitas`.

## 5. Reportes

1. Admin revisa ventas y entregas.
2. Revisa clientes recurrentes y actividad general.
3. Usa reportes compartidos hasta que existan reportes especializados de agua.

Rutas principales: `/dashboard`, `/reportes`.

## Flujo futuro no implementado como base

El negocio de agua podria crecer hacia un flujo de envases retornables:

1. Entrega envase lleno.
2. Recoge envase vacio.
3. Evalua estado del envase.
4. Cobra penalidad o deposito si corresponde.
5. Mantiene inventario de envases por cliente.

Ese flujo debe documentarse e implementarse como capacidad futura, no asumirse como comportamiento actual.
