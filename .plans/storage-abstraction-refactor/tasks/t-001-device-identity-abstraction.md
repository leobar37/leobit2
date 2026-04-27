# T-001 — Device Identity Abstraction

## Objective

Reemplazar el uso directo de `localStorage` en `device-fingerprint.ts` con una interfaz `IDeviceIdentity` inyectable, usando `StorageAdapter` internamente. Establece el patrón de inyección que se repetirá en T-002, T-003 y T-004.

## Scope

**In:**
- `packages/drizzle-sync/src/client/device-fingerprint.ts` (actual)
- `packages/drizzle-sync/src/client/storage/types.ts` (extender)

**Out:**
- `packages/drizzle-sync/src/client/device-identity.ts` (nuevo archivo — interfaz + implementación + factory)
- `packages/drizzle-sync/src/client/types.ts` (nuevo campo en `SyncClientEngineConfig`)
- `packages/drizzle-sync/src/client/sync-client-engine.ts` (usar `IDeviceIdentity` en vez del módulo directo)

## Requirements

- R-001

## Steps

1. **Crear `packages/drizzle-sync/src/client/device-identity-types.ts`**
   - Definir interfaz `IDeviceIdentity`:
     ```typescript
     export interface IDeviceIdentity {
       getDeviceId(): string;
       getFingerprint(): string;
       clear(): void;
       regenerate(): { deviceId: string; fingerprint: string };
     }
     ```
   - Definir `DeviceIdentityOptions`:
     ```typescript
     export interface DeviceIdentityOptions {
       prefix?: string;   // default "drizzle_sync"
       namespace?: string;
     }
     ```
   - Claves de storage: `drizzle_sync_device_id` y `drizzle_sync_device_fingerprint` (o con namespace: `drizzle_sync:ns_device_id`)

2. **Crear `packages/drizzle-sync/src/client/device-identity.ts`**
   - Clase `LocalStorageDeviceIdentity implements IDeviceIdentity` que recibe `StorageAdapter` en el constructor (no llama `localStorage` directo)
   - Factory `createDeviceIdentity(adapter: IKVStorage, options?: DeviceIdentityOptions): IDeviceIdentity`
   - Factory `createInMemoryDeviceIdentity(): IDeviceIdentity` — implementación in-memory para SSR/Node.js
   - Factory `createDeviceIdentityFromConfig(storage: StorageConfig): IDeviceIdentity` — convenience que crea el adapter y luego el identity

3. **Actualizar `packages/drizzle-sync/src/client/types.ts`**
   - En `SyncClientEngineConfig`, agregar campo:
     ```typescript
     deviceIdentity?: IDeviceIdentity;
     ```
   - El engine usa `config.deviceIdentity ?? createDeviceIdentity(...)` con el storage adapter ya disponible

4. **Refactorizar `device-fingerprint.ts`**
   - Marcar el archivo como `@deprecated`
   - Las funciones exportadas (`getDeviceId()`, `getDeviceFingerprint()`, etc.) deben delegar a una instancia global de `IDeviceIdentity` que use `StorageAdapter` con defaults
   - O mejor: re-exportar `createDeviceIdentity` del nuevo archivo como la API pública
   - Eliminar las constantes `DEVICE_ID_KEY` y `DEVICE_FINGERPRINT_KEY` hardcodeadas

5. **Exponer en `packages/drizzle-sync/src/index.ts`**
   - Exportar `IDeviceIdentity`, `createDeviceIdentity`, `createInMemoryDeviceIdentity`

6. **Actualizar el exports de `packages/drizzle-sync/src/client/index.ts`** si existe

## Validation

- `device-fingerprint.ts` ya no llama `localStorage` directo en ninguna línea
- `device-identity.ts` existe y exporta `IDeviceIdentity`, `createDeviceIdentity`, `createInMemoryDeviceIdentity`
- `SyncClientEngine` recibe `deviceIdentity` de config y lo guarda como campo privado
- Las claves de storage usan prefijo configurable, no `avileo_`
- En test: `createInMemoryDeviceIdentity()` retorna instancia funcional que no toca `localStorage`
