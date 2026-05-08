# Plan: Replicar Elena CLI Dashboard + Port Management en Avileo

## Context

Copy the Elena CLI (`/Users/leobar37/code/elena/packages/cli/`) into Avileo (`packages/cli/`), adapted for Avileo's 2-service architecture (backend + app). The CLI provides: port discovery, process management with health checks, JSONL logging, and a React log dashboard served via SSE. Four commands: `dev`, `logs`, `status`, `dashboard`.

## Approach

Copy all Elena CLI source files verbatim, then apply targeted edits per the prompt instructions. The dashboard React app is copied as-is with minor branding/service-name changes. A `PLAN.md` already exists — this file replaces it.

## Files to Create/Modify

### New files (copy from Elena then adapt):

1. `packages/cli/package.json` — copied from Elena, renamed to `@avileo/cli`
2. `packages/cli/tsconfig.json` — copied from Elena
3. `packages/cli/src/index.ts` — copied from Elena `src/index.ts`, adapted
4. `packages/cli/src/types/index.ts` — copied verbatim (no changes)
5. `packages/cli/src/services/logger.ts` — copied, COLORS reduced to backend+app
6. `packages/cli/src/services/port-discovery.ts` — copied, only backend/app/dashboard ports
7. `packages/cli/src/services/config-manager.ts` — copied, AvileoConfig, only 2 services
8. `packages/cli/src/services/config-resolver.ts` — copied, 2 services only
9. `packages/cli/src/services/process-manager.ts` — copied, no whatsappPort, simplified getDevCommand
10. `packages/cli/src/services/log-writer.ts` — copied verbatim (no changes)
11. `packages/cli/src/services/log-reader.ts` — copied, default services ["backend", "app"]
12. `packages/cli/src/services/log-server.ts` — copied verbatim (no changes)
13. `packages/cli/src/services/dashboard-builder.ts` — copied verbatim (no changes)
14. `packages/cli/src/services/browser-launcher.ts` — copied verbatim (no changes)
15. `packages/cli/src/commands/dev.ts` — copied, "Avileo" branding, no whatsappPort
16. `packages/cli/src/commands/logs.ts` — copied, VALID_SERVICES = ["backend", "app"]
17. `packages/cli/src/commands/status.ts` — copied, "Avileo" branding
18. `packages/cli/src/commands/dashboard.ts` — copied verbatim (no changes)
19. `packages/cli/dashboard/` — entire folder copied, adapted (see below)

### Dashboard files to adapt (copy from Elena then edit):

20. `packages/cli/dashboard/index.html` — title to "Avileo Logs Dashboard"
21. `packages/cli/dashboard/tsconfig.json` — copied verbatim
22. `packages/cli/dashboard/vite.config.ts` — copied verbatim
23. `packages/cli/dashboard/src/main.tsx` — copied verbatim
24. `packages/cli/dashboard/src/api.ts` — copied verbatim
25. `packages/cli/dashboard/src/types.ts` — ElenaConfig → AvileoConfig, services: backend+app only
26. `packages/cli/dashboard/src/App.tsx` — title to "Avileo Logs Dashboard", types rename
27. `packages/cli/dashboard/src/components/ServicesBar.tsx` — remove web/whatsapp, colors backend=#22c55e, app=#3b82f6
28. `packages/cli/dashboard/src/components/FiltersBar.tsx` — title "Avileo Logs Dashboard", service select: Todos, backend, app
29. `packages/cli/dashboard/src/components/LogTable.tsx` — copied verbatim (no service-specific changes)
30. `packages/cli/dashboard/src/components/StatsBar.tsx` — copied verbatim
31. `packages/cli/dashboard/src/components/CopyBar.tsx` — copied verbatim

### Existing files to modify:

32. `package.json` (root) — add `"avileo"` and `"dev"` scripts
33. `.gitignore` — add `config.json` and `logs/`

## Reuse

All code comes from `/Users/leobar37/code/elena/packages/cli/`. Key dependencies already in monorepo: `react`, `react-dom`, `typescript`. New deps only in `packages/cli/package.json`: `chalk`, `commander`, `elysia`, `ora`, `@vitejs/plugin-react`, `vite`, `@types/bun`, `@types/react`, `@types/react-dom`.

