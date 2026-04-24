# Requisitos: Migración Completa al Engine de Sync

## FR-001: Migrar `useDeleteSale` a Sync Engine
**Entidad**: sales  
**Archivo**: `packages/app/app/hooks/use-sales.ts`  
**Descripción**: El hook `useDeleteSale` actualmente usa API directa (`api.sales({id}).delete()`) para ventas con status !== "draft". Debe migrarse para usar `SaleService.delete()` vía sync engine, encolando la operación de eliminación.

**Criterios de aceptación**:
- [ ] `useDeleteSale` usa `SaleService.delete(id)` para TODOS los casos (draft y non-draft)
- [ ] La operación se encola en sync queue automáticamente
- [ ] El backend maneja correctamente el soft-delete al recibir la operación de sync
- [ ] No hay imports de `api-client` en `use-sales.ts` (salvo si otros hooks lo requieren)

## FR-002: Marcar Distribuciones como Online-Only
**Entidad**: distribuciones  
**Archivos**: `packages/app/app/hooks/use-distribuciones.ts`  
**Descripción**: Las operaciones de crear y cerrar distribuciones tienen side effects complejos en el backend (creación automática de visitas, validaciones de negocio). Estas operaciones deben mantenerse como online-only con guardas de UI apropiadas.

**Criterios de aceptación**:
- [ ] `useCreateDistribucion` mantiene API directa pero usa `useOfflineAwareMutation` con mensaje claro
- [ ] `useCloseDistribucion` mantiene API directa pero usa `useOfflineAwareMutation` con mensaje claro
- [ ] El UI deshabilita botones de crear/cerrar distribución cuando `!isOnline`
- [ ] Se muestra alerta con icono `WifiOff` explicando que se requiere conexión
- [ ] Documentar en código por qué estas operaciones son online-only (side effects: visitas)

## FR-003: Migrar `useBulkAssignGroups` a Sync Engine
**Entidad**: customer_group_members  
**Archivo**: `packages/app/app/hooks/use-bulk-assign-groups.ts`  
**Descripción**: El hook usa API directa para asignar múltiples clientes a grupos. Debe usar `CustomerGroupService.addMembers()` que ya está migrado y encola sync automáticamente.

**Criterios de aceptación**:
- [ ] `useBulkAssignGroups` usa `CustomerGroupService.addMembers()` vía `useSyncEngine`
- [ ] No hay imports de `api-client` en `use-bulk-assign-groups.ts`
- [ ] La asignación funciona offline y se sincroniza cuando hay conexión

## FR-004: Limpieza de Código Legacy
**Descripción**: Eliminar o deprecar archivos y patrones legacy que ya no se usan.

**Criterios de aceptación**:
- [ ] `use-customer.ts` se elimina o se actualiza para usar `useCustomer(id)` de `use-customers.ts`
- [ ] `customer-form.tsx` se elimina si está realmente sin uso
- [ ] `_protected.clientes.$id.edit.tsx` importa desde `~/hooks/use-customers` en lugar de `~/hooks/use-customers-live`
- [ ] No hay archivos huérfanos en `components/customers/`

## FR-005: Verificación de `SaleService` con Generated Service
**Entidad**: sales  
**Archivo**: `packages/app/app/lib/services/sale-service.ts`  
**Descripción**: `SaleService` es el único servicio core que extiende `BaseService` directamente en lugar de un servicio generado. Evaluar si puede extender `SalesService` generado.

**Criterios de aceptación**:
- [ ] Se evalúa si `SalesService` generado cubre las operaciones necesarias
- [ ] Si es viable, `SaleService` extiende `SalesService` generado
- [ ] Si no es viable, se documenta por qué debe mantenerse manual
- [ ] Las operaciones atómicas (sales + items) siguen funcionando correctamente
