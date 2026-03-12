# Testing Offline-First

> Estrategias y escenarios de testing para el sistema offline

## Tipos de Testing

1. [Unit Tests](#unit-tests)
2. [Integration Tests](#integration-tests)
3. [E2E Tests](#e2e-tests)
4. [Manual Testing](#manual-testing)

---

## Unit Tests

### PGlite Setup

```typescript
// __tests__/db.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '../engine/schema';

describe('Database', () => {
  let pg: PGlite;
  let db: ReturnType<typeof drizzle>;

  beforeEach(async () => {
    // In-memory para tests
    pg = await PGlite.create();
    db = drizzle(pg, { schema });
    
    // Crear tablas
    await pg.exec(`
      CREATE TABLE customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        business_id TEXT NOT NULL
      );
    `);
  });

  afterEach(async () => {
    await pg.close();
  });

  it('should insert and query customers', async () => {
    await db.insert(schema.customers).values({
      id: 'cust-1',
      name: 'Test Customer',
      businessId: 'biz-1'
    });

    const results = await db.select().from(schema.customers);
    
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Test Customer');
  });
});
```

### Write Queue

```typescript
// __tests__/write-queue.test.ts
describe('Write Queue', () => {
  beforeEach(async () => {
    // Limpiar IndexedDB
    await clearQueue();
  });

  it('should queue write when offline', async () => {
    // Simular offline
    Object.defineProperty(navigator, 'onLine', { value: false });
    
    await queueWrite('/api/customers', 'POST', { name: 'John' });
    
    const pending = await getPendingWrites();
    expect(pending).toHaveLength(1);
    expect(pending[0].endpoint).toBe('/api/customers');
  });

  it('should process queue when online', async () => {
    // Agregar a queue
    await saveToQueue({
      id: 'write-1',
      endpoint: '/api/customers',
      method: 'POST',
      body: { name: 'John' },
      attempts: 0
    });
    
    // Mock fetch exitoso
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    
    // Procesar
    const result = await processWriteQueue();
    
    expect(result.processed).toBe(1);
    expect(fetch).toHaveBeenCalledWith(
      '/api/customers',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should retry failed writes', async () => {
    await saveToQueue({
      id: 'write-1',
      endpoint: '/api/customers',
      attempts: 0
    });
    
    // Mock fetch fallido
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    await processWriteQueue();
    
    const pending = await getPendingWrites();
    expect(pending[0].attempts).toBe(1);
  });
});
```

---

## Integration Tests

### Sync Flow

```typescript
// __tests__/sync.integration.test.ts
describe('Sync Integration', () => {
  it('should sync data from server to client', async () => {
    // Setup: Crear datos en servidor
    await serverDb.insert(customers).values({
      id: 'cust-server',
      name: 'From Server',
      businessId: 'biz-1'
    });
    
    // Iniciar Electric sync
    const { pg, db } = await initDatabase();
    await startSync(pg, 'biz-1', token);
    
    // Esperar sync
    await waitFor(() => startSyncComplete(), { timeout: 5000 });
    
    // Verificar datos en cliente
    const localData = await db.select().from(customers);
    expect(localData).toContainEqual(
      expect.objectContaining({ id: 'cust-server' })
    );
  });

  it('should handle offline/online transition', async () => {
    const { db } = await initDatabase();
    
    // 1. Go offline
    simulateOffline();
    
    // 2. Create sale (should queue)
    await createSale({ total: 100 });
    
    // 3. Verify queued
    expect(await getPendingWrites()).toHaveLength(1);
    
    // 4. Go online
    simulateOnline();
    
    // 5. Wait for sync
    await waitFor(() => getPendingWrites().then(w => w.length === 0));
    
    // 6. Verify in server
    const serverData = await serverDb.select().from(sales);
    expect(serverData).toContainEqual(
      expect.objectContaining({ total: '100.00' })
    );
  });
});
```

---

## E2E Tests

### Playwright Tests

```typescript
// e2e/offline.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Offline Functionality', () => {
  test('should create sale offline and sync when online', async ({ page, context }) => {
    // 1. Login y navegar
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // 2. Go offline
    await context.setOffline(true);
    
    // 3. Crear venta
    await page.click('[data-testid="create-sale"]');
    await page.fill('[name="customer"]', 'Cliente Offline');
    await page.fill('[name="total"]', '150.00');
    await page.click('button[type="submit"]');
    
    // 4. Verificar estado offline
    await expect(page.locator('[data-testid="sale-status"]')).toContainText('Pendiente');
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // 5. Go online
    await context.setOffline(false);
    
    // 6. Esperar sync
    await expect(page.locator('[data-testid="sale-status"]')).toContainText('Sincronizado', {
      timeout: 10000
    });
    
    // 7. Refrescar y verificar persistencia
    await page.reload();
    await expect(page.locator('text=Cliente Offline')).toBeVisible();
  });

  test('should handle conflict resolution', async ({ page, context, browser }) => {
    // Usuario A en ventana 1
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await login(pageA, 'user-a@example.com');
    
    // Usuario B en ventana 2
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await login(pageB, 'user-b@example.com');
    
    // A: Editar offline
    await contextA.setOffline(true);
    await pageA.click('text=Editar Cliente');
    await pageA.fill('[name="phone"]', '999-000-111');
    await pageA.click('text=Guardar');
    
    // B: Editar online
    await pageB.click('text=Editar Cliente');
    await pageB.fill('[name="name"]', 'Nombre Cambiado');
    await pageB.click('text=Guardar');
    
    // A: Volver online
    await contextA.setOffline(false);
    await pageA.waitForTimeout(3000); // Esperar sync
    
    // Verificar: Ambos cambios deberían aplicarse
    await pageA.reload();
    await expect(pageA.locator('[data-testid="customer-phone"]')).toContainText('999-000-111');
    await expect(pageA.locator('[data-testid="customer-name"]')).toContainText('Nombre Cambiado');
  });

  test('should sync initial data on first load', async ({ page }) => {
    // Limpiar datos previos
    await page.evaluate(() => {
      indexedDB.deleteDatabase('avileo-pg');
    });
    
    await page.goto('/login');
    await login(page);
    
    // Verificar indicador de sync
    await expect(page.locator('[data-testid="sync-loading"]')).toBeVisible();
    
    // Esperar completar
    await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible({
      timeout: 30000
    });
    
    // Verificar datos cargados
    const customerCount = await page.locator('[data-testid="customer-row"]').count();
    expect(customerCount).toBeGreaterThan(0);
  });
});
```

---

## Manual Testing

### Checklist de Testing Manual

#### Setup inicial
- [ ] App carga correctamente
- [ ] Sync inicial completa en < 10s
- [ ] Datos visibles después de sync
- [ ] No errores en consola

#### Operaciones Online
- [ ] Crear cliente → aparece inmediatamente
- [ ] Crear venta → se guarda correctamente
- [ ] Editar cliente → cambios persisten
- [ ] Eliminar → soft delete funciona
- [ ] Búsqueda funciona rápidamente

#### Operaciones Offline
- [ ] Desconectar wifi
- [ ] Crear cliente → muestra "Pendiente"
- [ ] Crear venta → aparece en lista con badge
- [ ] Editar cliente existente → funciona
- [ ] Ver datos anteriores → disponibles
- [ ] Reconectar → auto-sync
- [ ] Verificar datos sync'd correctamente

#### Escenarios Edge
- [ ] Cerrar app offline, reabrir, conectar
- [ ] Múltiples cambios offline (10+)
- [ ] Cambio de negocio
- [ ] Token expirado durante offline
- [ ] Datos muy grandes (>1000 ventas)

#### UI/UX
- [ ] Estados de loading claros
- [ ] Indicadores de sync visibles
- [ ] Mensajes de error útiles
- [ ] Acciones deshabilitadas cuando apropiado
- [ ] Animaciones de transición suaves

### Performance Testing

```bash
# Verificar bundle size
npm run build
ls -lh dist/assets/*.js

# Debería ser:
# - vendor.js: ~800KB (incluye PGlite ~2.6MB compressed)
# - app.js: ~200KB
# Total: ~1MB (aceptable para app offline-first)

# Lighthouse audit
npm run lighthouse
# Targets:
# - Performance: > 70
# - PWA: > 90
# - Best Practices: > 90
```

---

## Métricas Críticas

### Performance Targets

| Métrica | Target | Alerta |
|---------|--------|--------|
| Initial sync | < 5s | > 10s |
| Query local | < 50ms | > 200ms |
| Write API | < 300ms | > 1s |
| Bundle size | < 2MB | > 3MB |
| Memory usage | < 100MB | > 200MB |
| Queue process | < 1s/item | > 5s/item |

### Monitoreo en Producción

```typescript
// Enviar métricas a analytics
if (import.meta.env.PROD) {
  // Sync performance
  analytics.track('sync_complete', {
    duration: syncDuration,
    records_synced: recordCount,
    business_id: businessId
  });
  
  // Queue depth
  analytics.track('queue_depth', {
    pending_writes: pendingCount,
    failed_writes: failedCount
  });
  
  // Errors
  window.addEventListener('error', (e) => {
    analytics.track('sync_error', {
      message: e.message,
      stack: e.stack
    });
  });
}
```

---

## Testing Checklist Pre-Release

### Funcionalidad
- [ ] Todas las operaciones CRUD funcionan online
- [ ] Todas las operaciones CRUD funcionan offline
- [ ] Sync automático al volver online
- [ ] Conflictos resueltos correctamente
- [ ] Cambio de negocio limpia datos

### Robustez
- [ ] App funciona con conexión intermitente
- [ ] Recupera de errores de red
- [ ] No pierde datos en crash
- [ ] Límites de tamaño manejados

### UX
- [ ] Feedback claro de estado
- [ ] Sin errores visibles al usuario
- [ ] Performance aceptable en device lento
- [ ] Accesibilidad (screen readers, etc)

### Seguridad
- [ ] Datos de negocio A no visibles en negocio B
- [ ] Token refresca correctamente
- [ ] Datos sensibles no en logs
- [ ] HTTPS obligatorio

---

## Referencias

- [Arquitectura](./02-arquitectura.md)
- [Troubleshooting](./06-troubleshooting.md)
- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
