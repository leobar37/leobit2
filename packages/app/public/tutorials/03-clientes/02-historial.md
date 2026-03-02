# Ver historial de compras

Consultar el historial de compras de un cliente te permite conocer sus patrones de consumo, frecuencia de compra y valor como cliente.

## Acceder al historial

### Desde la lista de clientes

1. Ve a la pestaña **Clientes**
2. Toca el **cliente** que quieres consultar
3. Desplázate hacia abajo hasta **"Historial de compras"**

### Desde una venta

Durante una venta activa, toca el nombre del cliente para ver su información e historial.

## Qué información muestra

El historial incluye todas las transacciones ordenadas cronológicamente (más reciente primero):

| Información | Descripción |
|-------------|-------------|
| **Fecha y hora** | Cuándo ocurrió la transacción |
| **Tipo** | Venta, Abono, o Ajuste |
| **Monto** | Valor de la transacción |
| **Productos** | Qué compró (solo en ventas) |
| **Saldo resultante** | Deuda después de la transacción |

## Tipos de transacciones

### 🛒 Venta
Registro de una compra realizada por el cliente.

Muestra:
- Lista de productos comprados
- Cantidad de cada producto
- Precio pagado
- Modalidad (contado o crédito)

### 💰 Abono
Registro de un pago realizado por el cliente para reducir su deuda.

Muestra:
- Monto pagado
- Método de pago (efectivo, Yape, etc.)
- Referencia (número de operación)
- Deuda restante después del abono

### 📝 Ajuste
Cambios manuales en el saldo (registrados por administradores).

## Filtrar el historial

Puedes filtrar las transacciones por:

- **Todas**: Ver todo el historial
- **Ventas**: Solo compras
- **Abonos**: Solo pagos recibidos
- **Período**: Últimos 7 días, 30 días, o rango personalizado

## Análisis del historial

### Identificar patrones

Revisa el historial para detectar:

| Patrón | Qué indica |
|--------|-----------|
| Compra todos los martes | Cliente regular, planifica compras |
| Compras esporádicas de gran volumen | Cliente eventos/restaurante |
| Abonos pequeños frecuentes | Cliente con flujo de caja limitado |
| Abonos puntuales grandes | Cliente organizado, paga quincenal |

### Calcular frecuencia

El sistema calcula automáticamente:

- **Días entre compras**: Promedio de frecuencia
- **Ticket promedio**: Monto promedio por compra
- **LTV** (Lifetime Value): Total comprado en toda la relación

## Usar el historial para cobranza

Cuando vas a cobrar a un cliente, revisa su historial:

1. **Verifica la deuda actual**: En la parte superior del perfil
2. **Revisa últimos abonos**: Para saber si viene pagando regularmente
3. **Consulta compras recientes**: Para ofrecerle productos que suele comprar

### Ejemplo de conversación

> "Buenos días María, vengo a recoger los S/ 150 que me debes de la compra del martes. Vi que también compraste el jueves pasado, ¿necesitas algo más hoy? Tenemos promoción en pechugas."

## Descargar historial (solo admin)

Los administradores pueden descargar el historial completo de un cliente:

1. Ve al perfil del cliente
2. Toca el **menú** (tres puntos)
3. Selecciona **"Descargar historial"**
4. Elige formato (PDF, Excel)

Esto genera un documento con:
- Datos del cliente
- Todas las transacciones
- Totales y estadísticas
- Firma de recibo (espacio en blanco)

## Comparar períodos

Para analizar el crecimiento de un cliente:

1. Ve al historial
2. Toca **"Comparar períodos"**
3. Selecciona dos rangos de fechas
4. El sistema muestra:
   - Compras en período A vs período B
   - Crecimiento porcentual
   - Cambio en frecuencia

## Consejos para vendedores

### Antes de visitar a un cliente

1. Revisa su historial para saber qué suele comprar
2. Verifica si tiene deuda pendiente
3. Anota la última compra para tener contexto

### Durante la visita

1. Menciona productos que compró antes: "La última vez llevaste 5 kg de pierna"
2. Ofrece complementos basados en su historial
3. Recuerda amablemente cualquier deuda

---

**Anterior**: [Gestionar clientes ←](./01-gestion-clientes.md)

**Siguiente**: [Registrar un abono →](../04-cobros/01-registrar-abonos.md)
