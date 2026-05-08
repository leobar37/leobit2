# Task: Replicar Elena CLI Dashboard + Port Management en Avileo

## OBJETIVO

Crear un CLI (`packages/cli/`) en el monorepo Avileo que replique exactamente la estrategia de Elena:
- Descubrimiento y gestión de puertos sin colisiones
- Process manager que spawnea servicios, captura stdout/stderr, health checks
- Dashboard web React con logs en tiempo real vía SSE
- Comandos: `dev`, `logs`, `status`, `dashboard`

## ESTRUCTURA DEL MONOREPO AVILEO

```
avileo/
├── packages/
│   ├── app/          # React Router v7 frontend -> dev: "react-router dev"
│   ├── backend/      # ElysiaJS API -> dev: "bun run --watch --no-clear-screen src/index.ts"
│   └── shared/       # Tipos compartidos (no se ejecuta como servicio)
├── package.json      # Root con turbo
└── turbo.json
```

## SERVICIOS A GESTIONAR (solo 2, no 5 como Elena)

| Servicio | Package Dir       | Puerto Default | Comando Dev                                      |
|----------|-------------------|----------------|--------------------------------------------------|
| backend  | packages/backend  | 3000           | `bun run --watch --no-clear-screen src/index.ts` |
| app      | packages/app      | 3002           | `react-router dev`                               |

Dashboard usa puerto fijo **5174** (igual que Elena).

## ARCHIVOS A CREAR

Crea TODOS los siguientes archivos. Copia el contenido de `/Users/leobar37/code/elena/packages/cli/` y adapta SOLO lo indicado en la sección "ADAPTACIONES".

### 1. `packages/cli/package.json`

```json
{
  "name": "@avileo/cli",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "bin": {
    "avileo": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "dashboard:build": "vite build --config dashboard/vite.config.ts",
    "dashboard:dev": "vite --config dashboard/vite.config.ts"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^12.1.0",
    "elysia": "1.4.18",
    "ora": "^8.1.1",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/react": "^19.2.2",
    "@types/react-dom": "^19.2.2",
    "@vitejs/plugin-react": "^4.4.1",
    "typescript": "^5",
    "vite": "^7.1.7"
  }
}
```

### 2. `packages/cli/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"]
}
```

### 3. `packages/cli/src/index.ts`

Copia EXACTO de `/Users/leobar37/code/elena/packages/cli/src/index.ts`. Cambios:
- `program.name("avileo")` en vez de `"elena"`
- `program.description("CLI de Avileo - Gestión de negocios")`
- Solo importa y registra estos comandos: `dev`, `logs`, `status`, `dashboard`
- NO incluir `start`, `build`, `db`, `reload`

### 4. `packages/cli/src/types/index.ts`

Copia EXACTO de `/Users/leobar37/code/elena/packages/cli/src/types/index.ts`. Sin cambios.

### 5. `packages/cli/src/services/logger.ts`

Copia EXACTO de `/Users/leobar37/code/elena/packages/cli/src/services/logger.ts`. Cambios:
- `COLORS` solo necesita `backend` y `app` (quita `web`, `cli`)

### 6. `packages/cli/src/services/port-discovery.ts`

Copia EXACTO de `/Users/leobar37/code/elena/packages/cli/src/services/port-discovery.ts`. Cambios:
- `DiscoveredPorts` interface: solo `backend`, `app`, `dashboard` (quita `web`, `whatsapp`)
- `DEFAULT_PORTS`: solo `{ backend: 3000, app: 3002, dashboard: 3099 }`
- `discoverAllPorts()`: solo descubre backend, app, dashboard. El dashboard mantiene puerto fijo 5174.

### 7. `packages/cli/src/services/config-manager.ts`

Copia EXACTO de `/Users/leobar37/code/elena/packages/cli/src/services/config-manager.ts`. Cambios:
- `ElenaConfig` interface → renombrar a `AvileoConfig`
- `services` solo tiene `backend`, `app`, `dashboard` (quita `web`, `whatsapp`)
- `syncFrontendEnvFiles()`: solo sincroniza `packages/app/.env` con `VITE_API_URL=http://localhost:${ports.backend}`. Elimina la parte de `packages/web/.env` y `VITE_WEB_URL`.
- Elimina `detectBackendHost()` o simplifícalo a solo devolver `"localhost"`.

### 8. `packages/cli/src/services/config-resolver.ts`

