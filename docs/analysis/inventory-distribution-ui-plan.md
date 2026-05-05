# Plan de Implementación: UI de Inventario y Distribución

> Plan ejecutable para incorporar las interfaces de usuario de Inventario y Distribución sin romper funcionalidades existentes.
> Fecha: 12 de Febrero, 2026

---

## 🎯 Visión General

Este plan describe la implementación completa del frontend para los módulos de **Inventario** y **Distribución**, construidos sobre las APIs backend ya existentes. El enfoque es modular, permitiendo trabajar en ramas independientes sin afectar el desarrollo actual.

### Estado Actual
- ✅ **Backend APIs**: Completamente implementadas (`/inventory`, `/distribuciones`)
- ✅ **Patrones Frontend**: Establecidos (hooks, componentes, rutas)
- ⚠️ **UI Inventario/Distribución**: Pendiente de implementación

---

## 📁 Estructura de Ramas Recomendada

```
main (estable)
├── feature/inventory-hooks        # Hooks de datos (TanStack Query)
├── feature/inventory-ui-vendor    # UI para vendedores (mobile)
├── feature/inventory-ui-admin     # UI para admin (desktop)
├── feature/distribucion-hooks     # Hooks de distribución
├── feature/distribucion-ui-admin  # Gestión de distribuciones
└── feature/dashboard-inventory    # Integración en dashboard
```

### Flujo de Trabajo
1. Cada rama se crea desde `main`
2. Al finalizar, se hace PR a `main`
3. Las ramas UI dependen de las ramas Hooks correspondientes

---

## 📋 Fases de Implementación

### FASE 1: Hooks de Datos (Sin dependencias)
**Rama**: `feature/inventory-hooks`  
**Tiempo estimado**: 2-3 horas  
**Bloquea**: Todas las UI de inventario

#### Archivos a Crear

**1.1 `packages/app/app/hooks/use-inventory.ts`**
```typescript
// TanStack Query hooks para API de inventario
// Patrón: use-products.ts (líneas 1-129)

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  updatedAt: Date;
}

export function useInventory()
export function useInventoryItem(productId: string)
export function useUpdateInventory()
export function useValidateStock()
```

**1.2 `packages/app/app/hooks/use-distribuciones.ts`**
```typescript
// TanStack Query hooks para API de distribuciones
// Patrón: use-customers.ts (líneas 1-130)

export interface Distribucion {
  id: string;
  vendedorId: string;
  vendedorName: string;
  puntoVenta: string;
  kilosAsignados: number;
  kilosVendidos: number;
  montoRecaudado: number;
  estado: "activo" | "en_ruta" | "cerrado";
  fecha: Date;
}

export function useDistribuciones(filters?: {...})
export function useDistribucion(id: string)
export function useMiDistribucion(fecha?: string)
export function useCreateDistribucion()
export function useUpdateDistribucion()
export function useCloseDistribucion()
export function useDeleteDistribucion()
```

**1.3 Actualizar tipos de API**
- Verificar que el backend exporta tipos en `@avileo/backend`
- Si no, definir tipos en `packages/shared/src/index.ts`

#### Criterios de Aceptación
- [ ] Hooks compilan sin errores TypeScript
- [ ] Queries usan keys consistentes (`["inventory"]`, `["distribuciones"]`)
- [ ] Mutations invalidan queries correctamente
- [ ] Manejo de errores con throw Error()

---

### FASE 2: Componentes Base (Depende de FASE 1)
**Rama**: `feature/inventory-components`  
**Tiempo estimado**: 3-4 horas  
**Bloquea**: Páginas de UI

#### Archivos a Crear

**2.1 `packages/app/app/components/inventory/inventory-card.tsx`**
```typescript
// Card de asignación para vendedor (mobile)
// Basado en: docs/screens/mobile-vendedor.md líneas 86-92

interface InventoryCardProps {
  kilosAsignados: number;
  kilosVendidos: number;
  puntoVenta: string;
}

// Diseño:
// - bg-orange-500/10 border-orange-500/30
// - Número grande (text-3xl) para kilos
// - Progress bar (h-2)
// - Badge "Hoy"
// - Texto "Punto: {puntoVenta}"
```

**2.2 `packages/app/app/components/inventory/stock-badge.tsx`**
```typescript
// Indicador de estado de stock
// Basado en: docs/screens/mobile-vendedor.md líneas 599-604

interface StockBadgeProps {
  status: "disponible" | "bajo" | "agotado";
  quantity?: number;
}

// Estados:
// - 🟢 Disponible (quantity > 10)
// - 🟡 Bajo stock (quantity <= 10)
// - 🔴 Agotado (quantity === 0)
```

