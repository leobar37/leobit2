---
description: >
  Genera un artifact visual a partir de conversación, prompt o @docs. Elige
  automáticamente la mejor representación visual en HTML.
---

# Artifact - Visualización Web

Load the `artifact-base` skill and execute it in `generic` mode for:

$ARGUMENTS

## Compatibilidad

Mantener comportamiento legacy de `/artifact`:

- usar conversación actual + $ARGUMENTS + `@docs` según contexto
- seleccionar representación visual automáticamente
- guardar en `docs/artifacts/[slug]/index.html`

## Output

Entregar al usuario:

```text
✅ Artifact generado: [tema]

📁 Ubicación: docs/artifacts/[slug]/index.html
🌐 Recarga iniciada en dashboard

📐 Representación visual:
   [resumen visual / comparativa / flujo / explicación / interactivo / pseudo-wireframe / svg diagram]

📚 Contenido incluido:
   [lista breve de secciones]
```
