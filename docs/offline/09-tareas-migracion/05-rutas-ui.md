# Tarea 5: Migración de Rutas (UI)

> **Dependencias:** Tarea 4  
> **Duración:** 4-5 días  
> **Archivos:** `app/routes/*.tsx`

---

## Objetivo

Migrar las rutas existentes para usar los nuevos hooks PGlite en lugar de los hooks de TanStack DB.

---

## Estrategia de Migración

### Orden de Rutas (de simple a complejo)

1. **Customers** - CRUD simple, buen calentamiento
2. **Products** - CRUD simple, muchos datos
3. **Sales List** - Solo lectura
4. **Sales Create/Edit** - CRUD con relaciones
5. **Purchases** - Similar a sales
6. **Distribuciones** - CRUD con relaciones
7. **Closings** - CRUD simple

---

## 5.1 Ruta: /clientes (Listado)

**Archivo:** `app/routes/_protected.clientes._index.tsx`

### Cambios

```typescript
// ANTES (TanStack DB)
import { useCustomers } from "~/hooks/use-customers";

export default function ClientesPage() {
  const { data: customers, isLoading } = useCustomers();
  // ...
}

// DESPUÉS (PGlite)
import { useCustomers } from "~/hooks/use-customers";  // Mismo nombre, diferente implementación

export default function ClientesPage() {
  const { data: customers, isLoading } = useCustomers(businessId);
  // ...resto igual
}
```

**Nota:** El hook tiene el mismo nombre, solo cambia la implementación interna.

---

## 5.2 Ruta: /clientes/nuevo (Crear)

**Archivo:** `app/routes/_protected.clientes.nuevo._index.tsx`

### Cambios

```typescript
// ANTES
import { useCreateCustomer } from "~/hooks/use-customers";

const mutation = useCreateCustomer();
await mutation.mutateAsync(data);  // Llamaba a API directo

// DESPUÉS
import { useCreateCustomer } from "~/hooks/use-customers";

const mutation = useCreateCustomer();
await mutation.mutateAsync(data);  // Guarda en PGlite + encola sync
// La UI no espera el sync, muestra éxito inmediatamente
```

**UX:** El usuario ve éxito inmediato. El sync pasa en background.

---

## 5.3 Ruta: /clientes/$id (Detalle)

**Archivo:** `app/routes/_protected.clientes.$id._index.tsx`

### Cambios

```typescript
// ANTES
const { data: customer } = useCustomer(params.id);

// DESPUÉS
const { data: customer } = useCustomer(params.id);  // Lee de PGlite
```

**Offline:** Si está offline, muestra los datos que tiene localmente.

---

## 5.4 Ruta: /clientes/$id/editar (Editar)

**Archivo:** `app/routes/_protected.clientes.$id.editar._index.tsx`

### Cambios

```typescript
// ANTES
const mutation = useUpdateCustomer();
await mutation.mutateAsync({ id, data });

// DESPUÉS
const mutation = useUpdateCustomer();
await mutation.mutateAsync({ id, data });  // Update local + encola sync
```

---

## 5.5 Ruta: /ventas/nueva (POS - Más Compleja)

**Archivo:** `app/routes/_protected.ventas.nueva._index.tsx`

### Cambios

```typescript
// ANTES
import { useCreateSale } from "~/hooks/use-sales";

const mutation = useCreateSale();
await mutation.mutateAsync({
  sale: { businessId, customerId, totalAmount },
  items: cartItems,
});

// DESPUÉS
import { useCreateSale } from "~/hooks/use-sales";

const mutation = useCreateSale();
await mutation.mutateAsync({
  sale: { businessId, customerId, totalAmount },
  items: cartItems,
});  // Guarda venta + items en PGlite, encola sync atómico
```

**Consideraciones:**
- El carrito se guarda en PGlite incluso si está offline
- El sync de venta + items es atómico (mismo sync_group_id)
- El usuario puede cerrar la app y la venta se sincronizará después

---

## 5.6 Ruta: /ventas/$id (Detalle de Venta)

**Archivo:** `app/routes/_protected.ventas.$id._index.tsx`

### Cambios

```typescript
// ANTES
const { data: sale } = useSale(params.id);

// DESPUÉS
const { data: sale } = useSale(params.id);  // Incluye items automáticamente

// Mostrar sync status
const { pending } = useSyncStatus();
if (sale?.syncStatus === 'pending') {
  return <Badge>Pendiente de sync</Badge>;
}
```

