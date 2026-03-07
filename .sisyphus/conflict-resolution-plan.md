# Plan de Resolución de Conflictos: WhatsApp vs Main

## 📊 Análisis de Conflictos

### Branch Actual
- **Branch**: feature/whats-app
- **Commits**: 67 archivos, +19,095 líneas
- **Feature**: WhatsApp Integration completa

### Conflictos Detectados

#### 1. **ARCHIVOS CRÍTICOS - NUEVOS (Sin conflicto)**
✅ **Seguro**: Archivos nuevos de WhatsApp que no existen en main
- `packages/backend/src/api/whatsapp/*`
- `packages/backend/src/services/infrastructure/evolution.service.ts`
- `packages/backend/src/services/repository/whatsapp-*.ts`
- `packages/backend/src/services/business/whatsapp-*.service.ts`
- `packages/backend/src/inngest/whatsapp-functions.ts`
- `packages/backend/src/db/schema/business-user-whatsapp-settings.ts`
- `packages/backend/src/db/schema/whatsapp-templates.ts`
- `packages/backend/src/db/schema/whatsapp-messages.ts`
- `packages/backend/drizzle/0018_add_whatsapp_tables.sql`
- `packages/app/app/hooks/use-whatsapp-*.ts`
- `packages/app/app/routes/_protected.config.whatsapp.tsx`
- `packages/app/app/routes/_protected.config.whatsapp.templates.tsx`
- `packages/app/app/routes/_protected.whatsapp.historial.tsx`
- `packages/app/app/components/reports/accounts-receivable/SendReminderModal.tsx`
- `packages/app/app/components/ui/select.tsx`
- `packages/app/app/components/ui/textarea.tsx`

**Acción**: Mantener todos ✅

---

#### 2. **ARCHIVOS DE CONFIGURACIÓN - FUSIÓN NECESARIA**
⚠️ **Cuidado**: Archivos modificados en ambos branches

**a) `packages/app/package.json`**
- **Main**: Tiene sus propias dependencias
- **WhatsApp**: Agregó `@radix-ui/react-dropdown-menu` y `@radix-ui/react-select`
- **Acción**: Fusionar - mantener ambas versiones de dependencias

**b) `packages/backend/package.json`**
- **Main**: Sus dependencias
- **WhatsApp**: Agregó `@gymspace/evolution` y `inngest`
- **Acción**: Fusionar - mantener todas las dependencias

**c) `bun.lock`**
- **Main**: Lockfile actual
- **WhatsApp**: Lockfile con nuevas dependencias
- **Acción**: Regenerar después de merge de package.json

---

#### 3. **ARCHIVOS MODIFICADOS POR AMBOS**
🔴 **Revisar**: Archivos que tienen cambios en ambos branches

**a) `packages/app/app/components/reports/accounts-receivable/AccountItem.tsx`**
- **Main**: Cambios en UI/reportes
- **WhatsApp**: Agregó botón "Enviar Recordatorio"
- **Acción**: Mantener ambos cambios (merge manual)

**b) `packages/app/app/components/reports/accounts-receivable/AccountsList.tsx`**
- **Main**: Cambios en lista
- **WhatsApp**: Props adicionales para modal
- **Acción**: Mantener ambos cambios

**c) `packages/app/app/components/reports/accounts-receivable/index.ts`**
- **Main**: Exports existentes
- **WhatsApp**: Export de SendReminderModal
- **Acción**: Agregar export nuevo

**d) `packages/backend/src/app.ts`**
- **Main**: Rutas existentes
- **WhatsApp**: Mount de rutas WhatsApp
- **Acción**: Agregar rutas nuevas al final

**e) `packages/backend/src/plugins/services.ts`**
- **Main**: Servicios existentes
- **WhatsApp**: WhatsApp services y repositories
- **Acción**: Agregar nuevos servicios

**f) `packages/backend/src/context/request-context.ts`**
- **Main**: Permisos existentes
- **WhatsApp**: Permisos de whatsapp (read, write, delete)
- **Acción**: Agregar nuevos permisos al tipo

**g) `packages/backend/src/db/schema/index.ts`**
- **Main**: Exports existentes
- **WhatsApp**: Exports de tablas WhatsApp
- **Acción**: Agregar exports nuevos

**h) `packages/app/app/routes/_protected.ventas.$id._index.tsx`**
- **Main**: Página de venta
- **WhatsApp**: Botón "Enviar WhatsApp"
- **Acción**: Integrar botón en la UI existente

**i) `packages/app/app/routes/_protected.reportes.cuentas-por-cobrar.tsx`**
- **Main**: Página de deudas
- **WhatsApp**: Integración de modal
- **Acción**: Mantener modal y estado

**j) `packages/app/app/routes/_protected.config._index.tsx`**
- **Main**: Menú de configuración
- **WhatsApp**: Link a WhatsApp config
- **Acción**: Agregar link nuevo

---