**2.3 `packages/app/app/components/distribucion/distribucion-table.tsx`**
```typescript
// Tabla de distribuciones para admin (desktop)
// Basado en: docs/screens/desktop-admin.md líneas 137-144

interface DistribucionTableProps {
  distribuciones: Distribucion[];
  onEdit: (id: string) => void;
  onClose: (id: string) => void;
  onDelete: (id: string) => void;
}

// Columnas: Vendedor | Punto | Asignado | Vendido | Estado | Acciones
// Estados: 🟢 En ruta | 🔵 Cerrado | ⚫ Pendiente
```

**2.4 `packages/app/app/components/distribucion/distribucion-form.tsx`**
```typescript
// Formulario para crear/editar distribución
// Basado en: docs/screens/desktop-admin.md líneas 236-267

interface DistribucionFormProps {
  onSubmit: (data: DistribucionInput) => void;
  initialData?: Partial<Distribucion>;
  vendedores: { id: string; name: string }[];
}

// Campos:
// - Vendedor (Select)
// - Punto de venta (Input)
// - Kilos asignados (Number input)
// - Fecha (Date picker, opcional)
```

**2.5 `packages/app/app/components/distribucion/progress-header.tsx`**
```typescript
// Header con progreso de inventario asignado
// Basado en: docs/screens/desktop-admin.md líneas 128-132

interface ProgressHeaderProps {
  inventarioTotal: number;
  inventarioAsignado: number;
}

// Muestra:
// - "Inventario Disponible Hoy: X kg"
// - "Asignado: Y kg"
// - Progress bar con porcentaje
```

#### Criterios de Aceptación
- [ ] Componentes usan shadcn/ui (Card, Button, Input, Select, Progress)
- [ ] Estilos consistentes con dashboard existente
- [ ] Props tipadas correctamente
- [ ] Soporte para estados loading/error

---

### FASE 3: UI para Vendedor - Inventario (Depende de FASE 1-2)
**Rama**: `feature/inventory-ui-vendor`  
**Tiempo estimado**: 2-3 horas

#### Archivos a Crear

**3.1 `packages/app/app/routes/_protected.mi-distribucion.tsx`**
```typescript
// Página "Mi Distribución" para vendedores
// URL: /mi-distribucion

// Layout:
// - Header sticky con título "Mi Distribución"
// - InventoryCard con datos del día
// - Stats: Kilos asignados, vendidos, disponibles
// - Lista de ventas realizadas hoy
// - Botón "Cerrar Día" (si no está cerrado)

// Hooks:
// - useMiDistribucion()
// - useVendedorVentasHoy() (si existe)

// Estados de distribución:
// - activo: Mostrar card normal
// - en_ruta: Mismo que activo
// - cerrado: Mostrar badge "Día Cerrado", deshabilitar acciones
```

**3.2 Modificar `packages/app/app/routes/_protected.dashboard.tsx`**
```typescript
// Integrar InventoryCard en dashboard existente

// Cambios:
// 1. Importar InventoryCard
// 2. Usar useMiDistribucion() para obtener asignación del día
// 3. Mostrar InventoryCard condicionalmente:
//    - Si el negocio usa distribución (business.usarDistribucion)
//    - Si hay una distribución para hoy
// 4. Mantener grid 2x2 existente debajo

// Código a agregar (después del welcome card):
{distribucion && (
  <InventoryCard 
    kilosAsignados={distribucion.kilosAsignados}
    kilosVendidos={distribucion.kilosVendidos}
    puntoVenta={distribucion.puntoVenta}
  />
)}
```

#### Criterios de Aceptación
- [ ] Vendedor ve su asignación del día en dashboard
- [ ] Página /mi-distribucion muestra detalles completos
- [ ] Responsive (mobile-first)
- [ ] Funciona offline (usando TanStack Query cache)

---

### FASE 4: UI para Admin - Distribución (Depende de FASE 1-2)
**Rama**: `feature/distribucion-ui-admin`  
**Tiempo estimado**: 4-5 horas

#### Archivos a Crear

**4.1 `packages/app/app/routes/_protected.distribuciones.tsx`**
```typescript
// Página de gestión de distribuciones (admin)
// URL: /distribuciones
// Layout: Desktop-focused (sidebar layout similar a _protected.dashboard.tsx)

// Layout desktop:
// - Sidebar izquierdo fijo (w-56)
// - Header con "Distribución" y botón "+ Nueva"
// - ProgressHeader con inventario total/asignado
// - DistribucionTable con datos

// Features:
// - Filtros: Fecha, Vendedor, Estado
// - Acciones por fila: Editar, Cerrar, Eliminar
// - Modal para crear/editar (usa DistribucionForm)
// - Confirmación antes de eliminar

// Hooks:
// - useDistribuciones({ fecha: selectedDate })
// - useInventory() (para calcular disponible)
// - useCreateDistribucion()
// - useUpdateDistribucion()
// - useCloseDistribucion()
// - useDeleteDistribucion()
```

