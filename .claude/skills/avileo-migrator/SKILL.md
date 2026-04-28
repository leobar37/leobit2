---
name: avileo-migrator
description: |
  Orquestador de migraciones y workflows para el proyecto Avileo.
  Coordina subagentes especializados para migrar servicios al framework drizzle-sync,
  revisar flujos completos de negocio, implementar nuevas entidades sync-able,
  y auditar el codebase.
  
  Use when:
  - Migrating services from direct PGlite to DatabaseAdapter pattern
  - Reviewing complete business flows (sales, customers, payments, etc.)
  - Implementing new sync-enabled entities
  - Auditing sync-related code for anti-patterns
  - Coordinating multi-phase migration tasks
  
  Triggers: migrate service, review flow, new entity, audit sync, migration orchestrator,
  drizzle sync migration, service migration, sync audit, workflow review.
allowed-tools: Read, Grep, Glob, Bash, Task
---

# Avileo Migrator - Orquestador de Workflows

Skill orquestadora que coordina subagentes especializados para tareas de migración, revisión e implementación en el proyecto Avileo.

## Contexto Base

Esta skill **carga automáticamente** el contexto de `avileo-sync`:
- `DatabaseAdapter` abstraction
- `SyncClientEngineContext`
- 14 sync entities y sus prioridades
- Patrones de servicios (Pattern A, B, C)
- Reglas de sync (NO direct SQL en app/, queueSync, syncGroupId)

**Referencia:** `.claude/skills/avileo-sync/SKILL.md`

## Subagentes Disponibles

