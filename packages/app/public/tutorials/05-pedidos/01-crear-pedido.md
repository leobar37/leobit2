# Crear un pedido

Un **pedido** (también llamado preventa) es una reserva de productos que el cliente recibirá en una fecha futura. Es útil para planificar producción y asegurar ventas.

## ¿Qué es un pedido?

Diferencias entre pedido y venta:

| Aspecto | Pedido | Venta |
|---------|--------|-------|
| **Momento** | Reserva para futuro | Entrega inmediata |
| **Pago** | Puede ser anticipo o crédito | Contado o crédito |
| **Stock** | Reserva del producto | Descuenta inmediatamente |
| **Estados** | Borrador → Confirmado → Entregado | Completada de inmediato |

## ¿Cuándo usar pedidos?

- Cliente quiere producto para mañana o fecha específica
- Eventos grandes (fiestas, restaurantes)
- Productos que necesitan preparación especial
- Para asegurar la venta con anticipo

## Cómo crear un pedido

### Paso 1: Iniciar nuevo pedido

1. Ve a la pestaña **Pedidos**
2. Toca el botón **"Nuevo pedido"** o **+**

### Paso 2: Seleccionar cliente

Igual que en ventas:

1. Busca el cliente existente, o
2. Crea un cliente nuevo si es necesario

> ⚠️ **Importante**: El cliente debe estar registrado para hacer pedidos.

### Paso 3: Establecer fecha de entrega

1. Toca el campo **"Fecha de entrega"**
2. Selecciona la fecha en el calendario
3. Opcional: Agrega **hora estimada** de entrega

> 💡 **Tip**: Puedes crear pedidos con entrega para el mismo día, pero con al menos 2 horas de anticipación.

### Paso 4: Agregar productos

1. Toca **"Agregar producto"**
2. Selecciona producto y variante
3. Ingresa cantidad/peso
4. Establece **precio cotizado**

> 💡 **Tip**: El precio puede ajustarse al momento de la entrega si cambian los precios del día.

### Paso 5: Registrar anticipo (opcional)

Si el cliente da dinero por adelantado:

1. Activa **"Registrar anticipo"**
2. Ingresa el monto recibido
3. Selecciona método de pago
4. El anticipo se descuenta del total al entregar

### Paso 6: Guardar pedido

1. Revisa el resumen:
   - Cliente
   - Fecha de entrega
   - Productos y cantidades
   - Total estimado
   - Anticipo (si aplica)

2. Toca **"Guardar pedido"**

3. El pedido queda en estado **"Borrador"**

## Estados de un pedido

### 📝 Borrador

- Pedido recién creado
- Puedes editar productos, cantidades, fecha
- No afecta el inventario todavía

### ✅ Confirmado

- Pedido listo para preparar
- Bloquea edición de productos (solo cantidades)
- El sistema reserva el stock (si está configurado)

### 🚚 Entregado

- Producto entregado al cliente
- Se convierte automáticamente en **venta**
- Se descuenta del inventario
- Se registra el pago según lo acordado

### ❌ Cancelado

- Pedido anulado
- Libera el stock reservado
- Se puede agregar motivo de cancelación

## Gestionar pedidos existentes

### Ver lista de pedidos

En **Pedidos** verás:

- Pedidos de hoy (por defecto)
- Filtros por estado (borrador, confirmado, entregado)
- Búsqueda por cliente

### Editar un pedido

Solo pedidos en estado **Borrador**:

1. Toca el pedido en la lista
2. Toca **"Editar"**
3. Modifica lo necesario
4. Guarda cambios

### Confirmar un pedido

Cuando estás listo para prepararlo:

1. Abre el pedido
2. Toca **"Confirmar"**
3. El estado cambia a **Confirmado**

> 💡 **Tip**: Confirma pedidos con anticipación para planificar tu producción/compras.

## Trabajar offline

Los pedidos funcionan offline:

- Creas pedidos sin internet
- Se guardan localmente
- Se sincronizan al recuperar conexión
- Puedes entregar pedidos creados offline

---

**Anterior**: [Ver deudores ←](../04-cobros/02-ver-deudores.md)

**Siguiente**: [Entregar un pedido →](./02-entregar-pedido.md)