**4.2 Crear layout desktop si no existe**
```typescript
// Si no hay un layout desktop con sidebar, crear:
// packages/app/app/routes/_protected.admin.tsx

// Este layout tendría:
// - Sidebar fijo izquierdo (w-56, bg-gray-900)
// - Items: Dashboard, Distribuciones, Usuarios, etc.
// - Header con logo y usuario
// - Main content area (flex-1)
```

#### Criterios de Aceptación
- [ ] Admin puede ver todas las distribuciones del día
- [ ] Puede crear nuevas asignaciones
- [ ] Puede editar asignaciones existentes
- [ ] Puede cerrar distribuciones
- [ ] Puede eliminar distribuciones
- [ ] Muestra progreso de inventario asignado
- [ ] Responsive (mobile muestra tabla compacta)

---

### FASE 5: Integración con Configuración (Depende de FASE 1-4)
**Rama**: `feature/config-inventory`  
**Tiempo estimado**: 2 horas

#### Archivos a Modificar

**5.1 `packages/app/app/routes/_protected.settings.tsx`** (o crear si no existe)
```typescript
// Agregar sección de configuración de inventario
// Basado en: docs/screens/desktop-admin.md líneas 407-444

// Sección "Configuración de Inventario":
// - Select: Modo de Operación
//   * Inventario Propio
//   * Sin Inventario
//   * Pedidos
//   * Mixto
// - Toggle: Control de kilos
// - Toggle: Usar distribución
// - Toggle: Permitir venta sin stock
// - Input: Precio por defecto (kg)

// Nota: Esto modifica la tabla businesses
// API ya existe (useBusinessUpdate)
```

#### Criterios de Aceptación
- [ ] Admin puede cambiar modo de operación
- [ ] Toggles funcionan correctamente
- [ ] Cambios se guardan en backend
- [ ] UI responde a cambios de configuración

---

### FASE 6: Validaciones y Stock en Ventas (Depende de FASE 1-5)
**Rama**: `feature/sales-stock-validation`  
**Tiempo estimado**: 3-4 horas

#### Archivos a Modificar

**6.1 Integrar en flujo de ventas existente**
```typescript
// Cuando se crea una venta, validar stock si aplica:

// En el componente/formulario de nueva venta:
// 1. Obtener configuración del negocio
//    a. Obtener distribución del día (useMiDistribucion)
//    b. Calcular disponible: asignado - vendido
//    c. Validar que cantidad solicitada <= disponible
//    d. Si no hay suficiente:
// 3. Al confirmar venta:
//    a. Actualizar kilosVendidos en distribución (optimistic)
//    b. Crear la venta

// API a usar:
// - useValidateStock() para validar disponibilidad
// - useMiDistribucion() para obtener límites
```

#### Criterios de Aceptación
- [ ] Ventas validan stock cuando corresponde
- [ ] Mensajes de error claros cuando no hay stock
- [ ] Funciona según configuración del negocio
- [ ] No rompe flujo de ventas existente

---

## 🗂️ Archivos Involucrados

### Nuevos Archivos (16 archivos)
```
packages/app/app/
├── hooks/
│   ├── use-inventory.ts
│   └── use-distribuciones.ts
├── components/
│   ├── inventory/
│   │   ├── inventory-card.tsx
│   │   └── stock-badge.tsx
│   └── distribucion/
│       ├── distribucion-table.tsx
│       ├── distribucion-form.tsx
│       └── progress-header.tsx
└── routes/
    ├── _protected.mi-distribucion.tsx
    ├── _protected.distribuciones.tsx
    └── _protected.admin.tsx (opcional, si no existe)
```

### Archivos a Modificar (2 archivos)
```
packages/app/app/routes/
├── _protected.dashboard.tsx (integrar InventoryCard)
└── _protected.settings.tsx (agregar config de inventario)
```

### Archivos de Referencia (para copiar patrones)
```
packages/app/app/
├── hooks/
│   ├── use-products.ts
│   └── use-customers.ts
├── routes/
│   ├── _protected.clientes.tsx
│   └── _protected.dashboard.tsx
└── components/
    ├── ui/ (shadcn/ui components)
    └── forms/ (form patterns)
```

---

## 🧪 Estrategia de Testing

### Testing Manual (requerido antes de merge)

**Escenarios de Prueba:**

1. **Vendedor con distribución:**
   - [ ] Dashboard muestra card de asignación
   - [ ] /mi-distribucion muestra detalles
   - [ ] Progress bar calcula % correcto

