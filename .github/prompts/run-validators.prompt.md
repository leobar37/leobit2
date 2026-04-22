---
description: >
  Ejecuta validators mediante orquestación de sub-agentes. Cada validación es
  una tarea independiente lanzada via Task. Si pasa → marca completado. Si falla
  → lanza sub-agente de fix. Triggers: run-validators, ejecutar-validaciones,
  validar.
---

# Run Validators

Ejecuta validators mediante orquestación de sub-agentes independientes.

## Input

`$ARGUMENTS` - Path al plan (ej: `.plans/mi-plan/`)

## Operating Principles

1. **Cada validator es una tarea independiente** - Lanzado via `Task` tool
2. **Paralelismo inteligente** - Validators sin dependencias ejecutan en paralelo
3. **Fix automático** - Si falla, se lanza sub-agente de corrección inmediatamente
4. **Estado centralizado** - Checklist de validators para tracking
5. **No crear archivos de fix** - Los fixes son sub-agentes, no archivos físicos

## Hard Constraints

- **Nunca modifica archivos directamente** - Solo sub-agentes implementan cambios
- **Nunca ejecuta tests/builds** - Auditoría solamente
- **Siempre usa Task tool** para lanzar sub-agentes de validación y fix
- **Solo lee checklist** - Actualiza estado después de recibir resultado del sub-agente

## Required Execution Flow

### Phase 1 - Prepare

1. Parsear `$ARGUMENTS` para obtener path al plan
2. Leer `.plans/<plan>/validators/checklist.json`
3. Identificar validators con status "pending"
4. Verificar que archivos V-00X.md existen
5. Determinar paralelismo (validators sin dependencias pueden ir en paralelo)

### Phase 2 - Orchestrate Validation

Para cada validator pendiente, lanzar sub-agente via `Task`:

```
Task: Validate V-001

Input:
  validator_file: .plans/<plan>/validators/V-001.md
  plan_path: .plans/<plan>/

Mission:
  1. Leer archivo V-001.md y extraer:
     - Lista de criterios (checkboxes)
     - Archivos objetivo a validar
  
  2. Cargar skill `investigation-orchestrator`
  
  3. Auditar cada criterio contra los archivos objetivo:
     - Verificar que el criterio se cumple
     - Documentar evidencia (líneas de código, archivos)
  
  4. Determinar resultado:
     - PASS: Todos los criterios se cumplen
     - FAIL: Al menos un criterio no se cumple
  
  5. Si FAIL, documentar:
     - Qué criterios fallaron y por qué
     - Archivos específicos con problemas
     - Recomendaciones específicas para corregir

Output:
  {
    "validator_id": "V-001",
    "result": "PASS|FAIL",
    "criterios": [
      {"criterio": "...", "status": "pass|fail", "evidencia": "..."}
    ],
    "archivos_auditados": [...],
    "hallazgos": [...],           // Solo si FAIL
    "recomendaciones": [...]      // Solo si FAIL
  }
```

**Lanzamiento:**
- Validators sin dependencias entre sí → lanzar múltiples `Task` en paralelo
- Validators con dependencias → secuencial, esperando resultado del anterior

### Phase 3 - Process Results

**Para cada resultado recibido de sub-agentes:**

#### Si PASS:
1. Marcar V-00X como "completed" en checklist
2. Registrar timestamp de completado
3. Reportar éxito al usuario

#### Si FAIL:
1. Marcar V-00X como "failed" en checklist
2. **Inmediatamente lanzar sub-agente de FIX:**

```
Task: Fix V-001

Input:
  validator_id: V-001
  validator_file: .plans/<plan>/validators/V-001.md
  hallazgos: [del sub-agente anterior]
  recomendaciones: [del sub-agente anterior]
  archivos_objetivo: [del validator]

Mission:
  1. Analizar hallazgos del validator fallido
  2. Implementar correcciones necesarias:
     - Arreglar código según recomendaciones
     - Asegurar que criterios ahora se cumplen
     - Seguir patrones del proyecto
  3. Verificar que los cambios funcionan:
     - Revisar sintaxis
     - Confirmar que imports no se rompen
  4. Reportar cambios realizados:
     - Archivos modificados
     - Líneas específicas cambiadas
     - Criterios ahora cumplidos

Constraints:
  - Implementar solo lo necesario para pasar el validator
  - No introducir cambios fuera del scope
  - Seguir patrones de código existentes

Output:
  {
    "validator_id": "V-001",
    "status": "FIXED|PARTIAL|FAILED",
    "archivos_modificados": [...],
    "cambios_realizados": [...],
    "notas": "..."
  }
```

3. **Procesar resultado del fix:**
   - Si FIXED → Marcar V-00X como "completed" (pasó después del fix)
   - Si PARTIAL → Mantener "failed", reportar progreso
   - Si FAILED → Mantener "failed", necesita revisión manual

