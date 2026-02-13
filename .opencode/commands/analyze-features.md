---
description: Analiza exhaustivamente las features funcionales del proyecto y compara con la documentación
---

Realiza un análisis exhaustivo de las features funcionales del proyecto Avileo (PollosPro).

## Contexto del Proyecto

- **Stack**: Bun + ElysiaJS + Drizzle + PostgreSQL + React Router v7 + TanStack
- **Docs参考**: docs/OVERVIEW-FLUJOS.md y docs/screens/
- **Frontend**: packages/app/app/
- **Backend**: packages/backend/

## Análisis Requerido

### 1. Rutas Existentes
Busca todas las rutas en packages/app/app/routes/*.tsx y lista:
- Ruta exacta (path)
- Nombre del archivo
- Qué funcionalidad implementa

### 2. Componentes Existentes
Busca en packages/app/app/components/:
- Lista todos los componentes por categoría
- Identifica qué funcionalidad cubren

### 3. Hooks Existentes
Busca en packages/app/app/hooks/:
- Lista todos los hooks
- Identifica su propósito

### 4. Comparación con Docs
Compara con docs/OVERVIEW-FLUJOS.md para identificar:
- Features documentadas pero NO implementadas
- Features implementadas pero NO documentadas
- Gaps funcionales

### 5. Estado de Implementación
Para cada feature del documento docs/OVERVIEW-FLUJOS.md, verifica:
- ✅ Implementada - Existe ruta y lógica completa
- ⚠️ Parcial - Existe ruta pero incompleta
- ❌ Pendiente - No existe implementación

## Formato de Salida

Genera un reporte en Markdown con:

```markdown
# Análisis de Features - [Fecha]

## Resumen
- Total rutas implementadas: X
- Total componentes: X  
- Total hooks: X
- Features implementadas: X/Y (Z%)
- Gaps identificados: X

## Detalle por Feature

### Mobile (Vendedor)
| # | Feature | Estado | Notas |
|---|---------|--------|-------|
| 1 | Login | ✅ | ... |

### Desktop (Admin)
| # | Feature | Estado | Notas |
|---|---------|--------|-------|

## Gaps Funcionales Identificados
1. ...
2. ...

## Recomendaciones
- ...
```

## IMPORTANTE

- Usa explore agent para buscar exhaustivamente
- Verifica cada archivo antes de marcar como implementado
- Si hay duda, marca como "pendiente" con nota
- Incluye enlaces a los archivos relevantes
