# Draft: Sistema de Variantes de Productos

## Requisitos Confirmados

### 1. Alcance de Productos
- **Decisión:** Sistema configurable - CUALQUIER producto puede tener variantes
- **Implicación:** No limitado a huevos, diseño genérico y reutilizable

### 2. Presentaciones
- **Decisión:** Personalizado por producto
- **Ejemplo Huevos:** Jaba (30un), Media Jaba (15un), Docena (12un), Unidad (1un)
- **Ejemplo Pollos:** Entero, Medio, Cuarto, Piezas individuales
- **Implicación:** UI dinámica para definir variantes por producto

### 3. Precios
- **Decisión:** Precio fijo independiente por presentación
- **Ejemplo:**
  - Huevo Unidad: S/ 0.80
  - Huevo Docena: S/ 9.00 (no necesariamente 12 × 0.80)
  - Jaba: S/ 22.00
- **Implicación:** Tabla de variantes con campo `price` requerido

### 4. Inventario Mixto
- **Decisión:** Stock base + stock por presentación
- **Lógica:**
  - Productos sueltos (kg/unidad): Stock en unidad base
  - Empaques predefinidos (jabas, docenas): Stock independiente
  - Cuando se vende una presentación, se puede opcionalmente descontar del stock base
- **Implicación:** Campo `trackBaseInventory` en variantes

### 5. Offline-First
- **Decisión:** Full offline support
- **Requisitos:**
  - Variantes deben sincronizarse con el backend
  - Ventas offline deben manejar variantes correctamente
  - Cache local de variantes en IndexedDB

## Decisiones Técnicas Pendientes

- [ ] ¿Variantes globales o por negocio?
- [ ] ¿Quién configura las variantes (solo admin o vendedores también)?
- [ ] ¿Mostrar todas las variantes en el POS o selector jerárquico?

## Notas de Implementación

### Modelo de Datos Propuesto
```typescript
// Nueva tabla: product_variants
{
  id: UUID,
  productId: UUID → products.id,
  name: string,           // "Jaba", "Docena", "Unidad"
  sku: string?,           // Código opcional
  unitQuantity: number,   // 30, 12, 1 (para conversión)
  price: number,          // Precio fijo
  baseUnitId: UUID?,      // Unidad base para conversión
  trackInventory: boolean, // ¿Tiene stock propio?
  isActive: boolean
}
```

### UI Components Necesarios
- ProductVariantManager (configuración)
- ProductVariantSelector (POS)
- VariantInventoryDisplay (inventario)

## Preguntas Abiertas
- ¿Prioridad de implementación?
- ¿Fecha límite deseada?
- ¿Features del MVP vs futuras mejoras?
