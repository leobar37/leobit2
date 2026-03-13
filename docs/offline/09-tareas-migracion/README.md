# Tareas de Migración PGlite

> **Estado:** Planificación completa  
> **Total estimado:** 24-31 días (~4-5 semanas)

---

## Resumen de Tareas

| # | Tarea | Duración | Dependencias | Riesgo |
|---|-------|----------|--------------|--------|
| **0** | [Framework de Sync](./00-framework-sync.md) | 3-4 días | Ninguna | 🔴 Alto |
| **1** | [Schema y Tablas](./01-schema-tablas.md) | 2-3 días | T0 | 🟡 Medio |
| **2** | [SyncService](./02-sync-service.md) | 4-5 días | T0, T1 | 🔴 Alto |
| **3** | [Servicios de Entidades](./03-servicios-entidades.md) | 5-6 días | T1, T2 | 🟡 Medio |
| **4** | [Hooks UI](./04-hooks-ui.md) | 3-4 días | T3 | 🟢 Bajo |
| **5** | [Rutas](./05-rutas-ui.md) | 4-5 días | T4 | 🟢 Bajo |
| **6** | [Migración y Cleanup](./06-migracion-cleanup.md) | 2-3 días | T5 | 🟡 Medio |

---

## Arquitectura Final

```
app/
├── services/              # Lógica de negocio + sync
│   ├── sync.service.ts    # Motor de sincronización
│   ├── customer.service.ts
│   ├── sale.service.ts    # Con manejo de items
│   └── ...
│
├── hooks/                 # Adaptadores React
│   ├── use-customers.ts
│   ├── use-sales.ts
│   └── use-sync-status.ts
│
├── engine/                # Infraestructura
│   ├── db.ts             # PGlite + tablas SQL
│   └── schema.ts         # Re-export de @avileo/shared
│
└── routes/               # UI (migrada gradualmente)
    ├── _protected.clientes.tsx
    ├── _protected.ventas.nueva.tsx
    └── ...
```

---

## Principios Clave

1. **Local-First:** Todo escribe a PGlite primero, sync después
2. **Sync Atómico:** Entidades relacionadas usan mismo sync_group_id
3. **6 Estados:** local → pending → syncing → synced/error/conflict
4. **Conflictos:** Server-wins por defecto, merge para datos de usuario
5. **Retry:** Exponential backoff, dead letter después de 5 intentos

---

## Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Sync complejo | Alto | Pruebas manuales extensivas |
| Performance | Medio | Batch size 50, chunked sync |
| Storage lleno | Medio | Limpiar synced operations |
| Datos corruptos | Alto | Transacciones, rollback |
| Rollback necesario | Bajo | Backup antes de migración |

---

## Próximos Pasos

1. **Revisar** documento T0 (Framework Sync)
2. **Decidir** si empezar implementación
3. **Asignar** responsables por tarea
4. **Crear** branch de feature
5. **Comenzar** con T0 (es la base de todo)

---

*Plan creado: 12 de Marzo 2026*  
*Framework: Local-first offline-first sync robusto*