### Phase 4 - Generate Report

**Reporte consolidado:**

```
═══════════════════════════════════════════════════
       REPORTE DE VALIDACIÓN ORQUESTADA
═══════════════════════════════════════════════════

Plan: .plans/mi-plan/
Validators: 5 total

✅ PASSED DIRECTAMENTE (2)
  V-001: Validar autenticación
    └─ Sub-agente: PASS en 12s
    
  V-003: Validar integración SUNAT  
    └─ Sub-agente: PASS en 18s

✅ PASSED TRAS FIX (1)
  V-002: Validar manejo de errores
    ├─ Validator: FAIL (retry pattern missing)
    ├─ Fix sub-agente: Lanzado
    └─ Resultado: FIXED en 25s
    └─ Archivos modificados: src/api/client.ts

❌ STILL FAILED (1)
  V-004: Validar schema de DB
    ├─ Validator: FAIL (constraints missing)
    ├─ Fix sub-agente: Lanzado
    └─ Resultado: FAILED (demasiado complejo)
    └─ Requiere revisión manual

⏳ PENDING (1)
  V-005: Validar tests
    └─ Dependencia: V-004 (bloqueado por fallo anterior)

───────────────────────────────────────────────────
Resumen: 3 passed (2 directo + 1 con fix), 1 failed, 1 pending
Tiempo total: ~55s (paralelo donde fue posible)

Próximos pasos:
  • Revisar manualmente V-004 (demasiado complejo para fix automático)
  • Cuando V-004 se resuelva, re-ejecutar:
    /run-validators .plans/mi-plan/
═══════════════════════════════════════════════════
```

## Integration with planner-validator.js

Este comando usa el CLI solo para **leer y actualizar estado**:

```bash
# Leer estado antes
node planner-validator.js list .plans/mi-plan/

# Marcar estado después de resultado
node planner-validator.js complete .plans/mi-plan/ V-001  # Si PASS
node planner-validator.js fail .plans/mi-plan/ V-002      # Si FAIL (antes del fix)
node planner-validator.js complete .plans/mi-plan/ V-002  # Si fix SUCCESS
```

## Decision Topology

**Choose parallel when:**
- Validators no tienen dependencias entre sí
- Son áreas diferentes del código (ej: frontend vs backend)
- Quieres velocidad de ejecución

**Choose sequential when:**
- Hay dependencias declaradas (V-002 depende de V-001)
- Un validator podría invalidar el siguiente (ej: schema → API)
- Prefieres predictibilidad sobre velocidad

## Output Format

### Phase 1 - Orchestration
```
Fase 1: Preparación
✅ Plan: .plans/mi-plan/
✅ 5 validators pendientes identificados
✅ Topología: 3 en paralelo, 2 secuenciales (por dependencias)
```

### Phase 2 - Execution Progress
```
Fase 2: Orquestación de validación

🚀 Lanzando sub-agentes:
  • V-001 (paralelo)
  • V-002 (paralelo)  
  • V-003 (paralelo)
  ⏳ V-004 (esperando V-001)
  ⏳ V-005 (esperando V-002)

✅ V-001: Resultado recibido - PASS (12s)
✅ V-002: Resultado recibido - FAIL (15s)
  └─ Lanzando fix sub-agente...
✅ V-003: Resultado recibido - PASS (18s)
🔄 V-002-fix: Resultado recibido - FIXED (25s)
```

### Phase 3 - Final Report
(See example in Phase 4 above)

## Rules

- **Siempre usa Task tool** - Nunca audites directamente en el agente principal
- **Paraleliza cuando sea seguro** - No bloques validators independientes
- **Fix inmediato** - Si falla, lanza sub-agente de fix sin preguntar
- **Actualiza checklist** - Después de cada resultado, actualizar estado
- **Reporta progreso real** - No esperes a que todo termine para mostrar output
- **Maneja timeouts** - Si un sub-agente no responde en 120s, marcar como failed

## Example Session

```
User: /run-validators .plans/refactor-auth/

System:
Fase 1: Preparación
✅ 3 validators pendientes en .plans/refactor-auth/

Fase 2: Orquestación
🚀 Lanzando V-001, V-002, V-003 en paralelo...

✅ V-001: PASS (autenticación OK)
❌ V-002: FAIL (retry pattern missing)
  └─ 🚀 Lanzando fix sub-agente...
✅ V-003: PASS (tests OK)
✅ V-002-fix: FIXED (retry implementado)

═══════════════════════════════════════════════════
RESULTADO: 3/3 passed (2 directo, 1 con fix)
═══════════════════════════════════════════════════

Todos los validators pasaron. Plan listo para siguiente fase.
```
