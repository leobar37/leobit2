# F-002 Hero, navegación pública y SEO

## Objective

Actualizar metadata, hero, navegación y CTAs iniciales para que la primera impresión de `/landing` venda Avileo como el cuaderno digital multi-negocio para llevar cuentas desde el celular.

## Scope Boundaries

### In scope

- Metadata SEO/OG de `landing.tsx`.
- Description de `_index.tsx`.
- Headline, subcopy, badges y botones del hero.
- Labels de navegación pública y anclas existentes.
- Correcciones visibles de español cuando estén en la zona superior.

### Out of scope

- Nueva sección de casos de uso.
- Rediseño completo de pricing/FAQ/testimonios.
- Cambios de autenticación o rutas públicas distintas a copy/metadata.

## Verified Context

- `landing.tsx` tiene title/description/keywords/OG enfocados en avícolas.
- `_index.tsx` redirige usuarios sin sesión válida a `/landing` y usa la descripción `Sistema de ventas de pollo`.
- `hero.tsx` tiene CTA a `/register` y link a `#how-it-works`.
- `navigation.tsx` enlaza `#features`, `#how-it-works`, `#pricing`, `/login` y `/register`.
- La landing usa `ThemeToggle` en navegación.

## Assumptions

- El hero usará una promesa cercana a `Adiós papel. Lleva tus cuentas desde el celular.`
- Se mantendrán `/login` y `/register`.
- La navegación no necesitará menús móviles nuevos en esta feature.

## Likely Files or Directories Involved

- `packages/app/app/routes/landing.tsx` - Modify - metadata SEO/OG multi-negocio.
- `packages/app/app/routes/_index.tsx` - Modify - description no centrada en pollo.
- `packages/app/app/components/landing/hero.tsx` - Modify - headline, subcopy, badges, CTA copy.
- `packages/app/app/components/landing/navigation.tsx` - Modify - labels/accentos/anclas si cambia la sección de casos de uso.

## Dependencies on Other Feature IDs

- `F-001`

## Parallelization Notes

Puede ejecutarse junto con `F-003` o `F-004` después de `F-001`, pero coordinar cualquier cambio en `landing.tsx` y anclas de navegación.

## Worktree Recommendation

Worktree opcional si `F-003` y `F-004` se ejecutan en paralelo.

## Suggested Branch/Worktree Name

- Branch: `feature/landing-hero-seo`
- Worktree: `../wt-landing-hero-seo`

## Suggested `/plan` Mode

`structured`
