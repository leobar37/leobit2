# Pendientes de Agua

## Pendientes funcionales

- Definir si el vertical requiere envases retornables como capacidad oficial.
- Definir si se modelaran depositos de garantia y devoluciones.
- Implementar frecuencia real de entrega si se activa `useFrequency`.
- Crear motor de recurrencia para visitas o rutas programadas.
- Separar reportes especificos de agua si los reportes compartidos quedan cortos.
- Fortalecer la UI de reparto para no depender de conceptos de polleria.

## Posibles entidades futuras

- Envases por cliente.
- Eventos de envase: entregado, recogido, danado, perdido.
- Depositos de garantia.
- Suscripciones o frecuencias por cliente.
- Rutas recurrentes por dia de semana.

## Riesgos a vigilar

- Reintroducir envases/depositos como requisito base sin cambiar defaults ni UX completa.
- Usar cobranza parcial de polleria cuando `supportsPartialSettlement` esta desactivado.
- Mezclar nombres de pollo, kilos o tara en pantallas de agua.

## Fuera de alcance actual

- Tracking individual por codigo de barras.
- Integracion directa con Yape/Plin.
- Optimizacion automatica de rutas.
- Devolucion automatizada de depositos.
