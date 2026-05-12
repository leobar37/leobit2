# F-001 Posicionamiento y arquitectura de contenido

## Objective

Definir la narrativa base de la landing multi-negocio para que todas las secciones comuniquen: adiós papel, cuentas claras desde el celular y menos dolores de cabeza operativos.

## Scope Boundaries

### In scope

- Mensaje paraguas, promesa principal y claim boundaries.
- Vocabulario recomendado para landing pública.
- Inventario de copy actual que debe cambiarse o preservarse.
- Criterios para no sobreprometer capacidades por vertical.

### Out of scope

- Implementar UI.
- Crear componentes nuevos.
- Cambiar onboarding, backend o business modes.

## Verified Context

- `packages/app/app/routes/landing.tsx` contiene metadata avícola-first.
- `packages/app/app/routes/_index.tsx` usa `Sistema de ventas de pollo`.
- `hero.tsx`, `features-grid.tsx`, `flow-animation.tsx` y `testimonials.tsx` contienen copy operativo que aún no expresa con fuerza “adiós papel” ni multi-negocio.
- Avileo ya tiene iniciativas y superficies para agua y cochera, pero la landing no las muestra como casos de uso.

## Assumptions

- El mensaje principal aprobado será cercano a: `Adiós papel. Lleva tus cuentas desde el celular.`
- El tono debe ser directo, simple y comercial para pequeños negocios.
- La landing debe hablar de cuentas, cobros, deudas, ventas y reportes sin parecer un ERP pesado.

## Likely Files or Directories Involved

- `packages/app/app/routes/landing.tsx` - Review - metadata y composición afectadas por la narrativa.
- `packages/app/app/routes/_index.tsx` - Review - descripción pública genérica.
- `packages/app/app/components/landing/` - Review - secciones públicas con copy.
- `.plans/landing-multi-business-overview/context.md` - Review - contexto y límites de la iniciativa.

## Dependencies on Other Feature IDs

- none

## Parallelization Notes

No debe ejecutarse en paralelo con features de copy downstream. Sus decisiones alimentan `F-002`, `F-003`, `F-004` y `F-006`.

## Worktree Recommendation

No recomendado. Mantener en el árbol principal o una rama base para facilitar revisión temprana.

## Suggested Branch/Worktree Name

- Branch: `feature/landing-multi-business-positioning`
- Worktree: n/a

## Suggested `/plan` Mode

`structured`
