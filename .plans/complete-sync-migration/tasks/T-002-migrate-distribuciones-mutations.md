# T-002: Migrar Mutaciones de Distribuciones a Sync Engine

## Objetivo
Migrar todas las mutaciones de distribuciones que actualmente usan API directa para que usen `DistribucionService` vía sync engine.

## Requisitos Relacionados
- FR-002

## Archivos Involucrados
- `packages/app/app/hooks/use-distribuciones.ts`
- `packages/app/app/lib/services/distribucion-service.ts`

## Análisis Actual

### Mutaciones que usan API directa

```typescript
// use-distribuciones.ts:241 - useCreateDistribucion
const { data, error } = await api.distribuciones.post({...});

// use-distribuciones.ts:284 - useCloseDistribucion
const { data, error } = await api.distribuciones({ id }).close.patch();

// use-distribuciones.ts:327 - useUpdateDistribucionItems
const { data, error } = await api.distribuciones({ id }).items.put({ items });

// use-distribuciones.ts:355 - useUpdateDistribucion
const { data, error } = await api.distribuciones({ id }).put({...});

// use-distribuciones.ts:384 - useDeleteDistribucion
const { data, error } = await api.distribuciones({ id }).delete();
```

### Queries que usan `getDatabase()` directo

```typescript
// use-distribuciones.ts:95-200
const db = getDatabase();
// Queries directas con drizzle-orm
```

## Pasos de Implementación

### 1. Extender `DistribucionService` si es necesario
- [ ] Verificar qué métodos existen en `DistribucionService`
- [ ] Agregar `create()`, `close()`, `update()`, `delete()` si no existen
- [ ] Asegurar que todos llaman `queueSync()` para encolar operaciones

### 2. Migrar `useCreateDistribucion`
- [ ] Usar `distribucionService.create(input)` en lugar de `api.distribuciones.post()`
- [ ] Manejar la creación automática de visitas si es necesario (o delegar al backend)

### 3. Migrar `useCloseDistribucion`
- [ ] Evaluar si la lógica de cierre puede replicarse en el frontend
- [ ] Opción A: `distribucionService.close(id)` que actualiza status localmente
- [ ] Opción B: `distribucionService.update(id, { status: "closed" })` si la lógica es simple
- [ ] Documentar si hay lógica compleja que requiera backend

### 4. Migrar `useUpdateDistribucion`
- [ ] Usar `distribucionService.update(id, input)`

### 5. Migrar `useDeleteDistribucion`
- [ ] Usar `distribucionService.delete(id)`

### 6. Migrar `useUpdateDistribucionItems`
- [ ] Evaluar si puede reemplazarse por operaciones individuales de items
- [ ] O agregar método `updateItems()` en `DistribucionService`

### 7. Refactorizar Queries
- [ ] Reemplazar `getDatabase()` directo con `DistribucionService.findByBusiness()`
- [ ] Usar métodos del servicio para queries en lugar de queries Drizzle directas

### 8. Eliminar Import de `api-client`
- [ ] Remover `import { api, extractData } from "~/lib/api-client"`

## Consideraciones Especiales

### Lógica de Cierre de Distribución
El cierre de distribución puede tener lógica compleja en el backend:
- Creación automática de visitas
- Actualización de inventario
- Validaciones de negocio

**Decisión requerida**: ¿Replicar esta lógica en el frontend o mantener `useCloseDistribucion` como online-only con guardas offline?

### Creación de Distribución
Similarmente, la creación puede tener lógica de:
- Generación automática de items basada en productos
- Asignación de fechas
- Validaciones

## Validación
- [ ] Crear distribución funciona offline y se sincroniza
- [ ] Cerrar distribución funciona offline y se sincroniza
- [ ] Actualizar distribución funciona offline y se sincroniza
- [ ] Eliminar distribución funciona offline y se sincroniza
- [ ] No hay imports de `api-client` en `use-distribuciones.ts`
- [ ] Las queries usan `DistribucionService` en lugar de `getDatabase()`