---

## 5.7 Ruta: /distribucion (Distribuciones)

**Archivo:** `app/routes/_protected.distribucion._index.tsx`

### Cambios

```typescript
// Similar a sales pero con distribuciones
const { data: distribuciones } = useDistribuciones(businessId);
const createMutation = useCreateDistribucion();
```

**Casos especiales:**
- Distribuciones son creadas por el admin
- Vendedores las reciben via sync (Electric)
- Vendedores actualizan kilos vendidos (offline-first)

---

## 5.8 Componente: SyncStatus (Nuevo)

**Archivo:** `app/components/sync/sync-status.tsx`

Nuevo componente para mostrar el estado de sincronización:

```typescript
export function SyncStatus() {
  const { pending, error, isOnline, forceSync } = useSyncStatus();

  if (!isOnline) {
    return <Badge variant="warning">Sin conexión</Badge>;
  }

  if (error > 0) {
    return <Badge variant="destructive">{error} errores</Badge>;
  }

  if (pending > 0) {
    return (
      <Badge variant="secondary" onClick={forceSync}>
        {pending} pendientes
      </Badge>
    );
  }

  return <Badge variant="success">Sincronizado</Badge>;
}
```

**Ubicación:** Header o barra inferior en todas las páginas protegidas.

---

## 5.9 Componente: ConflictResolver (Nuevo)

**Archivo:** `app/components/sync/conflict-resolver.tsx`

Modal para resolver conflictos manualmente:

```typescript
export function ConflictResolver() {
  const { data: conflicts } = useFailedOperations();
  const resolveMutation = useResolveConflict();

  if (!conflicts?.length) return null;

  return (
    <Dialog open={true}>
      <DialogTitle>Conflictos de sincronización</DialogTitle>
      {conflicts.map((conflict) => (
        <div key={conflict.id}>
          <p>{conflict.entityType} - {conflict.entityId}</p>
          <div className="flex gap-2">
            <Button onClick={() => resolveMutation.mutate({ 
              operationId: conflict.id, 
              resolution: 'server' 
            })}>
              Usar servidor
            </Button>
            <Button onClick={() => resolveMutation.mutate({ 
              operationId: conflict.id, 
              resolution: 'client' 
            })}>
              Usar local
            </Button>
          </div>
        </div>
      ))}
    </Dialog>
  );
}
```

---

## Checklist por Ruta

### Customers
- [ ] /clientes - Listado
- [ ] /clientes/nuevo - Crear
- [ ] /clientes/$id - Detalle
- [ ] /clientes/$id/editar - Editar

### Sales
- [ ] /ventas - Listado
- [ ] /ventas/nueva - Crear (POS)
- [ ] /ventas/$id - Detalle
- [ ] /ventas/$id/editar - Editar

### Products
- [ ] /productos - Listado
- [ ] /productos/nuevo - Crear
- [ ] /productos/$id/editar - Editar

### Purchases
- [ ] /compras - Listado
- [ ] /compras/nueva - Crear
- [ ] /compras/$id - Detalle

### Distribuciones
- [ ] /distribucion - Listado
- [ ] /distribucion/nueva - Crear (admin)

### Componentes Nuevos
- [ ] SyncStatus (mostrar en header)
- [ ] ConflictResolver (modal de conflictos)

---

## Testing

### Casos de Prueba

1. **Crear cliente offline**
   - Desconectar internet
   - Crear cliente
   - Verificar éxito inmediato
   - Reconectar
   - Verificar que aparece en el backend

2. **Crear venta offline**
   - Desconectar
   - Crear venta con items
   - Reconectar
   - Verificar venta + items completos en backend

3. **Editar mientras offline**
   - Editar cliente offline
   - Editar mismo cliente en backend (otro dispositivo)
   - Reconectar
   - Verificar detección de conflicto

4. **Sync automático**
   - Crear varios registros offline
   - Reconectar
   - Verificar que se sincronizan en orden

---

## Dependencias

- Tarea 4 (hooks implementados)
- Tarea 3 (servicios con funcionalidad completa)

## Bloquea

- Tarea 6 (testing final)

---

*Nota: Las rutas cambian imports pero el JSX se mantiene similar*
