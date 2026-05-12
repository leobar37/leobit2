# F-001 Planning Report: Posicionamiento y arquitectura de contenido

## 1. Full Copy Audit — Current vs Target State

### 1.1 `packages/app/app/routes/landing.tsx` (Metadata)

| Field | Current | Problem | Target Direction |
|-------|---------|---------|-----------------|
| `title` | `Avileo - Sistema de Ventas Online para Avicolas` | Single-vertical. "Avicolas" excludes agua/cochera. | `Avileo - Adios papel, cuentas claras desde tu celular` |
| `description` | `Sistema de gestion de ventas online... Ideal para avicolas y negocios con equipo de campo.` | Still avicola-first. "Equipo de campo" is vertical-specific. | Multi-business description about managing sales, customers, and payments from your phone. |
| `keywords` | `sistema de ventas, avicola, inventario, control de clientes, gestion de vendedores` | No multi-business keywords. | Add: `cuaderno digital, app de negocios, control de cuentas, cobros, reparto de agua, cochera` |
| `og:title` | `Avileo - Controla tu negocio avicola en tiempo real` | avicola-first | `Avileo - Adios papel, cuentas claras desde tu celular` |
| `og:description` | `La plataforma de ventas que organiza tu operacion, vendedores e inventario...` | Same avicola-first framing | Multi-business framing |

**Decision:** All metadata must be reworded to remove single-vertical references and use the umbrella promise. F-002 will implement.

### 1.2 `packages/app/app/routes/_index.tsx` (Public description)

| Field | Current | Problem | Target |
|-------|---------|---------|--------|
| `description` | `Sistema de ventas de pollo` | Extremely narrow. Wrong for all non-avicola visitors. | `Avileo - Controla tus cuentas desde el celular, sin papel` |

**Decision:** This file is a redirector with no visible copy to most users, but the metadata is still crawled by search engines. Fix for SEO. (F-002 scope.)

### 1.3 `hero.tsx`

| Copy | Problem | Target Direction |
|------|---------|-----------------|
| `Controla tu negocio en tiempo real` | Generic, doesn't express "adios papel" or multi-business | `Adios papel. Lleva tus cuentas desde el celular.` |
| `Ventas, inventario, clientes y cobranza. Todo en una sola plataforma online. Desde el celular de tu vendedor hasta tu panel de administracion.` | Good operational nouns, but "vendedor" assumes team-based avicola model | Preserve operational nouns (ventas, cobranza, clientes). Replace "vendedor" with neutral terms or present without role assumption. |
| Trust badges: `Sin tarjeta de credito`, `Datos seguros en la nube`, `Reportes al instante` | These are neutral. Preserve. | Keep, they work across all verticals. |

**Decision:** Hero H1 must become the umbrella promise directly. Subcopy must keep operational nouns but drop avicola-specific role framing. (Delegated to F-002.)

### 1.4 `features-grid.tsx`

| Feature | Current | Problem | Target |
|---------|---------|---------|--------|
| Heading | `Todo lo que necesitas para tu negocio` | Good, neutral | Preserve |
| Subheading | `Funciones completas disenadas para avicolas y negocios con equipo de ventas en campo.` | avicola-first | `Funciones completas para cualquier negocio que vende, cobra y controla sus cuentas.` |
| "Calculadora Automatica" | `Peso × precio/kg con resta de tara. Tus vendedores cobran rapido y sin errores.` | kg/tara is avicola-specific | Reframe as "cuentas claras" / automatic totals from phone. Keep calculation UX but generalize use case. |
| "Venta Rapida" | `Contado o credito, con o sin cliente. Registra cada venta en segundos desde el celular.` | Mostly neutral | Preserve, works for all businesses. |
| "Clientes y Cuentas al Dia" | `Sabe quien debe, cuanto y cuando cobraste. Ninguna deuda se pierde.` | Excellent debt/collection language | Preserve. |
| "Inventario Siempre Claro" | `Asigna inventario por vendedor y controla lo vendido en tiempo real. Sin sorpresas.` | "vendedor" assignment assumes avicola | Generalize: inventory control language, make it work for agua (botellas/cajas) and cochera (spaces/stock). |
| "Numeros que Deciden por Ti" | `Dashboard con metricas claras y exportacion a Excel. Deja de calcular de memoria.` | Neutral | Preserve. |
| "WhatsApp sin Complicaciones" | `Envia comprobantes directo al celular del cliente. Mas profesionalismo, menos preguntas.` | Neutral | Preserve. |

**Decision:** All feature cards keep their core value proposition. Only adjust the subheading and the calculator/inventory cards to remove avicola-specific phrasing. (Delegated to F-003.)

### 1.5 `flow-animation.tsx`

