# Tarea 6: Migración de Datos y Cleanup

> **Dependencias:** Tarea 5  
> **Duración:** 2-3 días  

---

## 6.1 Migración de Datos

### Estrategia

**Opción A: Migración Total (Recomendada)**
- Ejecutar script `migrate-to-pglite.ts`
- Migra TODO el histórico de TanStack DB a PGlite
- Mantiene consistencia
- Toma más tiempo

**Opción B: Sincronización desde Cero**
- Limpiar IndexedDB
- Dejar que Electric sync traiga datos del servidor
- Más rápido
- Pierde datos no syncados en TanStack

### Proceso de Migración

```bash
# 1. Backup de TanStack DB
bun scripts/backup-tanstack-db.ts

# 2. Ejecutar migración
bun scripts/migrate-to-pglite.ts ./backups/backup-2026-03-12.json

# 3. Verificar integridad
bun scripts/verify-migration.ts
```

### Checklist de Migración

- [ ] Backup completo de TanStack DB
- [ ] Script de migración ejecutado
- [ ] Todas las tablas migradas
- [ ] Relaciones preservadas (ventas + items)
- [ ] Sync status en 'synced' para datos ya confirmados
- [ ] Reporte de migración generado
- [ ] Plan de rollback preparado

---

## 6.2 Cleanup

### Archivos a Eliminar

```bash
# Colecciones de TanStack
rm -rf app/lib/db/collections/
rm app/lib/db/electric-client.tsx
rm app/lib/db/backup-tanstack-db.ts
rm app/lib/db/sync-manager.ts
rm app/lib/db/conflict-resolution.ts

# Hooks antiguos de TanStack
rm app/hooks/use-customers.ts  # El viejo
rm app/hooks/use-sales.ts      # El viejo
rm app/hooks/use-products.ts   # El viejo
# ... etc

# Renombrar hooks nuevos (quitar -pglite)
mv use-customers-pglite.ts use-customers.ts
mv use-sales-pglite.ts use-sales.ts
# ... etc
```

### Dependencias a Eliminar

```json
// package.json
{
  "dependencies": {
    // ELIMINAR:
    "@tanstack/db": "^0.5.31",
    "@tanstack/electric-db-collection": "^0.2.39",
    "@tanstack/react-db": "^0.1.75"
  }
}
```

```bash
bun remove @tanstack/db @tanstack/electric-db-collection @tanstack/react-db
```

---

## 6.3 Documentación Final

### README de Migración

**Archivo:** `docs/offline/09-tareas-migracion/README.md`

```markdown
# Migración a PGlite - Resumen

## Estado
✅ Completado: [Fecha]

## Cambios Principales
- ✅ Framework de sync robusto (6 estados)
- ✅ Sync bidireccional (Electric + Write Queue)
- ✅ Atómico para entidades relacionadas
- ✅ Resolución de conflictos
- ✅ Dead letter queue

## Arquitectura
- Frontend: PGlite + Drizzle ORM
- Sync: Local-first, batch processing
- Backend: API batch con idempotencia

## Rollback
Si es necesario rollback:
1. Restaurar backup de TanStack DB
2. Revertir commits [X..Y]
3. Limpiar IndexedDB: await indexedDB.deleteDatabase('/idb/avileo-pg')
```

---

## 6.4 Checklist Final

### Funcionalidad
- [ ] Todas las rutas funcionan
- [ ] Offline mode funciona
- [ ] Sync automático funciona
- [ ] Conflictos se detectan y resuelven
- [ ] Dead letter queue accesible
- [ ] Performance aceptable en móvil

### Testing Manual
- [ ] Flujo de venta completo probado manualmente
- [ ] Sync offline → online verificado
- [ ] Resolución de conflictos funciona
- [ ] Dead letter queue accesible

### Cleanup
- [ ] Código de TanStack eliminado
- [ ] Dependencias removidas
- [ ] Imports actualizados
- [ ] Bundle size verificado

### Documentación
- [ ] README de migración
- [ ] Guía de troubleshooting
- [ ] API de servicios documentada
- [ ] Decisiones arquitectónicas documentadas

---

## Tiempo Total Estimado

| Fase | Duración |
|------|----------|
| Framework Sync (T0) | 3-4 días |
| Schema + Tablas (T1) | 2-3 días |
| SyncService (T2) | 4-5 días |
| Servicios Entidades (T3) | 5-6 días |
| Hooks (T4) | 3-4 días |
| Rutas (T5) | 4-5 días |
| Migración + Cleanup (T6) | 2-3 días |
| **TOTAL** | **23-30 días** (~4-5 semanas) |

---

## Notas

- **Riesgo principal:** Complejidad del framework de sync
- **Mitigación:** Pruebas manuales extensivas en cada fase
- **Rollback:** Siempre posible volver a TanStack
- **Beneficio:** Arquitectura más robusta y mantenible

---

*Última tarea - Proyecto completo*
