# Avileo

**El cuaderno digital de bolsillo para tu negocio.**

Avileo es una app movil disenada para negocios pequenos que estan dando sus primeros pasos digitales. No es un ERP pesado ni requiere capacitacion. Esta pensada para el dueno de una cochera, el que reparte mercancia, el que vende por catalogo -- personas que hoy usan cuaderno y lapiz. Avileo digitaliza ese cuaderno, lo mete al bolsillo y lo hace funcionar incluso sin conexion.

- Para negocios pequenos, no para corporaciones.
- Reemplaza procesos manuales, no los complica.
- Funciona offline, porque el negocio no para si no hay senal.
- Facil de entrar, dificil de quedarse chico.

## Requirements
- Bun 1.1.38+
- Node.js 20+

## Quick Start
```bash
bun install
cp .env.example .env
# Add your Neon DATABASE_URL
bun run dev
```

## CLI de Avileo (`avileo`)

Avileo incluye una CLI unificada para gestionar todo el ciclo de desarrollo: levantar servicios, ver logs, monitorear estado y acceder al dashboard.

### Comandos principales

| Comando | Descripcion |
|---------|-------------|
| `bun avileo` | Muestra la ayuda de la CLI |
| `bun run avileo dev` | Inicia los servicios en modo desarrollo (backend + app + dashboard) |
| `bun run avileo dev --only backend` | Inicia solo el backend |
| `bun run avileo dev --only backend,app` | Inicia backend y app |
| `bun run avileo dev --no-browser` | Sin abrir navegador automaticamente |
| `bun run avileo dev --no-dashboard` | Sin dashboard de logs |
| `bun run avileo status` | Muestra el estado de los servicios (corriendo/detenido) |
| `bun run avileo status --json` | Estado en formato JSON |
| `bun run avileo logs` | Muestra las ultimas 100 lineas de logs |
| `bun run avileo logs --service backend` | Logs solo del backend |
| `bun run avileo logs --level error` | Solo errores |
| `bun run avileo logs --grep "timeout"` | Busca "timeout" en los logs |
| `bun run avileo logs --lines 500` | Ultimas 500 lineas |
| `bun run avileo logs -f` | Tail en tiempo real (sigue los logs en vivo) |
| `bun run avileo logs --stats` | Resumen de logs (cuantos errores, warns, etc.) |
| `bun run avileo logs --since 2026-05-08T10:00:00` | Logs desde un timestamp especifico |
| `bun run avileo dashboard` | Abre el dashboard web de logs en el navegador |
| `bun run avileo dashboard --no-browser` | Inicia el dashboard sin abrir el navegador |
| `bun run avileo dashboard --port 4000` | Dashboard en puerto personalizado |

### Que hace `avileo dev`

Al ejecutar `bun run avileo dev` la CLI:

1. **Descubre puertos** disponibles para backend, app y dashboard
2. **Guarda la configuracion** en `config.json` (puertos, URLs, estado)
3. **Sincroniza** `VITE_API_URL` en `packages/app/.env` al puerto del backend
4. **Inicia el dashboard** de logs en `http://localhost:5174`
5. **Abre el navegador** directamente en el dashboard
6. **Inicia los servicios** (backend + app) en paralelo
7. **Detecta servicios ya corriendo** para evitar duplicados
8. **Limpia logs** de sesiones anteriores antes de arrancar

### Dashboard de logs

El dashboard es una interfaz web React que muestra logs en tiempo real via SSE (Server-Sent Events).

- **URL por defecto**: `http://localhost:5174`
- **API de logs**: `GET /api/logs?service=backend&level=error&lines=200`
- **Streaming**: `GET /api/logs/stream` (SSE)
- **Health check**: `GET /health`
- **Config**: `GET /api/config`

Si el dashboard no esta construido, la CLI lo construye automaticamente. Para forzar rebuild:

```bash
bun run avileo dashboard --force-build
```

### Consultar logs sin levantar servicios

Si los servicios ya estan corriendo (o corrieron antes), los logs persisten en `logs/`:

```bash
# Ver todos los logs
bun run avileo logs

# Solo errores del backend
bun run avileo logs --service backend --level error

# Tail en vivo
bun run avileo logs -f

# Estadisticas rapidas
bun run avileo logs --stats
```

### Solucion de problemas

| Problema | Solucion |
|----------|----------|
| "Puerto X ocupado" | Mata el proceso en ese puerto o espera a que se libere |
| "No se encontraron logs" | Ejecuta `bun run avileo dev` primero para generar logs |
| Servicio no arranca | Revisa los logs con `bun run avileo logs --level error` |
| Dashboard no carga | Ejecuta `bun run avileo dashboard --force-build` |
| Puerto 5174 ocupado | Usa `bun run avileo dashboard --port 4000` |
| Ver solo un servicio | `bun run avileo dev --only backend` |

## Project Structure
```
packages/
├── backend/    # ElysiaJS + Drizzle + Neon
├── app/        # React Router v7 frontend
├── cli/        # CLI unificada (avileo)
└── shared/     # Shared types (tsup build)
```

## Scripts
- `bun run avileo dev` - Iniciar servidores de desarrollo
- `bun run build` - Build all packages
- `bun run db:migrate` - Run database migrations

## Documentation
See `/docs/` for detailed documentation.
