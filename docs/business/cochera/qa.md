# QA funcional de Cochera

Esta guia resume el minimo funcional. Para una guia extensa, usar tambien [`../../qa/avileo-cocheras-manual-testing.md`](../../qa/avileo-cocheras-manual-testing.md).

## Checklist minimo

- [ ] Crear o seleccionar negocio con `businessMode: "cochera"`.
- [ ] Confirmar que el dashboard usa `/dashboard`, no `/cochera/dashboard`.
- [ ] Confirmar que reportes usa `/reportes`, no `/cochera/reportes`.
- [ ] Abrir `/config/cochera` y guardar tarifa, gracia, espacios y metodos de pago.
- [ ] Registrar entrada en `/cochera/entrada`.
- [ ] Ver vehiculo activo en `/cochera`.
- [ ] Buscar vehiculo por placa o fragmento.
- [ ] Intentar duplicar una placa activa y verificar error claro.
- [ ] Cobrar salida en `/cochera/cobrar/:id`.
- [ ] Confirmar que la sesion cobrada desaparece de activos.
- [ ] Revisar dashboard y reportes despues del cobro.
- [ ] Cambiar a negocio no cochera y confirmar que no operan rutas de cochera.

## Casos borde

- Placa con espacios/minusculas debe normalizarse.
- Placa vacia o demasiado corta no debe guardarse.
- Metodo de pago desactivado no debe estar disponible en checkout.
- Vehiculo ya cobrado no debe aparecer como activo.
- Datos de cochera no deben filtrarse a polleria o agua al cambiar de negocio.
- Vendedor no debe acceder a configuracion administrativa si la regla de permisos lo restringe.

## Evidencia recomendada

- Configuracion guardada y recargada.
- Sesion activa creada con placa normalizada.
- Error por placa duplicada activa.
- Cobro finalizado con monto calculado.
- Dashboard/reporte con ingreso actualizado.
