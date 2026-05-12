# F-003 Dolores, beneficios y cuentas claras

## Objective

Reorientar la sección de beneficios para vender resultados transversales: dejar el papel, ordenar cuentas, evitar olvidos de cobro, ver reportes simples y reducir dolores de cabeza operativos.

## Scope Boundaries

### In scope

- Ajustar títulos y descripciones de features.
- Remover copy demasiado específico de kg/tara cuando no corresponda al beneficio transversal.
- Mantener beneficios breves y mobile-first.
- Reforzar cuentas, cobros, deudas, reportes y control por trabajador.

### Out of scope

- Crear la sección de casos de uso por rubro.
- Cambiar pricing o testimonios.
- Implementar nuevas funcionalidades de negocio.

## Verified Context

- `features-grid.tsx` define un array local `features`.
- La sección usa `FeatureCard` y `framer-motion`.
- Copy actual incluye `Peso × precio/kg con resta de tara` y menciona `avícolas`.
- `FeatureCard` ya permite icono, título y descripción sin cambios estructurales aparentes.

## Assumptions

- Los beneficios finales pueden incluir: `Adiós al papel`, `Cuentas claras`, `Cobros sin olvidos`, `Reportes simples`, `Control por trabajador`, `WhatsApp para comprobantes`.
- Se preservará el layout de grid actual.
- No se agregarán dependencias nuevas.

## Likely Files or Directories Involved

- `packages/app/app/components/landing/features-grid.tsx` - Modify - array de beneficios y copy introductorio.
- `packages/app/app/components/landing/feature-card.tsx` - Review - confirmar que soporta el contenido sin cambios.

## Dependencies on Other Feature IDs

- `F-001`

## Parallelization Notes

Puede ejecutarse en paralelo con `F-002` y `F-004` si ya existe el vocabulario base. Evitar duplicar beneficios exactos que se usarán en casos de uso.

## Worktree Recommendation

Worktree opcional.

## Suggested Branch/Worktree Name

- Branch: `feature/landing-paper-benefits`
- Worktree: `../wt-landing-paper-benefits`

## Suggested `/plan` Mode

`structured`
