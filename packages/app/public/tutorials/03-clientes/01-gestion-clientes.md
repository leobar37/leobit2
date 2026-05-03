# Gestionar clientes

El módulo de **Clientes** te permite mantener organizada tu base de datos de clientes, facilitando las ventas al crédito y el seguimiento de compras.

## ¿Por qué registrar clientes?

| Beneficio | Descripción |
|-----------|-------------|
| **Ventas al crédito** | Necesario para registrar deudas |
| **Historial de compras** | Saber qué compra cada cliente y cuándo |
| **Contacto** | Tener teléfono para coordinar entregas |
| **Fidelización** | Conocer a tus mejores clientes |

## Crear un nuevo cliente

### Paso 1: Acceder al formulario

Hay varias formas:

1. **Desde Clientes**: Ve a la pestaña Clientes > Toca **"+"**
2. **Durante una venta**: En "Nueva venta", busca cliente > **"+ Nuevo cliente"**

### Paso 2: Completar datos

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| **Nombre** | Sí | Nombre completo o razón social |
| **Teléfono** | No | Número de contacto (recomendado) |
| **Dirección** | No | Dirección de entrega o referencia |
| **Notas** | No | Información adicional (ej: "paga los viernes") |

### Paso 3: Guardar

Toca **"Guardar cliente"**. El cliente queda registrado y disponible inmediatamente.

> 💡 **Tip**: Si creas el cliente durante una venta, se selecciona automáticamente después de guardar.

## Buscar clientes

### Búsqueda rápida

En la lista de clientes:

1. Toca el campo de **búsqueda** en la parte superior
2. Escribe el **nombre** o **teléfono**
3. Los resultados aparecen en tiempo real

### Filtros disponibles

- **Todos**: Todos los clientes
- **Con deuda**: Solo clientes que deben dinero
- **Sin deuda**: Clientes al día
- **Más compras**: Clientes ordenados por frecuencia

## Ver detalle de un cliente

Toca cualquier cliente en la lista para ver:

### Información general
- Nombre completo
- Teléfono (con botón para llamar)
- Dirección
- Saldo actual (deuda o a favor)

### Estadísticas
- Total comprado (histórico)
- Cantidad de compras
- Promedio de compra
- Última compra

### Historial
Lista cronológica de:
- Ventas realizadas
- Abonos registrados
- Cambios en su saldo

## Editar un cliente

1. Ve al **detalle del cliente**
2. Toca el **icono de editar** (✏️)
3. Modifica los campos necesarios
4. Toca **"Guardar cambios"**

### ¿Qué puedes editar?

- Nombre (si había un error de escritura)
- Teléfono
- Dirección
- Notas

> ⚠️ **Importante**: El saldo del cliente no se edita manualmente. Se actualiza automáticamente con ventas y abonos.

## Eliminar un cliente

> ⚠️ **Precaución**: Solo elimina clientes que nunca hayan tenido transacciones.

1. Ve al **detalle del cliente**
2. Toca el **menú** (tres puntos)
3. Selecciona **"Eliminar"**
4. Confirma la acción

### Restricciones

No puedes eliminar clientes que:
- Tengan ventas registradas
- Tengan saldo (deuda o a favor)
- Tengan pedidos pendientes

Para estos casos, puedes:
- Dejar el cliente inactivo (si implementas estados)
- Agregar nota: "Ya no es cliente"



- Creas clientes sin internet
- Se guardan localmente
- Se sincronizan cuando hay conexión


## Exportar clientes (solo admin)

Los administradores pueden exportar la lista de clientes:

1. Ve a **Clientes**
2. Toca el **menú** (tres puntos)
3. Selecciona **"Exportar"**
4. Elige formato (CSV, Excel)

Esto es útil para:
- Marketing (enviar promociones)
- Análisis externo
- Respaldo de información

## Consejos prácticos

### Para vendedores

1. **Registra siempre**: Incluso para clientes de contado, tenerlos registrado ayuda
2. **Pide teléfono**: Facilita contactarlos para cobros o promociones
3. **Notas útiles**: Anota cosas como "prefiere las pechugas grandes" o "paga los martes"

### Para administradores

1. **Evita duplicados**: Busca antes de crear un cliente nuevo
2. **Estandariza nombres**: Usa siempre el mismo formato (ej: "Apellido, Nombre")
3. **Revisa periódicamente**: Limpia clientes sin actividad

---

**Anterior**: [Venta al crédito vs contado ←](../02-ventas/04-credito-vs-contado.md)

**Siguiente**: [Ver historial de compras →](./02-historial.md)
