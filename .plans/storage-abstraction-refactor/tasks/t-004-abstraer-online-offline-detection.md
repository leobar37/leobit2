# T-004 — Abstraer Online/Offline Detection

## Objective

Eliminar los `window.addEventListener("online"/"offline")` en `SyncCoordinator` y hacer que la detección de conectividad sea responsabilidad exclusiva de la capa de consumo (quien construye y configura el coordinator).

## Scope

**In:**
- `packages/drizzle-sync/src/pglite/coordination-coordinator.ts` (líneas ~214-216, ~258-263)
- `packages/drizzle-sync/src/pglite/coordination-types.ts` o equivalente (opciones del coordinator)

**Out:**
- El coordinator no subscribe a eventos `online`/`offline` de `window`

## Requirements

- R-004

## Steps

1. **Auditar cómo `SyncCoordinator` usa `isOnline`**

   Leer `SyncCoordinatorOptions` para ver cómo está definido `isOnline` actualmente. En `sync-client-engine.ts` se pasa `() => navigator.onLine` como default. Verificar que esa función ya es la fuente de verdad para el estado online.

2. **Eliminar `window.addEventListener` en `coordination-coordinator.ts`**

   En el método `start()` (~línea 214-216):
   ```typescript
   // ELIMINAR estos dos:
   window.addEventListener("online", this.handleOnline);
   window.addEventListener("offline", this.handleOffline);
   ```

   En `stop()` (~línea 258-263):
   ```typescript
   // ELIMINAR:
   window.removeEventListener("online", this.handleOnline);
   window.removeEventListener("offline", this.handleOffline);
   ```

3. **Eliminar los handlers `handleOnline` y `handleOffline` si ya no se usan**

   Si después de quitar los listeners estos métodos quedan huérfanos, eliminarlos también. Si todavía se usan en algún otro flujo (e.g. el coordinator recibe llamadas explícitas a `onOnline`/`onOffline`), conservarlos pero sin la suscripción a window.

4. **Verificar `SyncClientEngine` como fuente de `isOnline`**

   En `sync-client-engine.ts`, cuando crea `SyncCoordinator`, pasa `isOnline: () => navigator.onLine` como default. Confirmar que esto sigue siendo el único mecanismo para el coordinator.

   Si el engine tiene subscription a visibility change o similar que también podría romper, revisarlo — pero por ahora el scope es solo `window.addEventListener("online"/"offline")`.

5. **Añadir guard `typeof window !== "undefined"` donde se quitaron los listeners** (defensivo)

   Para que el coordinator no crashee si se instancia en un contexto SSR. El guard ya existe en algunos otros lugares del archivo — aplicarlo consistentemente.

## Validation

- `coordination-coordinator.ts` no tiene `window.addEventListener` ni `window.removeEventListener` en ninguna línea
- `SyncCoordinator` sigue funcionando correctamente cuando `isOnline()` retorna true/false desde el exterior
- En browser: `navigator.onLine` sigue siendo la fuente de conectividad (a través de `SyncClientEngine`)
- En React Native: consumer provee su propia función `isOnline` via reachability API
- El coordinator no crashea en SSR (donde `window` no existe)
