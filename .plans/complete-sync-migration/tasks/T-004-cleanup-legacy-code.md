# T-004: Limpieza de Código Legacy (Clientes)

## Objetivo
Eliminar o actualizar archivos y patrones legacy que ya no se usan o que usan imports inconsistentes.

## Requisitos Relacionados
- FR-004

## Archivos Involucrados
- `packages/app/app/hooks/use-customer.ts`
- `packages/app/app/components/customers/customer-form.tsx`
- `packages/app/app/routes/_protected.clientes.$id.edit.tsx`

## Pasos de Implementación

### 1. Eliminar o Deprecar `use-customer.ts`

**Problema**: Este hook filtra cliente-side en lugar de consultar por ID:

```typescript
// use-customer.ts
export function useCustomer(id: string | undefined) {
  const result = useCustomers();  // Carga TODOS los clientes
  const customer = useMemo(
    () => result.data?.find((item) => item.id === id) ?? null,
    [id, result.data]
  );
  return { ...result, data: customer };
}
```

**Solución**:
- [ ] Verificar si algún archivo importa `~/hooks/use-customer`
- [ ] Si no hay imports, eliminar el archivo
- [ ] Si hay imports, reemplazarlos por `useCustomer(id)` de `~/hooks/use-customers`
- [ ] Actualizar `_protected.clientes.$id.edit.tsx` para importar de `~/hooks/use-customers`

### 2. Eliminar `customer-form.tsx` (si está sin uso)

**Problema**: Componente standalone que no es usado por rutas actuales.

- [ ] Buscar imports de `customer-form.tsx` en todo el proyecto
- [ ] Si no hay imports, eliminar el archivo
- [ ] Si hay imports, evaluar si deben migrarse a `customer-form-content.tsx`

### 3. Consolidar Imports en Edit Route

**Archivo**: `_protected.clientes.$id.edit.tsx`

**Cambio**:
```typescript
// ❌ Antes
import { useCustomer } from "~/hooks/use-customer";
import { useUpdateCustomer } from "~/hooks/use-customers-live";

// ✅ Después
import { useCustomer, useUpdateCustomer } from "~/hooks/use-customers";
```

### 4. Verificar Otros Imports de `use-customers-live`

- [ ] Buscar todos los imports de `~/hooks/use-customers-live` en el proyecto
- [ ] Reemplazarlos por `~/hooks/use-customers`

## Validación
- [ ] `use-customer.ts` ya no existe o ya no se usa
- [ ] `customer-form.tsx` ya no existe o ya no se usa
- [ ] `_protected.clientes.$id.edit.tsx` importa de `~/hooks/use-customers`
- [ ] No hay imports de `~/hooks/use-customers-live` en el proyecto
- [ ] La compilación y tests pasan
