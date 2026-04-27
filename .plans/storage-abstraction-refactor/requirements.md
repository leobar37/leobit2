# Requirements — Storage Abstraction Refactor

## R-001: Abstracción de Device Identity

**Descripción**: `device-fingerprint.ts` no debe usar `localStorage` directo. Debe existir una interfaz `IDeviceIdentity` inyectable.

**Criterios de aceptación**:
- Interfaz `IDeviceIdentity` con métodos: `getDeviceId()`, `getFingerprint()`, `clear()`, `regenerate()`
- Clase `LocalStorageDeviceIdentity` que implemente la interfaz usando `StorageAdapter` internamente
- Factory `createDeviceIdentity(config?)` exportable
- Claves de storage deben usar prefijo configurable (default `drizzle_sync`), no `avileo_`
- `SyncClientEngine` recibe `deviceIdentity?: IDeviceIdentity` en config y lo usa en vez del módulo directo
- El módulo `device-fingerprint.ts` existente se marca `@deprecated` y re-exporta la nueva implementación
- En Node.js/React Native sin localStorage, `createDeviceIdentity()` devuelve una implementación in-memory

## R-002: Eliminar paths legacy en schema-hash y database-init

**Descripción**: Las funciones sueltas `hasSchemaChanged`, `saveSchemaHash`, `clearSchemaHash`, `initPgliteDatabase` y `resetDatabase` no deben caer en `localStorage` como fallback implícito cuando no se pasa un adapter.

**Criterios de aceptación**:
- `hasSchemaChanged`, `saveSchemaHash`, `clearSchemaHash` en `schema-hash.ts` solo aceptan `StorageAdapter` (no options legacy con storage inline). El fallback legacy se elimina.
- `initPgliteDatabase` y `resetDatabase` en `database-init.ts` similarly usan `StorageAdapter` cuando se provee; si no se provee, crean uno con `createStorageAdapter()` que internamente usa `createLocalStorageBackend()` (que ya tiene fallback no-op).
- Audit en `packages/app` que confirme que ningún consumidor llama estas funciones con el path legacy (debe verificarse antes de borrar el branch).
- Breaking change: consumers que usaban el path legacy sin pasar `storageAdapter` empezarán a usar `createLocalStorageBackend()` — comportamiento idéntico en browser, no-op en SSR.

## R-003: Abstraer navegación post-logout

**Descripción**: `resetAndLogout` en `SyncClientEngine` no debe referenciar `window.location` directamente.

**Criterios de aceptación**:
- Nueva interfaz `INavigator` con métodos: `reload()`, `redirect(url: string)`
- Nuevo campo `navigator?: INavigator` en `SyncClientEngineConfig`
- `SyncClientEngine` recibe el navigator y lo usa en `resetAndLogout` líneas 728-730
- Browser: se inyecta `window.location` como default
- React Native / test: consumer inyecta su propio navigator
- `redirectUrl`, `reloadPage` y `preserveSession` se mantienen como parámetros de `resetAndLogout` para backward compatibility de la firma pública

## R-004: Abstraer detección de conectividad

**Descripción**: `SyncCoordinator` no debe suscribirse directamente a `window.addEventListener("online"/"offline")`.

**Criterios de aceptación**:
- Eliminar `window.addEventListener("online", ...)` y `window.addEventListener("offline", ...)` de `coordination-coordinator.ts` líneas 214-216 y 258-263
- La función `isOnline` ya existe en config (`SyncCoordinatorOptions`). Se convierte en la única fuente de verdad para el estado de conectividad.
- El `SyncCoordinator` no subscribe a ningún evento interno; delega esa responsabilidad a la capa de consumo (quien construya el coordinator decide cómo obtener el estado online)
- `SyncClientEngine` pasa `() => navigator.onLine` como default (browser), o la función que el consumer provea en su config