## Steps

- [ ] 1. Create directory structure: `packages/cli/src/{commands,services,types}`, `packages/cli/dashboard/src/components`
- [ ] 2. Copy and adapt `packages/cli/package.json` (name: @avileo/cli, bin: avileo)
- [ ] 3. Copy and adapt `packages/cli/tsconfig.json`
- [ ] 4. Copy and adapt `packages/cli/src/index.ts` (name "avileo", description "Avileo", only 4 commands)
- [ ] 5. Copy `packages/cli/src/types/index.ts` verbatim
- [ ] 6. Copy and adapt `packages/cli/src/services/logger.ts` (COLORS: backend+app only)
- [ ] 7. Copy and adapt `packages/cli/src/services/port-discovery.ts` (DiscoveredPorts: backend, app, dashboard only; DEFAULT_PORTS: backend:3000, app:3002, dashboard:3099; dashboard fixed 5174)
- [ ] 8. Copy and adapt `packages/cli/src/services/config-manager.ts` (AvileoConfig, services: backend+app+dashboard, syncFrontendEnvFiles: only packages/app/.env with VITE_API_URL, detectBackendHost simplified)
- [ ] 9. Copy and adapt `packages/cli/src/services/config-resolver.ts` (DEFAULT_PORTS: backend:3000, app:3002, dashboard:5174; COLORS: backend:#22c55e, app:#3b82f6; buildServices: only backend+app; getAllServiceNames: ["backend", "app"]; getServiceCwd: path.resolve base)
- [ ] 10. Copy and adapt `packages/cli/src/services/process-manager.ts` (remove whatsappPort; getDevCommand: app→react-router dev --port, backend→bun run --watch --no-clear-screen src/index.ts; CORS_ORIGINS only app; markServiceRunning type)
- [ ] 11. Copy `packages/cli/src/services/log-writer.ts` verbatim
- [ ] 12. Copy and adapt `packages/cli/src/services/log-reader.ts` (default services: ["backend", "app"])
- [ ] 13. Copy `packages/cli/src/services/log-server.ts` verbatim
- [ ] 14. Copy `packages/cli/src/services/dashboard-builder.ts` verbatim
- [ ] 15. Copy `packages/cli/src/services/browser-launcher.ts` verbatim
- [ ] 16. Copy and adapt `packages/cli/src/commands/dev.ts` ("Avileo" messages, --only: ["backend","app"], no whatsappPort in spawnAll)
- [ ] 17. Copy and adapt `packages/cli/src/commands/logs.ts` (VALID_SERVICES=["backend","app"], "avileo dev"/"avileo logs" messages)
- [ ] 18. Copy and adapt `packages/cli/src/commands/status.ts` ("Avileo", "avileo dev")
- [ ] 19. Copy `packages/cli/src/commands/dashboard.ts` verbatim
- [ ] 20. Copy entire `dashboard/` folder from Elena, then adapt individual files:
  - `index.html`: title
  - `src/App.tsx`: title, import types
  - `src/types.ts`: ElenaConfig→AvileoConfig, services: backend+app only
  - `src/components/ServicesBar.tsx`: remove web/whatsapp, fix colors
  - `src/components/FiltersBar.tsx`: title, service options
  - `src/components/LogTable.tsx`: verbatim
  - `src/components/StatsBar.tsx`: verbatim
  - `src/components/CopyBar.tsx`: verbatim
  - `src/api.ts`: verbatim
  - `src/main.tsx`: verbatim
  - `tsconfig.json`: verbatim
  - `vite.config.ts`: verbatim
- [ ] 21. Update root `package.json`: add `"avileo"` and `"dev"` scripts
- [ ] 22. Update `.gitignore`: add `config.json` and `logs/`
- [ ] 23. Run `bun install` to install new dependencies
- [ ] 24. Run `bun run --filter @avileo/cli dashboard:build` to build the dashboard

## Verification

```bash
cd /Users/leobar37/code/avileo
bun install
bun run --filter @avileo/cli dashboard:build
bun run avileo          # Should show help with 4 commands
bun run avileo dev      # Should start backend + app + dashboard
bun run avileo status   # Should show service status
bun run avileo logs     # Should show logs
bun run avileo dashboard # Should start dashboard standalone
```
