# F-005 Flujo visual multi-rubro

## Objective

Actualizar el flujo visual de “cómo funciona” para que deje de depender de un ejemplo avícola de kilos/vendedores y explique una operación diaria válida para varios rubros.

## Scope Boundaries

### In scope

- Replantear `FlowAnimation` como flujo neutral o combinado con ejemplos por rubro.
- Mantener la idea de 3 etapas: configurar, registrar operación, cerrar el día.
- Evitar exceso de texto y preservar mobile-first.
- Alinear ejemplos con la sección de casos de uso.

### Out of scope

- Cambiar la nueva sección de casos de uso.
- Crear animaciones complejas nuevas.
- Integrar datos reales o APIs.

## Verified Context

- `flow-animation.tsx` usa `framer-motion`, `lucide-react` y tarjetas de 3 columnas.
- Copy actual menciona `Asigna 50kg`, `35kg vendidos`, mercados y vendedores.
- La sección tiene id `how-it-works`, usado desde hero y navegación.
- El layout actual puede reutilizarse si se cambia el contenido.

## Assumptions

- El flujo recomendado será:
  1. `Configura tu negocio`.
  2. `Registra ventas, entregas o ingresos`.
  3. `Cierra el día con cuentas claras`.
- Ejemplos posibles: entrega de agua, ingreso de vehículo, venta al contado, cobro pendiente.
- La sección no debe duplicar toda la información de `F-004`.

## Likely Files or Directories Involved

- `packages/app/app/components/landing/flow-animation.tsx` - Modify - copy, ejemplos e iconografía.
- `packages/app/app/components/landing/use-cases.tsx` - Review - alinear labels y rubros si ya existe.
- `packages/app/app/components/landing/hero.tsx` - Review - confirmar link `#how-it-works` sigue correcto.
- `packages/app/app/components/landing/navigation.tsx` - Review - confirmar ancla `Cómo funciona`.

## Dependencies on Other Feature IDs

- `F-004`

## Parallelization Notes

No recomendado en paralelo con `F-004`; necesita conocer labels y enfoque final de casos de uso.

## Worktree Recommendation

No recomendado salvo que `F-004` ya esté integrado.

## Suggested Branch/Worktree Name

- Branch: `feature/landing-flow-multirubro`
- Worktree: n/a

## Suggested `/plan` Mode

`structured`
