---
description: >
  Crea archivos de validación automáticos desde un plan estructurado.  Genera
  validators 1:1 con los tasks del plan para auditoría enfocada. Triggers:
  create-validators, generar-validaciones, validadores.
---

# Create Validators

Crea archivos de validación (validators) desde los tasks de un plan estructurado.

## Input

`$ARGUMENTS` - Path al plan (ej: `.plans/mi-plan/` o `.plans/mi-plan`)

## Comportamiento

1. **Lee el plan** - Inspecciona `tasks/*.md` del plan
2. **Genera validators** - Crea archivos `validators/V-00X-*.md` (1:1 con tasks)
3. **Crea checklist** - Inicializa `validators/checklist.json` con status "pending"
4. **Detecta conflictos** - Si existen validators, pregunta al usuario qué hacer

## Flujo de Ejecución

### Fase 1: Parsear Input

Determinar el path al plan:
- Si es `.plans/<nombre>/` o `.plans/<nombre>` → usar ese
- Si no existe → error con sugerencias de planes disponibles

### Fase 2: Leer Tasks

Para cada archivo `tasks/T-00X-*.md`:
- Extraer frontmatter (id, title)
- Extraer descripción/objetivo
- Extraer archivos mencionados

### Fase 3: Generar Validators Automáticos

Para cada task, crear `validators/V-00X-<slug>.md`:

```markdown
---
id: "V-001"
task_id: "T-001"
title: "Validar: [título del task]"
status: "pending"
created_at: "[timestamp]"
---

# Validar T-001: [Título del Task]

## Criterios Generados Automáticamente

- [ ] [Criterio basado en keywords de la descripción]
- [ ] [Criterio basado en archivos mencionados]
- [ ] [Criterio general de calidad]

## Archivos a Validar

- `[ruta/archivo]` - [tipo: Create|Modify|Review]

## Referencia

- Task original: `tasks/T-001-*.md`
```

### Fase 4: Detectar y Manejar Conflictos

**Si existen validators previos:**

```
⚠️ Validators existentes detectados en .plans/<plan>/validators/:

Existentes:
  - V-001 (status: completed) - Validar autenticación
  - V-002 (status: in_progress) - Validar manejo de errores

Nuevos a crear:
  - V-001 (regenerado desde T-001 actualizado)
  - V-002 (regenerado desde T-002)
  - V-003 (nuevo desde T-003)

¿Qué deseas hacer?

[1] Sobrescribir TODO (pierde estado de completados)
[2] Solo crear los FALTANTES (V-003), preservar existentes
[3] Revisar uno por uno
[4] Cancelar
```

**Opción 1:** Elimina validators/ existente y recrea todo  
**Opción 2:** Solo crea validators que no existen, preserva estado  
**Opción 3:** Muestra cada conflicto individualmente  
**Opción 4:** Cancela la operación

### Fase 5: Crear Checklist

Archivo `validators/checklist.json`:

```json
{
  "version": 1,
  "plan": "[plan-name]",
  "mode": "validators",
  "validators": [
    {
      "id": "V-001",
      "title": "Validar autenticación",
      "file": "validators/V-001-auth.md",
      "status": "pending",
      "task_id": "T-001",
      "dependencies": []
    }
  ]
}
```

## Generación Automática de Criterios

Desde la descripción del task, extraer keywords y generar:

| Keywords en Task | Criterio Generado |
|------------------|-------------------|
| "auth", "login", "session" | El flujo de autenticación maneja errores y edge cases |
| "api", "endpoint", "request" | Los errores de API implementan retry pattern y timeout |
| "form", "input", "submit" | Los formularios tienen validación de entrada y feedback de errores |
| "component", "react", "ui" | Los componentes siguen patrones del proyecto (sin prop drilling) |
| "test", "spec", "coverage" | La implementación incluye tests unitarios o de integración |
| "error", "exception", "catch" | Los errores se manejan con try/catch o equivalente |
| "database", "query", "db" | Las operaciones de DB manejan errores de conexión y transacciones |
| "css", "style", "tailwind" | Los estilos son consistentes con el sistema de diseño |
| "deploy", "build", "docker" | El build pasa sin errores y el deploy es configurado |

## Heurísticas de Generación

1. **Si el task menciona archivos específicos:**
   - Validar que esos archivos existen
   - Validar que siguen convenciones del proyecto

2. **Si el task menciona una acción ("implementar", "crear", "refactorizar"):**
   - Validar que la implementación existe
   - Validar calidad de código (sin prop drilling, sin useEffect riesgosos)

3. **Siempre incluir:**
   - Validar que el código compila/funciona
   - Validar que no hay archivos huérfanos (imports rotos)

## Output Format

### Éxito (sin conflictos)
```
✅ Validators creados exitosamente

.plans/<plan>/validators/
├── V-001-[slug].md      ← desde T-001
├── V-002-[slug].md      ← desde T-002
└── checklist.json

3 validators generados automáticamente.

Para ejecutar:
  /run-validators .plans/<plan>/

O individualmente:
  /run-validators .plans/<plan>/validators/V-001-[slug].md
```

### Éxito (con preservación)
```
✅ Validadores creados exitosamente

Preservados: 2 existentes (V-001: completed, V-002: in_progress)
Nuevos: 1 creado (V-003)

.plans/<plan>/validators/
├── V-001-*.md      (preservado)
├── V-002-*.md      (preservado)
├── V-003-*.md      (nuevo)
└── checklist.json
```

### Error
```
❌ Error: No se encontró el plan en `.plans/<plan>/`

Planes disponibles:
  - refactor-auth
  - migrate-db
  - add-checkout

Uso: /create-validators .plans/<plan>/
```

## Reglas

- **Siempre genera criterios automáticamente** basados en el contenido del task
- **Nunca dejes un validator vacío** - mínimo 3 criterios por task
- **Preserva el estado** cuando el usuario elige opción 2 (solo faltantes)
- **Muestra el resumen** al final con cantidad de validators creados/preservados
- **Sugiere el siguiente paso** siempre: ejecutar con `/run-validators`

## Integración

- Los validators son consumidos por `/run-validators`
- El checklist de validators es gestionado por `planner-validator.js`
- Los validators NO modifican el checklist principal de tasks (están separados)