| Element | Current | Problem | Target |
|---------|---------|---------|--------|
| Heading | `Un dia de trabajo con Avileo` | Neutral | Preserve |
| Subheading | `Desde la asignacion de inventario hasta el cierre del dia. Todo actualizado en tiempo real.` | Neutral | Preserve |
| Admin node content | `Asigna 50kg a Juan`, `Asigna 40kg a Maria` | kg-based inventory with vendor names is deeply avicola | Needs full reshape: show business-agnostic operations (start day, check pending deliveries, activate route). |
| Vendor node | `Vendedores` with kilos sold and PEN totals | Two-named vendors with kilos is avicola-first | Neutralize: show "tu equipo" or remove named vendor scenarios, shift to activity cards. |
| Dashboard node | `S/760`, `+12% vs ayer`, vendor breakdown | The dashboard data itself is neutral, but the admin→vendor→dashboard flow assumes avicola distribution model. | The three-step flow (setup → execute → review) is a strong narrative. Keep the structure, rename roles to be business-agnostic. |

**Decision:** Flow-animation is the most avicola-specific component. Need to redesign the scenario to show a business-agnostic day: product preparation → route/distribution → end-of-day review. (Delegated to F-005, which depends on F-004.)

### 1.6 `testimonials.tsx`

| Quote | Role | Problem |
|-------|------|---------|
| `...veo cuanto vendio cada vendedor sin esperar al cierre...` | `Avicola El Dorado` | Avicola-specific |
| `...llevaba clientes y deudas en un cuaderno. Con Avileo se quien debe...` | `Avicola San Jose` | The pain description (cuaderno, deudas) is universal. Role tag is avicola. |
| `...inventario ya no se me escapa. Asigno kilos...` | `Pollo Delicia` | kg reference + avicola role |

**Decision:** Quote content 2 ("cuaderno, deudas") is excellent and should be preserved. Quotes 1 and 3 need rewriting to be business-agnostic. All roles must change from avicola-specific to general small business. (Delegated to F-006.)

### 1.7 Components that are already mostly neutral

| Component | Assessment | Action |
|-----------|------------|--------|
| `Navigation` | Links and CTAs are neutral | Preserve |
| `Pricing` | Plan names and features are neutral, though features mention inventory/WhatsApp which apply to all verticals | Preserve |
| `FAQ` | All questions/answers are neutral (no vertical-specific content) | Preserve |
| `CTA` | Copy is neutral | Preserve, though consider if the promise should appear in CTA heading |
| `Footer` | Neutral | Preserve |

## 2. Umbrella Message Architecture

### Main Promise (Hero H1)
```
Adios papel. Lleva tus cuentas desde el celular.
```

### Tagline / Subpromise (Hero subcopy)
```
Vende, cobra y controla tus cuentas sin papel ni calculos manuales.
Todo desde tu celular. Sin dolores de cabeza.
```

### Trust line (below CTA)
Keep existing badges: `Sin tarjeta de credito`, `Datos seguros en la nube`, `Reportes al instante`.

### SEO title pattern
`Avileo - [promise snippet]` — avoid vertical names in the title.

## 3. Vocabulary Recommendations

### Approved words (use actively)
- `cuentas` (the most universal small-business concern)
- `cobros` / `cobranza`
- `deudas` / `deben`
- `ventas`
- `reportes`
- `desde tu celular`
- `sin papel`
- `control` / `orden`
- `cuaderno digital` (secondary positioning)
- `negocio` (generic)

### Avoid (unless specifically in vertical use-case section)
- `avicola` / `pollo` / `kilos` / `tara` (except in avicola use-case tab)
- `vendedor` as default role (use `tu equipo`, `colaborador`, or omit)
- `mercado` / `mayorista` as default scenario

### Conditional (ok in vertical-specific sub-sections only)
- `botellas`, `bidones` (agua)
- `pollo`, `kilos`, `kg` (avicola)
- `cocheras`, `estacionamiento`, `espacios` (cochera)

## 4. What Must Change vs What to Preserve

### Must change (urgent, affects SEO + first impression)
- `landing.tsx` metadata title, description, keywords, OG tags
- `_index.tsx` meta description
- `hero.tsx` H1 and subcopy
- `features-grid.tsx` subheading + calculator/inventory feature cards

### Must change (needs redesign)
- `flow-animation.tsx` scenario and content (deep avicola-specific)
- `testimonials.tsx` role tags, 2 of 3 quotes

### Preserve as-is
- `Navigation` (neutral)
- `Pricing` (neutral)
- `FAQ` (neutral)
- `CTA` (neutral, minor wording optional)
- `Footer` (neutral)

## 5. Over-Promise Guardrails

