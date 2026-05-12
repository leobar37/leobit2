# QA funcional de Agua

## Checklist minimo

- [ ] Crear o seleccionar negocio con `businessMode: "agua"`.
- [ ] Confirmar que no aparece calculadora con tara/kilos netos.
- [ ] Confirmar productos sugeridos de bidon y recarga.
- [ ] Crear cliente con cantidad sugerida de pedido cuando el campo este disponible.
- [ ] Registrar venta/entrega por unidad.
- [ ] Confirmar que el flujo principal favorece pago contra entrega.
- [ ] Verificar que no se ofrecen abonos parciales como comportamiento base.
- [ ] Revisar `/mi-distribucion` o `/visitas` para confirmar copia y campos de agua.
- [ ] Revisar dashboard/reportes compartidos despues de una entrega.

## Casos borde

- No debe aparecer lenguaje de polleria como kilos, tara, vendido/devuelto de pollo o cortes.
- No debe exigir envases/depositos para poder vender agua.
- Cambiar desde un negocio de polleria no debe conservar calculadora de peso.
- Cambiar desde cochera no debe conservar rutas o KPIs de cochera.

## Evidencia recomendada

- Venta de `Bidon 20L` o `Recarga 20L` por unidad.
- Cliente con cantidad sugerida.
- Pantalla de venta sin tara ni peso neto.
- Reporte o dashboard con actividad despues de la entrega.
