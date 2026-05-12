# Landing Multi Business Feature Index

## Summary

- Mode: Initiative Overview
- Slug: `landing-multi-business-overview`
- Feature Briefs Directory: `features/`
- Dependency Graph: `dependency-graph.md`
- Worktree Strategy: `worktrees.md`

## Feature List

| Feature ID | Brief File | Goal | Suggested Plan Mode | Dependencies | Parallelizable | Status | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `F-001` | `features/F-001-posicionamiento-contenido.md` | Definir y aplicar el mensaje paraguas multi-negocio: adiós papel, cuentas claras y menos dolores de cabeza. | `structured` | none | no | done | unassigned |
| `F-002` | `features/F-002-hero-navegacion-seo.md` | Actualizar metadata, hero, navegación pública y CTAs iniciales para comunicar la nueva promesa. | `structured` | `F-001` | no | done | unassigned |
| `F-003` | `features/F-003-dolores-beneficios-cuentas.md` | Reorientar features hacia dolores del papel, cuentas, cobros, reportes y control operativo. | `structured` | `F-001` | yes | done | unassigned |
| `F-004` | `features/F-004-casos-uso-negocios.md` | Crear una sección de casos de uso para agua, avícolas/polleros y cocheras con beneficios por rubro. | `structured` | `F-001` | yes | done | unassigned |
| `F-005` | `features/F-005-flujo-visual-multirubro.md` | Convertir el flujo visual actual de avícola-first a una narrativa neutral o apoyada en rubros. | `structured` | `F-004` | no | done | unassigned |
| `F-006` | `features/F-006-prueba-social-faq-cierre.md` | Ajustar testimonios, precios, FAQ, CTA final y footer para sostener la promesa multi-negocio. | `structured` | `F-001`, `F-004` | yes | done | unassigned |
| `F-007` | `features/F-007-qa-visual-seo.md` | Validar landing pública, responsive, accesibilidad básica, SEO, enlaces y ausencia de copy avícola-first no intencional. | `simple` | `F-002`, `F-003`, `F-004`, `F-005`, `F-006` | no | done | unassigned |

## Suggested Execution Waves

1. **Wave 1 - Foundation**: `F-001`
2. **Wave 2 - Above-fold and benefits**: `F-002`, `F-003`, `F-004`
3. **Wave 3 - Narrative depth**: `F-005`, `F-006`
4. **Wave 4 - QA closure**: `F-007`

## Change Log

- Added: `F-001`, `F-002`, `F-003`, `F-004`, `F-005`, `F-006`, `F-007`
- Removed: none
- Split: none
- Merged: none
- Refresh note: overview did not previously exist, so all feature IDs are newly assigned.
- Status Updated: `F-001` marked done after positioning report `features/F-001-posicionamiento-contenido--report.md`.
- Status Updated: `F-002`, `F-003`, and `F-004` marked done after Wave 2 implementation report; next unblocked batch is `F-005`, `F-006`.
- Status Updated: `F-005` marked done after implementation report; `F-006` remains the next unblocked feature.
- Status Updated: `F-006` marked done after implementation report; `F-007` is now unblocked for final QA.
- Status Updated: `F-007` marked done after QA report; all overview features are now marked done.

## Follow-up Commands

- `/plan .plans/landing-multi-business-overview/features/F-001-posicionamiento-contenido.md`
- `/plan .plans/landing-multi-business-overview/features/F-002-hero-navegacion-seo.md`
- `/plan .plans/landing-multi-business-overview/features/F-003-dolores-beneficios-cuentas.md`
- `/plan .plans/landing-multi-business-overview/features/F-004-casos-uso-negocios.md`
- `/plan .plans/landing-multi-business-overview/features/F-005-flujo-visual-multirubro.md`
- `/plan .plans/landing-multi-business-overview/features/F-006-prueba-social-faq-cierre.md`
- `/plan .plans/landing-multi-business-overview/features/F-007-qa-visual-seo.md`
