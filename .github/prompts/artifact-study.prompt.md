---
description: >
  Alias de /artifact con sesgo explicativo. Genera un artifact visual en HTML.
  Resume y elige la mejor estructura visual para entender el tema.
---

# Artifact Study - Alias de Artifact

Load the `artifact-base` skill and execute it in `study` mode for:

$ARGUMENTS

## Compatibilidad

Mantener comportamiento legacy de `/artifact-study`:

- mismas fuentes (conversación, $ARGUMENTS, `@docs`)
- sesgo explicativo/pedagógico
- sin forzar tutorial largo salvo pedido explícito
- output en `docs/artifacts/[slug]/index.html`

## Output

Entregar al usuario:

```text
✅ Artifact generado: [tema]

📁 Ubicación: docs/artifacts/[slug]/index.html
🌐 Recarga iniciada en dashboard

📐 Representación visual:
   [explicación / pasos / comparativa / flujo / svg diagram / interactivo]

📚 Contenido incluido:
   [lista breve de secciones]
```
