# Context — Storage Abstraction Refactor

## What

Refactorizar `drizzle-sync` para eliminar todo uso directo de `localStorage` y `window` APIs, reemplazándolas por abstracciones inyectables. Esto permite que la librería corra en React Native y Node.js, no solo en navegadores.

## Why

La librería tiene una abstracción `IKVStorage` + `StorageAdapter` bien diseñada, pero varias áreas la evitan y usan APIs de navegador directamente. Esto bloquea el uso en plataformas no-browser.

## Scope

**In:**
- `packages/drizzle-sync/src/client/device-fingerprint.ts`
- `packages/drizzle-sync/src/client/schema-hash.ts` (funciones legacy)
- `packages/drizzle-sync/src/client/database-init.ts` (paths legacy)
- `packages/drizzle-sync/src/client/sync-client-engine.ts` (`resetAndLogout`)
- `packages/drizzle-sync/src/pglite/coordination-coordinator.ts` (online/offline listeners)

**Out:**
- El `StorageAdapter` y `IKVStorage` existentes se mantienen y amplían
- La API pública de `SyncClientEngine` cambia solo lo necesario (campos opcionales con defaults)

## Estado verificado de hallazgos

| Área | Archivo | Problema | Severidad |
|------|---------|-----------|-----------|
| Device Identity | `device-fingerprint.ts:31-34,53-59` | `localStorage` directo con claves hardcodeadas `avileo_*` | Alta |
| Legacy fallback | `schema-hash.ts:54,93,123` | `typeof localStorage !== "undefined" ? localStorage : undefined` | Media |
| Legacy fallback | `database-init.ts:171,322` | Mismo pattern que schema-hash | Media |
| Navegación | `sync-client-engine.ts:728-730` | `window.location.reload/href` hardcodeados | Media |
| Conectividad | `coordination-coordinator.ts:215-216,260-263` | `window.addEventListener("online"/"offline")` | Media |

## Arquitectura objetivo

```
SyncClientEngine
├── storageAdapter: StorageAdapter    ← ya existe, usar siempre
├── deviceIdentity: IDeviceIdentity  ← NUEVO (inyectable)
├── navigator: INavigator            ← NUEVO (inyectable)
└── isOnline: () => boolean          ← ya existe como config
```

## Dependencias entre tareas

```
T1 (Device Identity)
 ├── T2 (Eliminar legacy localStorage fallback)
 ├── T3 (Abstraer window.location)
 └── T4 (Abstraer online/offline)
```

T1 es prerequisito porque establece el patrón de inyección que se repite en T2-T4. T2, T3, T4 son independientes entre sí y pueden ejecutarse en paralelo después de T1.
