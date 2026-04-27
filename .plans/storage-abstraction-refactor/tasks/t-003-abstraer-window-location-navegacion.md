# T-003 — Abstraer window.location Navegación

## Objective

Reemplazar `window.location.reload()` y `window.location.href` en `resetAndLogout` con una interfaz `INavigator` inyectable, para que la librería no tenga conocimiento directo de `window.location`.

## Scope

**In:**
- `packages/drizzle-sync/src/client/sync-client-engine.ts` (líneas ~697-731)
- `packages/drizzle-sync/src/client/types.ts` (`SyncClientEngineConfig`)

**Out:**
- `INavigator` interface definida en `types.ts`
- Nuevo campo `navigator?: INavigator` en `SyncClientEngineConfig`
- `SyncClientEngine.resetAndLogout` usa `this.navigator` en vez de `window.location`

## Requirements

- R-003

## Steps

1. **Definir `INavigator` en `packages/drizzle-sync/src/client/types.ts`**

   ```typescript
   export interface INavigator {
     reload(): void;
     redirect(url: string): void;
   }
   ```

2. **Agregar campo en `SyncClientEngineConfig` en `types.ts`**

   ```typescript
   navigator?: INavigator;
   ```

3. **En `sync-client-engine.ts` — constructor**

   Guardar el navigator:
   ```typescript
   this.navigator = config.navigator ?? createBrowserNavigator();
   ```

   Crear la factory justo antes o después de la clase:
   ```typescript
   function createBrowserNavigator(): INavigator {
     return {
       reload: () => window.location.reload(),
       redirect: (url) => { window.location.href = url; },
     };
   }
   ```

4. **Refactorizar `resetAndLogout`** (~líneas 727-731)

   Cambiar:
   ```typescript
   if (reloadPage) {
     window.location.reload();
   } else {
     window.location.href = redirectUrl;
   }
   ```
   Por:
   ```typescript
   if (reloadPage) {
     this.navigator.reload();
   } else {
     this.navigator.redirect(redirectUrl);
   }
   ```

   Mantener `redirectUrl`, `reloadPage` como parámetros públicos — son la API del consumer. El navigator abstraction vive internamente.

5. **Verificar que el método compile**

   TypeScript infiere que `this.navigator` existe en `resetAndLogout`.

## Validation

- `sync-client-engine.ts` no tiene `window.location` en ninguna línea después del cambio
- `SyncClientEngineConfig` tiene campo `navigator?: INavigator`
- `resetAndLogout` funciona igual en browser (default `createBrowserNavigator`)
- Para React Native: consumer inyecta `{ reload: () => { /* Navigation.navigation(...) */ }, redirect: (url) => navigate(url) }`
