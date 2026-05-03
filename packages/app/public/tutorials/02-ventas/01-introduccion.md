# Introducción a las ventas

El módulo de **Ventas** es el corazón de Avileo. Aquí registras todas las transacciones de tu negocio, ya sean al contado o al crédito.

## Tipos de venta

Avileo soporta dos modalidades de venta:

### Venta al contado
El cliente paga en el momento de la compra.

- **Efectivo**: Pago con dinero en efectivo
- **Yape/Plin**: Pago con aplicaciones móviles
- **Transferencia**: Depósito o transferencia bancaria

### Venta al crédito
El cliente se lleva el producto y paga después.

- Se registra la deuda del cliente
- El sistema lleva automáticamente el control de lo que debe
- Puedes registrar abonos (pagos parciales) más tarde

> ⚠️ **Importante**: Para ventas al crédito, el cliente debe estar registrado en el sistema.

## El flujo de una venta

El proceso típico de venta en Avileo es:

1. **Seleccionar cliente** (obligatorio para crédito, opcional para contado)
2. **Elegir productos** del catálogo
3. **Calcular peso** (si vendes por kilo)
4. **Seleccionar método de pago**
5. **Confirmar y guardar**

## Productos y variantes

Los productos pueden tener **variantes**:

| Producto | Variantes posibles |
|----------|-------------------|
| Pollo | Entero, Medio, Cuarto |
| Menudencia | Hígado, Molleja, Corazón |
| Empaque | Bolsa, Caja |

Cada variante puede tener su propio precio y control de stock.

## La calculadora de pollo

Para productos que vendes por peso, usa la **calculadora integrada**:

- Ingresa el **peso bruto** (con empaque)
- Resta la **tara** (peso del empaque)
- Obtén el **peso neto** automáticamente
- El precio se calcula según el peso neto

## Estados de una venta

Una vez registrada, una venta puede estar:

- **Completada**: Venta normal finalizada
- **Con deuda**: Venta al crédito con saldo pendiente
- **Pagada**: Venta al crédito que ya fue saldada

## Reportes de ventas

Desde el módulo de ventas puedes ver:

- Ventas del día actual
- Historial de ventas por fecha
- Ventas por cliente
- Estadísticas de ventas (admin)


> 💡 **Tip**: Puedes registrar ventas incluso sin internet. El sistema las guarda localmente y las sincroniza cuando recuperes conexión.

## Próximos pasos

Ahora que conoces los conceptos básicos, aprende a:

- [Cómo hacer una venta paso a paso →](./02-nueva-venta.md)
- [Usar la calculadora de pollo →](./03-calculadora.md)
- [Venta al crédito vs contado →](./04-credito-vs-contado.md)