#### 4. **ARCHIVOS DEL SISTEMA DE AGENTES**
🤖 **Sisyphus files**

**a) `.sisyphus/boulder.json`**
- **Main**: Plan antiguo completado
- **WhatsApp**: Plan de WhatsApp
- **Acción**: Mantener el de WhatsApp (es el activo)

**b) `.sisyphus/plans/*` y `.sisyphus/notepads/*`**
- **Main**: No existen
- **WhatsApp**: Documentación del plan
- **Acción**: Mantener todos

**c) `.sisyphus/reviews/*`**
- **Main**: No existe
- **WhatsApp**: Review final
- **Acción**: Mantener

---

#### 5. **ARCHIVOS GENERADOS/LOCK**
🔄 **Regenerables**

**a) `packages/app/.react-router/types/*`**
- **Acción**: Regenerar con `bun run build` después del merge

**b) `packages/backend/drizzle/meta/*`**
- **Main**: Snapshots antiguos
- **WhatsApp**: Nuevos snapshots
- **Acción**: Mantener todos los snapshots

---

## 🎯 Estrategia de Merge

### Opción A: Merge Manual (Recomendado)

```bash
# 1. Actualizar main
 git fetch origin main

# 2. Intentar merge
 git checkout feature/whats-app
 git merge origin/main

# 3. Resolver conflictos uno por uno
# - Aceptar "theirs" para archivos nuevos de WhatsApp
# - Fusionar manualmente package.json
# - Fusionar manualmente los componentes modificados

# 4. Regenerar lockfile
 rm bun.lock
 bun install

# 5. Verificar builds
 cd packages/backend && bun run build
 cd packages/app && bun run build
```

### Opción B: Rebase (Alternativa)

```bash
# 1. Actualizar main
 git fetch origin main

# 2. Rebase
 git checkout feature/whats-app
 git rebase origin/main

# 3. Resolver conflictos en cada commit
# (más trabajo pero historial limpio)
```

---

## 🔧 Resolución Detallada por Archivo

### Paso 1: package.json (Backend)
```json
{
  "dependencies": {
    // ... dependencias existentes de main
    "@gymspace/evolution": "^1.7.39",
    "inngest": "^3.52.6"
  }
}
```

### Paso 2: package.json (Frontend)
```json
{
  "dependencies": {
    // ... dependencias existentes de main
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-select": "^2.2.6"
  }
}
```

### Paso 3: app.ts (Backend)
```typescript
// ... rutas existentes de main
import { whatsAppSettingsRoutes } from "./api/whatsapp/settings";
import { whatsAppTemplateRoutes } from "./api/whatsapp/templates";
import { whatsAppMessageRoutes } from "./api/whatsapp/messages";

// ... montar otras rutas
app.use(whatsAppSettingsRoutes);
app.use(whatsAppTemplateRoutes);
app.use(whatsAppMessageRoutes);
```

### Paso 4: services.ts
```typescript
// ... servicios existentes
const whatsAppSettingsRepo = new WhatsAppSettingsRepository();
const whatsAppTemplateRepo = new WhatsAppTemplateRepository();
const whatsAppMessageRepo = new WhatsAppMessageRepository();

// ... decorates existentes
whatsAppSettingsService: new WhatsAppSettingsService(whatsAppSettingsRepo),
whatsAppTemplateService: new WhatsAppTemplateService(whatsAppTemplateRepo),
whatsAppMessageService: new WhatsAppMessageService(
  whatsAppMessageRepo,
  whatsAppTemplateRepo,
  customerRepo,
  whatsAppSettingsRepo
),
```

### Paso 5: schema/index.ts
```typescript
// ... exports existentes
export * from "./business-user-whatsapp-settings";
export * from "./whatsapp-templates";
export * from "./whatsapp-messages";
```

### Paso 6: request-context.ts
```typescript
export type Permission =
  // ... permisos existentes
  | "whatsapp.read"
  | "whatsapp.write"
  | "whatsapp.delete";
```

---

## ✅ Checklist Post-Merge

- [ ] Todos los archivos nuevos de WhatsApp presentes
- [ ] package.json fusionados correctamente
- [ ] bun.lock regenerado
- [ ] Backend build exitoso
- [ ] Frontend build exitoso
- [ ] Sin errores de TypeScript
- [ ] Tests pasan (si existen)

---

## 🚨 Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Pérdida de cambios de main | Media | Alto | Revisar cada archivo conflicto |
| Build roto | Baja | Medio | Probar builds después del merge |
| Dependencias faltantes | Baja | Medio | Regenerar bun.lock |
| Funcionalidad de WhatsApp rota | Baja | Alto | Testing manual post-merge |

---

## 📋 Resumen de Acciones

**Total archivos a revisar**: ~30
**Archivos críticos**: 6 (package.json, app.ts, services.ts, etc.)
**Tiempo estimado**: 15-30 minutos
**Estrategia**: Merge manual, revisar cada conflicto
