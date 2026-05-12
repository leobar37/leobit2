# F-007 QA visual, accesibilidad y SEO

## Objective

Validar la landing pública completa después del rediseño multi-negocio, asegurando que sea responsive, accesible de forma básica, consistente en español y libre de copy avícola-first no intencional.

## Scope Boundaries

### In scope

- Validación de `/landing` sin sesión.
- Revisión mobile `390x844`.
- Revisión de navegación pública, CTAs, anclas, modo claro/oscuro.
- Validación de metadata multi-negocio.
- Búsqueda de referencias no deseadas a `pollo`, `avícola`, `kg`, `tara` fuera de casos de uso intencionales.
- Ejecutar validadores frontend.

### Out of scope

- E2E exhaustivo de flujos autenticados.
- Rediseñar secciones durante QA salvo correcciones necesarias.
- Cambios de backend.

## Verified Context

- `packages/app/package.json` expone `typecheck`, `build`, `test` y comandos e2e.
- La landing está en una ruta pública y usuarios sin token son redirigidos desde `/`.
- No se encontraron tests dedicados para landing en el análisis inicial.
- La navegación incluye enlaces a `/login`, `/register` y anclas.

## Assumptions

- QA puede apoyarse en validación manual si no se crea test dedicado.
- Build/typecheck/test son suficientes como gate técnico base.
- Si se agregan tabs, se revisará navegación por teclado de la implementación shadcn/Radix.

## Likely Files or Directories Involved

- `packages/app/app/routes/landing.tsx` - Review - composición y metadata final.
- `packages/app/app/routes/_index.tsx` - Review - description final.
- `packages/app/app/components/landing/` - Review - copy y responsive final.
- `packages/app/app/components/ui/tabs.tsx` - Review - accesibilidad si se usa en casos de uso.
- `packages/app/app/routes/__tests__/` - Review - decidir si existe cobertura útil a extender.

## Dependencies on Other Feature IDs

- `F-002`
- `F-003`
- `F-004`
- `F-005`
- `F-006`

## Parallelization Notes

No paralelizar. Es el cierre de calidad de la iniciativa.

## Worktree Recommendation

No recomendado; debe ejecutarse sobre la integración final.

## Suggested Branch/Worktree Name

- Branch: `feature/landing-qa-visual-seo`
- Worktree: n/a

## Suggested `/plan` Mode

`simple`
