---
description: >
  Alias de /artifact con sesgo de producto/UI. Genera artifact visual en HTML.
  Solo usa wireframes/pantallas cuando el contenido es realmente de interfaz.
---

# Artifact Wireframe - Alias de Artifact

Load the `artifact-base` skill and execute it in `wireframe` mode for:

$ARGUMENTS

## Compatibilidad

Mantener comportamiento legacy de `/artifact-wireframe`:

- mismas fuentes (conversación, $ARGUMENTS, `@docs`)
- sesgo UI/producto cuando el contenido describe interfaz
- no forzar pantallas si el tema no es UI
- output en `docs/artifacts/[slug]/index.html`

## Output

Entregar al usuario:

```text
✅ Artifact generado: [tema]

📁 Ubicación: docs/artifacts/[slug]/index.html
🌐 Recarga iniciada en dashboard

📐 Representación visual:
   [wireframe / layout / flujo de usuario / pantallas / prototipo interactivo]

📚 Contenido incluido:
   [lista breve de secciones]
```
