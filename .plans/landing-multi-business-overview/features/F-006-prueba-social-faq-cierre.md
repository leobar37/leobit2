# F-006 Prueba social, FAQ y cierre comercial

## Objective

Ajustar testimonios, pricing copy, FAQ, CTA final y footer para reforzar la promesa multi-negocio y cerrar la landing con “deja el papel y ordena tu negocio hoy”.

## Scope Boundaries

### In scope

- Testimonios variados para agua, cochera y pollería/avícola.
- FAQ sobre tipos de negocio soportados.
- CTA final anti-papel y cuentas claras.
- Ajustes menores de pricing copy y acentos visibles.
- Footer si contiene copy comercial que deba alinearse.

### Out of scope

- Cambiar estructura real de planes o precios.
- Añadir checkout o contacto comercial.
- Crear testimonios reales sin input de producto.
- Cambiar navegación de auth.

## Verified Context

- `testimonials.tsx` contiene tres testimonios ligados a avícolas/pollo.
- `pricing.tsx` ya es relativamente general, pero contiene `Basico` y `Custom`.
- `faq.tsx` existe y puede recibir una pregunta sobre rubros.
- `cta.tsx` tiene CTA final genérico `Listo para transformar tu negocio?`.
- `footer.tsx` es simple y probablemente requiera poco o ningún cambio.

## Assumptions

- Se usarán placeholders realistas si no hay testimonios reales.
- CTA final sugerido: `Deja el papel y ordena tu negocio hoy.`
- FAQ sugerida: `¿Para qué tipos de negocio sirve Avileo?`
- Se normalizarán acentos visibles en secciones tocadas.

## Likely Files or Directories Involved

- `packages/app/app/components/landing/testimonials.tsx` - Modify - variedad de rubros y copy.
- `packages/app/app/components/landing/testimonial-card.tsx` - Review - confirmar que no requiere cambios.
- `packages/app/app/components/landing/pricing.tsx` - Modify - copy/accentos sin cambiar estructura comercial.
- `packages/app/app/components/landing/faq.tsx` - Modify - pregunta de rubros y copy anti-papel si aplica.
- `packages/app/app/components/landing/cta.tsx` - Modify - cierre comercial.
- `packages/app/app/components/landing/footer.tsx` - Review - alineación mínima.

## Dependencies on Other Feature IDs

- `F-001`
- `F-004`

## Parallelization Notes

Puede ejecutarse junto con `F-005` una vez `F-004` defina nombres de rubros y claims. Evitar cerrar testimonios/FAQ antes de tener labels finales.

## Worktree Recommendation

Worktree opcional.

## Suggested Branch/Worktree Name

- Branch: `feature/landing-social-faq-cta`
- Worktree: `../wt-landing-social-faq-cta`

## Suggested `/plan` Mode

`structured`
