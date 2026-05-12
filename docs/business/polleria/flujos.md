# Flujos de Polleria

## 1. Preparacion de jornada

1. El admin configura productos, variantes, precios y puntos de venta.
2. Crea una distribucion diaria.
3. Selecciona vendedor y punto de venta.
4. Asigna productos/variantes con cantidades en kilos.
5. Confirma la asignacion para que el vendedor la vea en `Mi distribucion`.

Rutas principales: `/distribuciones/nueva`, `/distribuciones`, `/mi-distribucion`.

## 2. Venta en ruta

1. El vendedor abre su distribucion del dia.
2. Atiende una parada o cliente.
3. Pesa el pollo con envase o bolsa.
4. Registra tara para obtener kilos netos.
5. Selecciona variante/precio.
6. Registra pago al contado o credito.
7. Si hay cliente recurrente, la venta queda asociada al cliente.

Formula funcional:

```text
kilos netos = kilos brutos - tara
total = kilos netos * precio por kg
```

Rutas principales: `/ventas`, `/ventas/:id/editar/calculadora`, `/visitas`.

## 3. Cobranza

1. El vendedor/admin abre el cliente con deuda o la seccion de cobros.
2. Registra un abono con monto y metodo de pago.
3. El sistema descuenta el saldo pendiente.
4. La deuda puede quedar parcialmente pagada o saldada.

Rutas principales: `/clientes`, `/clientes/:id`, `/cobros`, `/cobros/nuevo`.

## 4. Cierre de jornada

1. El vendedor/admin abre la distribucion.
2. Registra cantidades llevadas, vendidas y devueltas.
3. Revisa ventas, gastos y recaudacion.
4. Cierra la distribucion.
5. Lo devuelto se reconcilia con inventario/operacion.

Ruta principal: `/distribuciones/:id/editar`.

## 5. Reportes y seguimiento

1. Admin revisa ventas y cobranza.
2. Revisa cuentas por cobrar.
3. Revisa alertas de stock y compras sugeridas cuando apliquen.

Rutas principales: `/dashboard`, `/reportes`, `/reportes/cuentas-por-cobrar`, `/reportes/alertas-stock`, `/reportes/compras-sugeridas`.
