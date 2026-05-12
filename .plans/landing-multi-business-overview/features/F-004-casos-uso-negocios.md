# F-004 Casos de uso por negocio

## Objective

Crear una sección de casos de uso multi-negocio que explique cómo Avileo ayuda a agua, avícolas/polleros y cocheras, con beneficios concretos por rubro y una UI mobile-first.

## Scope Boundaries

### In scope

- Nuevo componente de landing para casos de uso.
- Presentación tipo tabs en desktop/tablet y patrón usable en mobile.
- Beneficios resumidos por rubro.
- Inserción de la sección en `landing.tsx`.
- Copy prudente alineado a capacidades existentes o razonables.

### Out of scope

- Implementar páginas dedicadas por vertical.
- Cambiar lógica de business modes.
- Añadir formularios de lead capture.
- Crear assets gráficos complejos o dependencias nuevas.

## Verified Context

- La landing no tiene sección explícita para rubros.
- `packages/app/package.json` incluye `@radix-ui/react-tabs`.
- La estructura de landing vive en `packages/app/app/components/landing/`.
- `landing.tsx` compone secciones en orden fijo.
- Existen planes previos para agua y cochera bajo `.plans/`, útiles como contexto de claim boundaries.

## Assumptions

- Rubros iniciales: `Agua`, `Avícolas / polleros`, `Cocheras`.
- Mensaje de sección: `Hecho para negocios que hoy viven en cuaderno`.
- Beneficios por agua: rutas, bidones/entregas, cobros y recaudación.
- Beneficios por avícola/polleros: peso/precio/tara, inventario por vendedor, deudas y cierre.
- Beneficios por cocheras: entradas/salidas, vehículos dentro, cobro por tiempo/tarifa e ingresos diarios.

## Likely Files or Directories Involved

- `packages/app/app/components/landing/use-cases.tsx` - Create - nueva sección de casos de uso.
- `packages/app/app/routes/landing.tsx` - Modify - importar e insertar `UseCasesSection`.
- `packages/app/app/components/ui/tabs.tsx` - Review - confirmar API local si se usan tabs shadcn.
- `packages/app/app/components/landing/feature-card.tsx` - Review - posible reutilización de patrón visual.

## Dependencies on Other Feature IDs

- `F-001`

## Parallelization Notes

Puede ejecutarse en paralelo con `F-002` y `F-003` después de `F-001`. Coordinar cambios en `landing.tsx` y navegación si se agrega una nueva ancla.

## Worktree Recommendation

Recomendado si hay otro agente trabajando hero/features al mismo tiempo.

## Suggested Branch/Worktree Name

- Branch: `feature/landing-use-cases`
- Worktree: `../wt-landing-use-cases`

## Suggested `/plan` Mode

`structured`
