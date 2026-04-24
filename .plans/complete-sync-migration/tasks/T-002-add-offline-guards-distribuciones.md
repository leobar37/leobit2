# T-002: Agregar Guardas Offline a Distribuciones

## Objetivo
Marcar explícitamente las operaciones de crear y cerrar distribuciones como online-only intencional, agregando guardas de UI que deshabiliten estas acciones cuando no hay conexión.

## Requisitos Relacionados
- FR-002

## Contexto

Las operaciones de **crear** y **cerrar** distribuciones tienen side effects complejos en el backend que no pueden replicarse fácilmente en el frontend:

- **Crear distribución**: Genera automáticamente visitas asociadas a cada cliente en la ruta
- **Cerrar distribución**: Valida inventario, actualiza stock, genera reportes de rendimiento
- **Validaciones de negocio**: Verifica que el vendedor tenga ruta asignada, que los productos existan, etc.

Por estas razones, estas operaciones **deben mantenerse como online-only**.

## Archivos Involucrados
- `packages/app/app/hooks/use-distribuciones.ts`
- `packages/app/app/routes/_protected.distribuciones._index.tsx` (o página de lista)
- `packages/app/app/routes/_protected.distribuciones.nueva.tsx` (o página de creación)
- `packages/app/app/components/distribucion/` (componentes relacionados)

## Análisis Actual

```typescript
// use-distribuciones.ts
import { api, extractData } from "~/lib/api-client";

export function useCreateDistribucion() {
  return useMutation({
    mutationFn: async (input) => {
      const { data, error } = await api.distribuciones.post(input);
      // ...
    },
  });
}

export function useCloseDistribucion() {
  return useMutation({
    mutationFn: async (id) => {
      const { data, error } = await api.distribuciones({ id }).close.patch();
      // ...
    },
  });
}
```

## Pasos de Implementación

### 1. Agregar `useOfflineAwareMutation` a hooks de distribuciones
- [ ] `useCreateDistribucion` debe usar `useOfflineAwareMutation` con mensaje claro
- [ ] `useCloseDistribucion` debe usar `useOfflineAwareMutation` con mensaje claro
- [ ] `useUpdateDistribucion` debe usar `useOfflineAwareMutation` con mensaje claro
- [ ] `useDeleteDistribucion` debe usar `useOfflineAwareMutation` con mensaje claro

### 2. Agregar guardas de UI en componentes
- [ ] Botón "Nueva Distribución" deshabilitado cuando `!isOnline`
- [ ] Botón "Cerrar Distribución" deshabilitado cuando `!isOnline`
- [ ] Mostrar `Alert` con icono `WifiOff` explicando que se requiere conexión

### 3. Documentar en código
- [ ] Agregar comentario en `use-distribuciones.ts` explicando por qué son online-only
- [ ] Documentar los side effects: creación de visitas, validaciones de negocio

## Código Esperado

### Hook con guarda offline
```typescript
export function useCreateDistribucion() {
  return useOfflineAwareMutation({
    mutationFn: async (input: CreateDistribucionInput) => {
      const { data, error } = await api.distribuciones.post(input);
      if (error) throw new Error(String(error.value));
      return data;
    },
    offlineMessage: "Se requiere conexión a internet para crear distribuciones (se generan visitas automáticamente)",
    // ...
  });
}
```

### UI con guarda offline
```typescript
import { useSync } from "~/components/sync/sync-status";
import { WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function DistribucionesPage() {
  const { isOnline } = useSync();

  return (
    <div>
      {!isOnline && (
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Conéctate a internet para crear o cerrar distribuciones
          </AlertDescription>
        </Alert>
      )}

      <Button disabled={!isOnline} onClick={handleCreate}>
        Nueva Distribución
      </Button>
    </div>
  );
}
```

## Validación
- [ ] Botón de crear distribución está deshabilitado cuando offline
- [ ] Botón de cerrar distribución está deshabilitado cuando offline
- [ ] Se muestra mensaje explicativo con `WifiOff` cuando offline
- [ ] Las mutaciones usan `useOfflineAwareMutation` con mensaje apropiado
- [ ] Documentación en código explica por qué son online-only