| Capacity | Landing Promise Limit | Rationale |
|----------|----------------------|-----------|
| Water delivery (agua) | "Registra tus ventas de reparto" — do NOT promise GPS tracking, route optimization, or driver app | Not yet implemented |
| Chicken sales (avicola) | "Controla inventario y ventas de tu negocio" — do NOT promise integrations with scales, barcode scanning, or market prices | Not yet implemented |
| Parking/cochera | "Lleva el control de tus espacios y cobros" — do NOT promise automated gate control, time-based billing, or license plate recognition | Not yet implemented |
| General | Do NOT say "ERP", "Sistema completo de gestion", "administracion total del negocio" | Over-promises; Avileo is a pocket app, not an ERP |
| WhatsApp | "Envia comprobantes de venta por WhatsApp" — do NOT promise chatbot, automated marketing, or broadcast campaigns | Only manual comprobante sending |
| Offline | Do NOT claim "funciona sin internet" unless offline mode is confirmed working for the landing path | Check current offline capabilities |

### Risk: Single-vertical SEO cannibalization
Changing from "avicola" to multi-business may temporarily drop avicola-specific SEO rankings. Mitigation:
- Keep `/features` or `/solutions/avicola` as a deep link (future)
- Use structured data to signal both vertical and general business relevance

### Risk: Testimonials look fake if all vertical references are removed
Mitigation: Keep one avicola testimonial by making the testimonial section have a filter/tabs by vertical (F-006), or make them clearly generic small business owners.

## 6. Naming Decisions

Per the "Unknowns" in context.md:

### Question: Brand name positioning
**Decision:** Keep `Avileo` as the primary brand. Do NOT use `cuaderno digital` in the H1 (it's secondary). Use `app de cuentas` or `cuaderno digital` in body copy sparingly.

### Question: Accents in copy
**Decision:** Normalize ALL visible landing copy to correct Spanish orthography (tildes, ¿, ¡). Code comments remain in English. The existing inconsistent accent usage is a quality issue.

### Question: Future vs existing capabilities
**Decision:** Only mention capabilities that exist today or are in active development with clear scope. For agua/cochera, the landing should say "ideal para..." without promising features not yet built. Reference context.md: "the landing should only reflect existing or prudent capabilities."

## 7. Decisions Passed to Downstream Features

### To F-002 (Hero + Navigation + SEO)
- New H1: `Adios papel. Lleva tus cuentas desde el celular.`
- New hero subcopy (see section 2)
- Metadata template strings for all routes
- Keep navigation structure; no changes needed

### To F-003 (Features / Benefits / "Dolores")
- Keep feature grid structure, 6 cards
- Rewrite `features-grid.tsx` subheading
- Reframe calculator feature: remove kg/tara, generalize to automatic totals
- Reframe inventory feature: remove "por vendedor" assignment language
- Preserve "Clientes y Cuentas al Dia", "Numeros que Deciden", "WhatsApp"

### To F-004 (Use Cases)
- Vocabulary per vertical defined (section 3)
- Over-promise guardrails per vertical (section 5)
- Use-case section should reference these vocab rules
- Each vertical tab/card must be brief and commercial, not functional documentation

### To F-006 (Testimonials, FAQ, CTA)
- Preserve FAQ as-is
- Preserve CTA as-is (CTA heading could mention "adios papel" as a variant)
- Rewrite 2 of 3 testimonial quotes; change all role tags to general small business
- Consider testimonial-by-vertical tab pattern (avicola / agua / cochera)

## 8. Files Changed in This Feature

**No code files changed.** This is a planning-only output.

- Created: `.plans/landing-multi-business-overview/features/F-001-posicionamiento-contenido--report.md`

## 9. Validation

- No code validators required (planning-only).
- Internal consistency check: all decisions in this report align with `context.md` (umbrella promise, multi-business scope, evitar ERP phrasing, vertical-specific guardrails).
- All decisions map 1:1 to the scope defined in `F-001-posicionamiento-contenido.md`.
- Dep feature graph: F-002, F-003, F-004, and F-006 all have concrete inputs from section 7 above.

## 10. Remaining Risks or Blockers

| Risk | Severity | Mitigation |
|------|----------|------------|
| SEO impact of removing "avicola" from metadata | Medium | Keep avicola as a deep-link use case in F-004; structured data; monitor rankings post-deploy |
| Testimonial credibility after removing vertical names | Low | Rewrite quotes to focus on universal pains (cuaderno, deudas, orden); generic roles |
| Flow-animation redesign complexity | Medium | F-005 has clear scope: make it business-agnostic without fully rebuilding the component |
| Water/cochera capabilities not yet built | High | Guardrails (section 5) explicitly limit landing promises to what exists or is prudent |
