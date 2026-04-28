# Agentes de Migracion Drizzle-Sync

Agentes locales especializados para migrar servicios de `packages/app/` hacia el patron `DatabaseAdapter` del framework `drizzle-sync`.

## Estructura

```
.opencode/agents/
├── drizzle-sync-migrator.md      # Orquestador principal
├── sql-adapter-migrator.md       # Fase 1: SQL → Adapter
├── drizzle-cleaner.md            # Fase 2: Limpieza de SQL
└── sync-migration-validator.md   # Fase 4: Validacion
```

## Uso

### Desde OpenCode

```bash
# Migrar un servicio completo (todas las fases)
@drizzle-sync-migrator migra packages/app/app/lib/services/sale-service.ts

# Solo Fase 1 (SQL a Adapter)
@sql-adapter-migrator packages/app/app/lib/services/customer-service.ts

# Solo Fase 2 (limpiar SQL innecesario)
@drizzle-cleaner packages/app/app/lib/services/payment-service.ts

# Validar migracion
@sync-migration-validator packages/app/app/lib/services/sale-service.ts

# Validar todo un directorio
@sync-migration-validator packages/app/app/lib/services/
```

### Desde Claude Code

```bash
# Usar Task tool para invocar subagentes
Task({
  subagent_type: "drizzle-sync-migrator",
  prompt: "Migra packages/app/app/lib/services/sale-service.ts",
  description: "Migrar SaleService"
})
```

## Flujo de Trabajo Recomendado

1. **Orquestador**: `@drizzle-sync-migrator` analiza y decide que fases aplicar
2. **Fase 1**: `@sql-adapter-migrator` migra SQL directo a PGlite → Adapter
3. **Fase 2**: `@drizzle-cleaner` reemplaza SQL simple por operadores Drizzle
4. **Fase 4**: `@sync-migration-validator` verifica que todo este correcto

## Reglas Generales

- **Scope**: Solo `packages/app/app/lib/services/`, nunca `packages/drizzle-sync/`
- **No entidad-especifico**: Funcionan con cualquier servicio (ventas, clientes, abonos, etc.)
- **Skills**: Cargan contexto de `.claude/skills/avileo-sync/SKILL.md` automaticamente
- **Seguridad**: Preservan validacion de table names y parametros SQL

## Fases de Migracion

### Fase 1: SQL → Adapter
- Reemplaza `this.pg.query()` → `this.adapter.query()`
- Reemplaza `this.pg.exec()` → `this.adapter.exec()`
- Preserva parametros y validacion de table names

### Fase 2: Drizzle Cleaner
- Reemplaza `sql\`${col} >= ${val}\`` → `gte(col, val)`
- Reemplaza `sql\`${col} <= ${val}\`` → `lte(col, val)`
- Reemplaza `sql\`${col} != ${val}\`` → `ne(col, val)`
- Mantiene `sql` para COALESCE, CAST, DATE, EXISTS, HAVING

### Fase 4: Validacion
- Verifica ausencia de `pg.query()` en servicios
- Verifica uso de operadores Drizzle para casos simples
- Ejecuta `bun run typecheck`
- Reporta hallazgos con severidad (ERROR/WARNING/OK)

## Configuracion

Los agentes estan registrados automaticamente por OpenCode al estar en `.opencode/agents/`.

No requieren modificacion de `opencode.json` global.

## Servicios Pendientes de Migracion

- [ ] `sale-service.ts` (ventas)
- [ ] `customer-service.ts` (clientes)
- [ ] `payment-service.ts` (abonos)
- [ ] `purchase-service.ts` (compras)
- [ ] `product-service.ts` (productos)
- [ ] Otros servicios en `packages/app/app/lib/services/`

## Referencias

- Plan de migracion: `.opencode/plans/drizzle-sync-migration.md`
- Skill avileo-sync: `.claude/skills/avileo-sync/SKILL.md`
- Reglas del proyecto: `AGENTS.md` (raiz)