Copia EXACTO de `/Users/leobar37/code/elena/packages/cli/src/services/config-resolver.ts`. Cambios:
- `DEFAULT_PORTS`: `{ backend: 3000, app: 3002, dashboard: 5174 }`
- `COLORS`: `{ backend: "#22c55e", app: "#3b82f6" }`
- `buildServices()`: solo backend y app en el array
- `getAllServiceNames()`: `return ["backend", "app"]`
- `getServiceCwd()`: usa `path.resolve(process.cwd(), "packages", packageDir)` (sin quitar prefijo `@avileo/` ya que las carpetas se llaman igual que el package name sin scope)

### 9. `packages/cli/src/services/process-manager.ts`

Copia EXACTO de `/Users/leobar37/code/elena/packages/cli/src/services/process-manager.ts`. Cambios:
- Elimina toda referencia a `whatsappPort` y `WHATSAPP_SERVICE_URL`
- `getDevCommand()`:
  ```ts
  private getDevCommand(service: ServiceDefinition): string[] {
    if (service.name === "app") {
      return ["bun", "run", "react-router", "dev", "--port", String(service.port)];
    }
    // backend
    return ["bun", "run", "--watch", "--no-clear-screen", "src/index.ts"];
  }
  ```
- En `spawn()`, elimina el bloque de `WHATSAPP_SERVICE_URL`
- Mantén el bloque de `CORS_ORIGINS` pero solo con `app`:
  ```ts
  if (service.name === "backend") {
    const config = loadConfig();
    if (config) {
      const origins: string[] = [];
      if (config.services.app?.url) origins.push(config.services.app.url);
      if (origins.length > 0) {
        env.CORS_ORIGINS = origins.join(",");
      }
    }
  }
  ```
- `markServiceRunning(name, running)`: el tipo del parámetro name debe ser `keyof AvileoConfig["services"]`

### 10. `packages/cli/src/services/log-writer.ts`

Copia EXACTO de `/Users/leobar37/code/elena/packages/cli/src/services/log-writer.ts`. Sin cambios.

### 11. `packages/cli/src/services/log-reader.ts`

Copia EXACTO de `/Users/leobar37/code/elena/packages/cli/src/services/log-reader.ts`. Cambios:
- `services` default array: `["backend", "app"]` (quita `"web"`, `"whatsapp"`)
- En `getLogStats()` lo mismo: default `["backend", "app"]`

### 12. `packages/cli/src/services/log-server.ts`

Copia EXACTO de `/Users/leobar37/code/elena/packages/cli/src/services/log-server.ts`. Sin cambios (la ruta `packages/cli/dist/dashboard` es igual, y sirve los mismos endpoints).

### 13. `packages/cli/src/services/dashboard-builder.ts`

Copia EXACTO de `/Users/leobar37/code/elena/packages/cli/src/services/dashboard-builder.ts`. Sin cambios. Las rutas `packages/cli/dashboard` y `packages/cli/dist/dashboard` son iguales.

### 14. `packages/cli/src/services/browser-launcher.ts`

Copia EXACTO de `/Users/leobar37/code/elena/packages/cli/src/services/browser-launcher.ts`. Sin cambios.

### 15. `packages/cli/src/commands/dev.ts`

Copia EXACTO de `/Users/leobar37/code/elena/packages/cli/src/commands/dev.ts`. Cambios:
- Reemplaza `"Elena"` por `"Avileo"` en mensajes
- `--only`: servicios válidos son `["backend", "app"]`
- Quita el `whatsappPort` del `spawnAll`:
  ```ts
  await manager.spawnAll(toStart);
  ```
  En vez de `await manager.spawnAll(toStart, { whatsappPort: ports.whatsapp });`

### 16. `packages/cli/src/commands/logs.ts`

Copia EXACTO de `/Users/leobar37/code/elena/packages/cli/src/commands/logs.ts`. Cambios:
- `VALID_SERVICES` = `["backend", "app"]` (no web, no whatsapp)
- Mensajes: `"elena dev"` → `"avileo dev"`, `"elena logs"` → `"avileo logs"`

### 17. `packages/cli/src/commands/status.ts`

Copia EXACTO de `/Users/leobar37/code/elena/packages/cli/src/commands/status.ts`. Cambios:
- `"Estado de servicios Elena"` → `"Estado de servicios Avileo"`
- `"elena dev"` → `"avileo dev"`

### 18. `packages/cli/src/commands/dashboard.ts`

Copia EXACTO de `/Users/leobar37/code/elena/packages/cli/src/commands/dashboard.ts`. Sin cambios.

### 19. Dashboard React App

Copia EXACTAMENTE la carpeta `dashboard/` de `/Users/leobar37/code/elena/packages/cli/dashboard/` a `packages/cli/dashboard/`. Cambios:

