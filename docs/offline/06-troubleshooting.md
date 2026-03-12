# Troubleshooting

> Guía de diagnóstico y solución de problemas comunes en el sistema offline-first

## Índice de Problemas

1. [Sync no funciona](#sync-no-funciona)
2. [Datos desaparecen](#datos-desaparecen)
3. [Performance lenta](#performance-lenta)
4. [Errores de Electric](#errores-de-electric)
5. [Queue no procesa](#queue-no-procesa)
6. [Conflictos de datos](#conflictos-de-datos)

---

## Sync no funciona

### Síntoma
Los datos no se sincronizan entre dispositivos o no aparecen actualizaciones del servidor.

### Diagnóstico

**Paso 1: Verificar conexión Electric**
```typescript
// En consola del browser
const pg = await getPGlite();
console.log('PGlite connected:', !!pg);
console.log('Electric extension:', pg.electric);
```

**Paso 2: Verificar shapes activos**
```typescript
// Listar shapes suscritos
console.log('Active shapes:', pg.electric.activeShapes);
```

**Paso 3: Verificar conexión de red**
```typescript
console.log('Online:', navigator.onLine);
console.log('Electric URL:', import.meta.env.VITE_ELECTRIC_URL);
```

### Soluciones

**A. Electric proxy no responde**
```bash
# Verificar que Electric proxy está corriendo
curl http://localhost:3000/v1/shape
# Debería retornar 200 o información de shape
```

**B. Auth token inválido**
```typescript
// Verificar token en headers
const token = localStorage.getItem('auth-token');
if (!token || isTokenExpired(token)) {
  // Redirigir a login
  redirect('/login');
}
```

**C. Filtro de tenant incorrecto**
```typescript
// Verificar que business_id está definido
console.log('Business ID:', currentBusinessId);

// Shape debe tener filtro
syncShapeToTable({
  shape: {
    table: 'customers',
    params: { where: `business_id = '${currentBusinessId}'` }  // REQUIRED
  }
});
```

---

## Datos desaparecen

### Síntoma
Datos que existían ya no aparecen en la UI.

### Causas Comunes

**1. Cambio de negocio sin re-sync**
```typescript
// PROBLEMA: Usuario cambia de negocio pero shapes siguen del anterior
function switchBusiness(newBusinessId) {
  // 1. Unsubscribe shapes antiguos
  unsubscribeOldShapes();
  
  // 2. Limpiar PGlite (opcional pero recomendado)
  await pg.exec('DELETE FROM customers');
  await pg.exec('DELETE FROM sales');
  
  // 3. Crear nuevo PGlite con namespace diferente
  const pg = await PGlite.create({
    dataDir: `idb://avileo-${newBusinessId}`  // Namespace por negocio
  });
  
  // 4. Suscribir shapes nuevos
  await startSync(pg, newBusinessId, token);
}
```

**2. Limpieza de IndexedDB**
```typescript
// Usuario limpió datos del sitio en browser
// SOLUCIÓN: Detectar y mostrar mensaje
if (isFirstRunAfterDataLoss()) {
  showMessage('Datos locales eliminados. Descargando nuevamente...');
  await initialSync();
}
```

**3. Shape unsubscribe accidental**
```typescript
// PROBLEMA: Cleanup function llamado accidentalmente
useEffect(() => {
  const shape = pg.electric.syncShapeToTable({...});
  
  return () => {
    // Asegurar que esto solo se llame en unmount real
    shape.unsubscribe();
  };
}, [dependency]);  // Verificar que dependency no cambia constantemente
```

---

## Performance lenta

### Síntoma
La app se siente lenta, queries tardan mucho, UI congelada.

### Diagnóstico

**Verificar tamaño de datos:**
```typescript
const checkDataSize = async () => {
  const customerCount = await db.select({ count: count() }).from(customers);
  const salesCount = await db.select({ count: count() }).from(sales);
  
  console.log('Customers:', customerCount[0].count);
  console.log('Sales:', salesCount[0].count);
  
  // Si > 5000 registros totales, considerar paginación
};
```

**Verificar queries sin índices:**
```sql
-- En PGlite, verificar queries lentas
EXPLAIN QUERY PLAN 
SELECT * FROM sales WHERE business_id = 'xyz' AND created_at > '2024-01-01';

-- Debería usar índice, no full table scan
```

### Soluciones

**A. Sin índices**
```typescript
// Agregar índices faltantes
await pg.exec(`
  CREATE INDEX IF NOT EXISTS idx_sales_business_date 
  ON sales(business_id, created_at);
`);
```

**B. Demasiados datos en shapes**
```typescript
// Limitar por fecha
syncShapeToTable({
  shape: {
    table: 'sales',
    params: {
      where: `business_id = '${bizId}' AND created_at > '${threeMonthsAgo}'`
    }
  }
});
```

**C. Memory leaks en React**
```typescript
// Asegurar cleanup de subscriptions
useEffect(() => {
  const unsubscribe = subscribeToChanges();
  return unsubscribe;  // IMPORTANTE
}, []);
```

---

## Errores de Electric

### Error: "Response already consumed"

**Causa:** Múltiples instancias de PGlite simultáneas

**Solución:**
```typescript
// Usar singleton pattern
let pgPromise: Promise<PGlite> | null = null;

export function getPGlite() {
  if (!pgPromise) {
    pgPromise = PGlite.create({...});
  }
  return pgPromise;
}
```

### Error: "Shape not found"

**Causa:** Shape key incorrecto o expirado

**Solución:**
```typescript
// Usar shapeKey consistente
syncShapeToTable({
  shape: { ... },
  table: 'customers',
  primaryKey: ['id'],
  shapeKey: `customers-${businessId}`  // Único por negocio
});
```

### Error: "Primary key required"

**Causa:** Olvidar especificar primaryKey en shape

**Solución:**
```typescript
// SIEMPRE incluir primaryKey
syncShapeToTable({
  shape: { table: 'sales' },
  table: 'sales',
  primaryKey: ['id']  // REQUIRED
});
```

---

## Queue no procesa

### Síntoma
Writes quedan en "Pendiente" y nunca se sincronizan.

### Diagnóstico

**Verificar queue:**
```typescript
// Listar pending writes
const writes = await getPendingWrites();
console.log('Pending writes:', writes.length);
console.log('First write:', writes[0]);

// Verificar attempts
writes.forEach(w => {
  if (w.attempts > 3) {
    console.error('Write failed permanently:', w);
  }
});
```

### Soluciones

**A. Event 'online' no dispara**
```typescript
// Agregar botón manual de retry
<button onClick={() => processWriteQueue()}>
  Sincronizar ahora ({pendingCount} pendientes)
</button>
```

**B. Error persistente en API**
```typescript
// Verificar logs de errores
const failedWrites = writes.filter(w => w.attempts > 0);
console.log('Failed writes:', failedWrites.map(w => ({
  id: w.id,
  error: w.lastError,
  endpoint: w.endpoint
})));
```

**C. IndexedDB corrupto**
```typescript
// Resetear queue (último recurso)
await clearQueue();
alert('Cola de sincronización reseteada. Algunos datos pueden haberse perdido.');
```

---

## Conflictos de datos

### Síntoma
Datos inconsistentes entre lo que ve el usuario y lo que está en servidor.

### Ejemplo de conflicto

**Usuario A (offline):**
- Cambia teléfono de cliente: "123" → "456"
- Guarda localmente

**Usuario B (online):**
- Cambia mismo cliente: nombre "Juan" → "Pedro"
- Guarda en servidor

**Usuario A vuelve online:**
- ¿Qué debería pasar?

### Solución esperada

Con last-write-wins:
```
Resultado final:
- Nombre: "Pedro" (User B, timestamp más reciente)
- Teléfono: "456" (User A, timestamp más reciente)
```

### Debug de conflictos

```typescript
// Log de cambios conflictivos
pg.electric.syncShapeToTable({
  shape: { ... },
  table: 'customers',
  onError: (error) => {
    console.error('Sync error:', error);
    // Enviar a servicio de logging
    logError({ type: 'sync_conflict', error, timestamp: Date.now() });
  }
});
```

---

## Checklist de Debugging

Cuando algo no funciona, verificar en orden:

### 1. Conectividad
- [ ] `navigator.onLine` es true
- [ ] Electric proxy responde (ping)
- [ ] Auth token válido y no expirado

### 2. Configuración
- [ ] businessId correcto en shapes
- [ ] primaryKey definido en cada shape
- [ ] Shape key único por negocio

### 3. Datos
- [ ] PGlite inicializado correctamente
- [ ] Tablas creadas con schema correcto
- [ ] Datos presentes en PGlite (query local)

### 4. Sync
- [ ] Shapes suscritos activamente
- [ ] No hay errores en onError callback
- [ ] Cambios en Postgres detectados por Electric

### 5. UI
- [ ] useLiveQuery re-ejecuta en cambios
- [ ] React re-renderiza correctamente
- [ ] No hay memory leaks

---

## Herramientas de Debug

### DevTools del Browser

```typescript
// Exponer para debugging en consola
window.debugOffline = {
  pg: () => getPGlite(),
  db: () => getDatabase(),
  queue: () => getPendingWrites(),
  checkSync: async () => {
    const pg = await getPGlite();
    return pg.electric.activeShapes;
  }
};

// Uso en consola:
// await window.debugOffline.queue()
// await window.debugOffline.checkSync()
```

### Logging

```typescript
// Agregar logging detallado en desarrollo
if (import.meta.env.DEV) {
  pg.electric.syncShapeToTable({
    shape: { ... },
    onInitialSync: () => console.log('[Electric] Initial sync complete'),
    onError: (e) => console.error('[Electric] Error:', e),
  });
}
```

---

## Contacto y Recursos

Si el problema persiste:

1. Revisar logs de Electric proxy
2. Verificar [documentación de Electric](https://electric-sql.com/docs)
3. Buscar en [GitHub issues](https://github.com/electric-sql/pglite/issues)
4. Preguntar en [Discord de Electric](https://discord.gg/electric-sql)

---

## Referencias

- [Arquitectura](./02-arquitectura.md)
- [Flujos de sync](./03-flujo-sync.md)
- [Testing](./07-testing.md)