2. **Vendedor sin distribución:**
   - [ ] Dashboard NO muestra card (o muestra "Sin asignación")
   - [ ] /mi-distribucion muestra mensaje informativo

3. **Admin gestionando distribuciones:**
   - [ ] Ver lista de distribuciones del día
   - [ ] Crear nueva asignación
   - [ ] Editar asignación existente
   - [ ] Cerrar distribución
   - [ ] Eliminar distribución
   - [ ] Progress header actualiza correctamente

4. **Configuración:**
   - [ ] Cambiar modo de operación
   - [ ] Toggles afectan comportamiento de ventas
   - [ ] Cambios persisten al recargar

5. **Stock validation:**
   - [ ] Venta bloqueada sin stock (config estricta)
   - [ ] Venta permitida con advertencia (config permisiva)
   - [ ] Sin validación en modo libre

---

## ⚠️ Consideraciones de Seguridad

1. **RBAC:** Todos los endpoints ya tienen protección en backend
2. **UI condicional:** Mostrar/ocultar opciones según rol:
   - Vendedor: Solo ve su distribución
   - Admin: Ve todo y puede gestionar
3. **Validación:** No confiar solo en UI, backend valida todo

---

## 🚀 Orden de Implementación Recomendado

### Opción A: Por Fases (Recomendado)
1. FASE 1: Hooks (feature/inventory-hooks)
2. FASE 2: Componentes (feature/inventory-components)
3. FASE 3: UI Vendedor (feature/inventory-ui-vendor)
4. FASE 4: UI Admin (feature/distribucion-ui-admin)
5. FASE 5: Configuración (feature/config-inventory)
6. FASE 6: Validación en ventas (feature/sales-stock-validation)

**Ventaja:** Cada fase es testeable independientemente.

### Opción B: Por Usuario
1. Todo el flujo de vendedor (FASE 1 + 2 + 3)
2. Todo el flujo de admin (FASE 1 + 2 + 4 + 5)
3. Integración con ventas (FASE 6)

**Ventaja:** Entregables completos por tipo de usuario.

---

## 📊 Estimación de Tiempo Total

| Fase | Tiempo | Complejidad |
|------|--------|-------------|
| FASE 1: Hooks | 2-3h | Baja |
| FASE 2: Componentes | 3-4h | Media |
| FASE 3: UI Vendedor | 2-3h | Media |
| FASE 4: UI Admin | 4-5h | Alta |
| FASE 5: Configuración | 2h | Baja |
| FASE 6: Validación | 3-4h | Media |
| **TOTAL** | **16-21h** | - |

---

## 📝 Notas Importantes

### Patrones a Seguir (CRÍTICO)
1. **Hooks:** Usar use-products.ts como template
2. **Componentes:** Usar shadcn/ui, estilos orange-500
3. **Rutas:** Usar _protected.clientes.tsx como template
4. **Forms:** Zod + react-hook-form + FormInput
5. **Queries:** Keys consistentes, invalidateQueries en mutations

### Anti-patrones a Evitar
- ❌ No crear nuevos componentes UI básicos (usar shadcn/ui)
- ❌ No modificar estructura de carpetas existente
- ❌ No cambiar configuración de TypeScript
- ❌ No instalar nuevas dependencias sin justificación

### Dependencias Ya Instaladas
- ✅ @tanstack/react-query
- ✅ @elysiajs/eden (api-client)
- ✅ react-hook-form + zod
- ✅ shadcn/ui components
- ✅ lucide-react (iconos)
- ✅ tailwindcss

---

## ✅ Checklist Pre-Implementación

Antes de empezar cada fase:

- [ ] Backend APIs funcionan (testear con curl/Postman)
- [ ] Rama creada desde main actualizada
- [ ] Dependencias instaladas (`bun install`)
- [ ] TypeScript compila sin errores (`bun run build`)
- [ ] Servidor dev corre (`bun run dev`)

---

## 🎯 Definición de "Hecho"

Una fase está completa cuando:
1. [ ] Todo el código compila sin errores TypeScript
2. [ ] No hay errores de lint (`bun run lint`)
3. [ ] Testing manual pasa todos los escenarios
4. [ ] No se rompen funcionalidades existentes
5. [ ] PR creado con descripción clara de cambios
6. [ ] Code review aprobado (si aplica)

---

## 🔗 Documentación Relacionada

- [Backend APIs](../backend/src/api/) - Inventario y Distribuciones
- [UI Mobile Vendedor](../screens/mobile-vendedor.md) - Pantallas mobile
- [UI Desktop Admin](../screens/desktop-admin.md) - Pantallas admin
- [Análisis Funcional](./functional-analysis.md) - Plan general
- [Patrones Frontend](../app/app/hooks/) - Hooks existentes

---

*Plan generado para desarrollo modular seguro*