- `dashboard/index.html`: `<title>Avileo Logs Dashboard</title>`
- `dashboard/src/App.tsx`: `<h1>Avileo Logs Dashboard</h1>` en el título
- `dashboard/src/components/ServicesBar.tsx`: quita `whatsapp` y `web` del mapeo, y el color de `backend` debe ser `#22c55e`, `app` debe ser `#3b82f6`
- `dashboard/src/components/FiltersBar.tsx`: el select de servicio solo debe tener opciones: `Todos`, `backend`, `app`
- `dashboard/src/types.ts`: `ElenaConfig` → `AvileoConfig`, `services` solo `backend` y `app`

### 20. Root `package.json` (avileo)

Añade estos scripts al `package.json` raíz:
```json
"avileo": "bun packages/cli/src/index.ts",
"dev": "bun packages/cli/src/index.ts dev"
```

IMPORTANTE: El script `"dev"` actual es `"turbo run dev"`. Reemplázalo por `"bun packages/cli/src/index.ts dev"`.

### 21. `.gitignore`

Añade `config.json` y `logs/` al `.gitignore` si no están ya.

## RESUMEN DEL FLUJO DE `avileo dev`

1. Valida `--only` contra `["backend", "app"]`
2. `discoverAllPorts()` → backend=3000 (o el que esté libre), app=3002 (o el que esté libre), dashboard=5174 (fijo)
3. `saveConfig(ports)` → escribe `config.json` en raíz con `{ services: { backend, app, dashboard }, lastRun }`
4. `syncFrontendEnvFiles(ports)` → actualiza `VITE_API_URL` en `packages/app/.env`
5. `ensureDashboardBuild()` → build ea el dashboard React si es necesario (stale detection por mtime)
6. `createLogServer(ports.dashboard)` → servidor Elysia en puerto 5174 que sirve:
   - `GET /` → dashboard SPA
   - `GET /api/logs?service=&level=&grep=&lines=` → logs JSONL filtrados
   - `GET /api/logs/stream` → SSE polling cada 1s
   - `GET /api/config` → config.json actual
   - `GET /health` → health check
7. Abre navegador en `http://localhost:5174`
8. Detecta servicios ya corriendo por puerto (los omite)
9. `ProcessManager.spawnAll(toStart)` → spawnea backend y app en paralelo
   - backend: `bun run --watch --no-clear-screen src/index.ts` con `PORT=<puerto>` y `CORS_ORIGINS=<app url>`
   - app: `bun run react-router dev --port <puerto>`
   - Captura stdout/stderr → escribe JSONL en `logs/<service>.jsonl`
10. Espera health checks (intenta conectar al puerto cada 500ms, hasta 30s)
11. Muestra tabla de servicios listos
12. Mantiene el proceso vivo hasta Ctrl+C (SIGTERM/SIGINT → mata todo limpiamente)

## SISTEMA DE LOGS

- Archivos JSONL: `logs/backend.jsonl`, `logs/app.jsonl`
- Formato por línea: `{"time":"ISO","service":"backend|app","level":"error|warn|info|debug","msg":"texto"}`
- Detección de nivel por keywords en el mensaje: `error/err/❌/fail` → error, `warn/warning/⚠️` → warn, `debug/trace` → debug, resto → info
- `readLogs(filter)`: lee archivos, aplica filtros, ordena por tiempo ascendente, limita a N líneas
- Dashboard hace polling cada 1s a `/api/logs`

## VERIFICACIÓN FINAL

Después de crear todos los archivos, ejecuta:

```bash
cd /Users/leobar37/code/avileo
bun install
bun run --filter @avileo/cli dashboard:build
```

Luego verifica que `bun run avileo` muestra la ayuda y `bun run avileo dev` inicia todo correctamente.

## NOTAS IMPORTANTES

- NO modifiques ningún archivo en `packages/backend/`, `packages/app/`, o `packages/shared/`
- NO borres ni modifiques `turbo.json`
- El dashboard usa Vite para build. El `vite.config.ts` del dashboard es INDEPENDIENTE del de `packages/app/`
- `config.json` se crea en la RAÍZ del monorepo (`/Users/leobar37/code/avileo/config.json`)
- La carpeta `logs/` también en la raíz
- El CLI usa `@/*` como alias para `src/*` dentro de `packages/cli/`
- React y ReactDOM son ya dependencias del monorepo (están en root y en app), pero igual deben listarse en `packages/cli/package.json` como dependencies para que Vite los encuentre al build ear el dashboard
