# QA funcional de Polleria

## Checklist minimo

- [ ] Crear o seleccionar negocio con `businessMode: "polleria"`.
- [ ] Confirmar que aparecen rutas de ventas, clientes, distribucion, visitas, cobros y reportes.
- [ ] Crear producto de pollo con variante por kilo.
- [ ] Crear cliente recurrente.
- [ ] Crear distribucion diaria para un vendedor.
- [ ] Ver distribucion en `/mi-distribucion`.
- [ ] Registrar venta al contado con tara y verificar kilos netos.
- [ ] Registrar venta a credito asociada a cliente.
- [ ] Registrar abono parcial y confirmar que baja el saldo.
- [ ] Cerrar distribucion con llevado, vendido y devuelto.
- [ ] Revisar que reportes y cuentas por cobrar reflejen la actividad.

## Casos borde

- Venta sin cliente debe ser posible.
- Tara no debe producir kilos netos negativos.
- Abono mayor a deuda debe ser rechazado o normalizado segun regla vigente.
- Cambiar a otro negocio no debe mostrar datos de polleria del negocio anterior.
- Acceso offline debe conservar ventas hasta sincronizacion.

## Evidencia recomendada

- Captura o registro de venta con peso bruto, tara y neto.
- Cliente con saldo antes y despues de un abono.
- Distribucion cerrada con cantidades consistentes.
- Reporte o dashboard actualizado despues de la venta.
