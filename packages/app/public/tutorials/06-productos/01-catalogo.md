# Catálogo de productos

El **catálogo de productos** es donde administras todo lo que vendes en tu negocio. Como administrador, puedes crear, editar y organizar tus productos.

## ¿Qué es un producto en Avileo?

Un producto puede ser:

- **Producto simple**: Un solo ítem (ej: "Menudencia mixta")
- **Producto con variantes**: Diferentes presentaciones (ej: "Pollo" en entero, medio, cuarto)

## Estructura de productos

```
Producto: Pollo
├── Variante: Entero (precio: S/ 15.00/kg)
├── Variante: Medio (precio: S/ 16.00/kg)
└── Variante: Cuarto (precio: S/ 17.00/kg)
```

## Crear un nuevo producto

### Paso 1: Acceder

1. Ve a **Productos** (en el menú principal)
2. Toca el botón **"Nuevo producto"** o **+**

### Paso 2: Datos básicos

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| **Nombre** | Nombre del producto | "Pollo fresco" |
| **Descripción** | Detalle opcional | "Pollo de granja, criado libre" |
| **Tipo** | Categoría general | "Aves", "Menudencia", "Procesado" |
| **Imagen** | Foto del producto | (opcional) |

### Paso 3: Configurar variantes

Los productos avícolas típicamente tienen variantes:

1. Toca **"Agregar variante"**
2. Para cada variante define:
   - **Nombre**: Entero, Medio, Cuarto, Pechuga, etc.
   - **Precio**: Por kg o por unidad
   - **SKU**: Código interno (opcional)
   - **Stock inicial**: Cantidad disponible

> 💡 **Tip**: Incluso si vendes un solo tipo, crea una variante llamada "Estándar" para mantener consistencia.

### Paso 4: Guardar

Toca **"Guardar producto"**. El producto aparece inmediatamente en el catálogo.

## Gestionar variantes

### Editar variante

1. Ve al producto
2. Toca la variante que quieres editar
3. Modifica precio, nombre o stock
4. Guarda cambios

### Agregar variante a producto existente

1. Abre el producto
2. Toca **"+ Agregar variante"**
3. Completa los datos
4. Guarda

### Eliminar variante

> ⚠️ **Precaución**: No puedes eliminar variantes que tengan ventas registradas.

1. Ve a la variante
2. Toca el menú (tres puntos)
3. Selecciona **"Eliminar"**
4. Confirma

## Control de inventario

### Ver stock

En cada variante verás:

- **Stock actual**: Lo que tienes disponible
- **Stock reservado**: Asignado a pedidos confirmados
- **Stock disponible**: Realmente disponible para vender

### Ajustar inventario

Si necesitas corregir el stock:

1. Ve a la variante
2. Toca **"Ajustar stock"**
3. Ingresa el stock real
4. Agrega motivo del ajuste (ej: "Inventario físico", "Merma")

### Historial de movimientos

Cada variante tiene historial de:

- Ventas (salidas)
- Compras (entradas)
- Ajustes manuales
- Distribuciones a vendedores

## Precios

### Precio por kg vs por unidad

| Tipo | Uso | Ejemplo |
|------|-----|---------|
| **Por kg** | Productos que pesas | Pollo, menudencia |
| **Por unidad** | Productos contables | Bolsas, cajas, pollos enteros |

### Actualizar precios

Para cambiar precios:

1. Ve a la variante
2. Toca el precio actual
3. Ingresa nuevo precio
4. Opcional: establecer **fecha de vigencia**

> 💡 **Tip**: Puedes programar cambios de precio para fechas futuras (ej: subida de precios por fiestas).

## Categorías de productos

Organiza tus productos en tipos:

- **Aves**: Pollo, pavo, pato
- **Menudencia**: Hígado, molleja, corazón, patas
- **Procesados**: Pechugas fileteadas, alitas marinadas
- **Empaques**: Bolsas, cajas, bandejas
- **Otros**: Sal, condimentos, etc.

## Productos desactivados

Puedes desactivar productos temporalmente:

1. Ve al producto
2. Toca **"Desactivar"**
3. El producto desaparece de las ventas
4. Para reactivar, repite el proceso

> 💡 **Tip**: Usa esto para productos de temporada o que no tienes disponibles temporalmente.

## Reportes de productos

Como administrador puedes ver:

- **Productos más vendidos**: Ranking por volumen
- **Productos sin stock**: Alertas de reabastecimiento
- **Rotación de inventario**: Qué tan rápido se vende cada producto
- **Rentabilidad**: Margen por producto

## Mejores prácticas

### Nomenclatura

- Usa nombres claros y consistentes
- Evita abreviaturas que solo tú entiendas
- Incluye características importantes en el nombre

### Precios

- Revisa precios semanalmente
- Mantén histórico de cambios
- Considera temporadas (precios suben en fiestas)

### Stock

- Haz inventario físico semanal
- Ajusta el sistema según realidad
- Investiga diferencias (mermas, robos, errores)

---

**Anterior**: [Entregar un pedido ←](../05-pedidos/02-entregar-pedido.md)

**Siguiente**: [Mi distribución →](../07-distribuciones/01-mi-distribucion.md)