| Agente | Fase | Capacidad | Ubicación |
|--------|------|-----------|-----------|
| `drizzle-sync-migrator` | Orquestador | Analiza y decide qué fases aplicar | `.opencode/agents/` |
| `sql-adapter-migrator` | Fase 1 | Migra `this.pg.query()` → `this.adapter.query()` | `.opencode/agents/` |
| `drizzle-cleaner` | Fase 2 | Reemplaza `sql`` simples por operadores Drizzle | `.opencode/agents/` |
| `sync-migration-validator` | Fase 4 | Valida que la migración cumple reglas | `.opencode/agents/` |

**Nota:** Los subagentes están en `.opencode/agents/` y son **locales al proyecto**.

## Workflows

### Workflow 1: `migrate-service`

**Propósito:** Migrar un servicio completo (Fases 1 → 2 → 4)

**Uso:**
```bash
@avileo-migrator migrate-service packages/app/app/lib/services/sale-service.ts
```

**Pasos:**
1. **Analizar** el archivo objetivo con `Read` + `Grep`
2. **Detectar** qué fases aplican:
   - ¿Hay `this.pg.query()`? → Fase 1
   - ¿Hay `sql\`\`\` simples? → Fase 2
3. **Delegar** a subagentes en orden:
   ```
   if (fase1) → Task({subagent_type: "sql-adapter-migrator", prompt: "Migra <archivo>"})
   if (fase2) → Task({subagent_type: "drizzle-cleaner", prompt: "Limpia <archivo>"})
   Task({subagent_type: "sync-migration-validator", prompt: "Valida <archivo>"})
   ```
4. **Coordinar** resultados entre fases (esperar que una termine antes de la siguiente)
5. **Reportar** resultado consolidado

**Reglas:**
- Si Fase 1 aplica, DEBE ejecutarse antes que Fase 2
- Siempre ejecutar validación al final
- Preservar funcionalidad: solo cambiar mecanismo, no lógica

---

### Workflow 2: `review-flow`

**Propósito:** Revisar un flujo completo de negocio (servicios + hooks + rutas + componentes)

**Uso:**
```bash
@avileo-migrator review-flow sales
@avileo-migrator review-flow customers
@avileo-migrator review-flow payments
```

**Pasos:**
1. **Detectar** archivos del flujo:
   ```
   Buscar en:
   - packages/app/app/lib/services/*{flow}*service.ts
   - packages/app/app/hooks/use-{flow}*.ts
   - packages/app/app/routes/_protected.{flow}*
   - packages/app/app/components/{flow}/
   ```
2. **Para cada servicio encontrado:**
   - Delegar a `@sync-migration-validator` para auditoría
3. **Recopilar** resultados en un reporte consolidado
4. **Reportar** con severidad por archivo:
   - ERROR: Tiene `pg.query()` o viola reglas críticas
   - WARNING: Tiene `sql` innecesario o puede mejorar
   - OK: Cumple todos los patrones sync

**Reglas:**
- El nombre del flujo es flexible (sales, ventas, customers, clientes, payments, abonos)
- Buscar por patrones, no por nombres exactos
- Incluir servicios relacionados (ej. sales incluye payment-service)

---

### Workflow 3: `new-entity`

**Propósito:** Implementar una nueva entidad sync-able de extremo a extremo

**Uso:**
```bash
@avileo-migrator new-entity deliveries
```

**Pasos:**
1. **Backend** (siguiendo `avileo-sync`):
   - Agregar `version` column a schema en `packages/backend/src/db/schema/`
   - Agregar a `packages/shared/src/schema.ts`
   - Agregar a `SYNC_ENTITIES` y `ENTITY_PRIORITIES` en `packages/shared/src/sync-config.ts`
   - Crear handler en `packages/backend/src/services/sync/handlers/`
   - Registrar handler en `packages/backend/src/services/sync/sync.service.ts`
   - Agregar conflict resolver
2. **Frontend**:
   - Regenerar servicios con `drizzle-sync` generator
   - Crear/actualizar service en `packages/app/app/lib/services/`
   - Crear hooks en `packages/app/app/hooks/`
   - Crear rutas en `packages/app/app/routes/`
3. **Validar** integración completa
4. **Ejecutar** build y typecheck

**Reglas:**
- Seguir exactamente los 7 pasos de "Adding New Entity to Sync" de `avileo-sync`
- Parent entities necesitan `syncGroupId`
- Child entities (items, tags) usan `syncGroupId` del padre

---

### Workflow 4: `audit`

**Propósito:** Auditoría general del codebase sync-related

**Uso:**
```bash
@avileo-migrator audit
```

**Pasos:**
1. **Descubrir** todos los servicios:
   ```bash
   Glob: packages/app/app/lib/services/*-service.ts
   ```
2. **Para cada servicio:**
   - Buscar `this.pg.query()` → ERROR si encuentra
   - Buscar `sql\`\`\` simples → WARNING si encuentra
   - Buscar `this.adapter.` → OK si encuentra
3. **Generar** reporte consolidado
4. **Sugerir** próximos pasos de migración

**Reglas:**
- Solo analizar `packages/app/`, nunca `packages/drizzle-sync/`
- Reportar ubicación exacta (archivo + línea) de cada hallazgo
- Incluir recomendación de qué agente invocar para corregir

---

## Reglas de Delegación

| Detección | Agente | Fase | Prioridad |
|-----------|--------|------|-----------|
| `this.pg.query()` o `this.pg.exec()` | `@sql-adapter-migrator` | 1 | Alta |
| `sql\`${col} >= ${val}\`` | `@drizzle-cleaner` | 2 | Media |
| `sql\`${col} <= ${val}\`` | `@drizzle-cleaner` | 2 | Media |
| `sql\`${col} != ${val}\`` | `@drizzle-cleaner` | 2 | Media |
| `sql\`${col} IN (${arr})\`` | `@drizzle-cleaner` | 2 | Media |
| `sql\`COALESCE/CAST/DATE/EXISTS/count\`` | Ninguno (mantener) | - | - |
| Revisión general | `@sync-migration-validator` | 4 | Alta |

## Flujo de Coordination

```
Usuario solicita: "migra sale-service.ts"

Orquestador (avileo-migrator):
  1. Lee sale-service.ts
  2. Detecta: pg.query() presente + sql simples presentes
  3. Delega:
     a. Task({subagent: "sql-adapter-migrator", prompt: "migra sale-service.ts"})
     b. Espera resultado
     c. Si OK: Task({subagent: "drizzle-cleaner", prompt: "limpia sale-service.ts"})
     d. Espera resultado
     e. Si OK: Task({subagent: "sync-migration-validator", prompt: "valida sale-service.ts"})
  4. Reporta:
     - Fase 1: ✅ 3 reemplazos (pg.query → adapter)
     - Fase 2: ✅ 2 reemplazos (sql → gte/lte)
     - Fase 4: ✅ Typecheck pasa
     - Resultado: Archivo migrado exitosamente
```

## Ejemplos de Uso

### Ejemplo 1: Migrar servicio
```
@avileo-migrator migrate-service packages/app/app/lib/services/sale-service.ts

Respuesta esperada:
  Analizando sale-service.ts...
  Detectado:
    - Fase 1: 3 usos de this.pg.query()
    - Fase 2: 2 condiciones sql simples
  
  Ejecutando Fase 1...
  ✅ sql-adapter-migrator completado: 3 reemplazos
  
  Ejecutando Fase 2...
  ✅ drizzle-cleaner completado: 2 reemplazos
  
  Ejecutando Validación...
  ✅ sync-migration-validator: Typecheck pasa, 0 errores
  
  Resumen: sale-service.ts migrado exitosamente
```

### Ejemplo 2: Revisar flujo
```
@avileo-migrator review-flow sales

Respuesta esperada:
  Flujo de Ventas - Revisión:
  
  Servicios:
  ✅ sale-service.ts: Sin pg.query(), usa adapter
  ⚠️  payment-service.ts: 2 sql simples (líneas 89, 134)
  ✅ customer-service.ts: Cumple patrones
  
  Hooks:
  ✅ use-sales.ts: OK
  ✅ use-customers.ts: OK
  
  Recomendación:
  - Ejecutar @drizzle-cleaner en payment-service.ts
```

### Ejemplo 3: Auditoría
```
@avileo-migrator audit

Respuesta esperada:
  Auditoría Sync - Resumen:
  
  Total servicios: 13
  
  Completamente migrados: 8
  Pendientes Fase 1: 3 (sale-service, payment-service, purchase-service)
  Pendientes Fase 2: 2 (customer-service, distribucion-service)
  
  Detalles:
  - sale-service.ts: ERROR línea 145 this.pg.query()
  - payment-service.ts: WARNING línea 89 sql simple
  
  Siguientes pasos recomendados:
  1. @avileo-migrator migrate-service sale-service.ts
  2. @avileo-migrator migrate-service payment-service.ts
```

## Reglas Críticas

1. **Nunca modificar `packages/drizzle-sync/`**: Los subagentes solo tocan `packages/app/`
2. **Preservar funcionalidad**: Solo cambiar mecanismo de ejecución, no lógica de negocio
3. **Fases en orden**: Fase 1 siempre antes que Fase 2
4. **Siempre validar**: Ejecutar validación después de cualquier cambio
5. **Reportar todo**: Cada workflow debe producir un reporte claro y accionable
6. **Genérico**: No hardcodear nombres de entidades; detectar dinámicamente

## Integración con Otros Skills

- **avileo-sync**: Contexto base que carga automáticamente
- **frontend**: Para tareas que involucren UI/components
- **fullstack-backend**: Para tareas que involucren backend/schema

## Troubleshooting

### Si un subagente falla
1. Revisar el error reportado
2. Corregir manualmente si es trivial
3. Re-invocar el subagente con contexto adicional
4. Si persiste, escalar al workflow completo con `@drizzle-sync-migrator`

### Si hay dependencias entre servicios
1. Migrar servicios base primero (customers → sales → payments)
2. Usar `review-flow` para entender dependencias
3. Coordinar migraciones en el orden correcto

### Si un servicio es muy grande
1. Dividir en secciones lógicas
2. Migrar una sección a la vez
3. Validar entre cada sección
