# Landing Multi Business Overview Context

## Overview

La iniciativa busca rediseñar la landing pública de Avileo para vender el producto como una app multi-negocio para pequeños negocios que hoy operan con cuaderno, papel, WhatsApp y cálculos manuales.

El mensaje central debe pasar de una landing principalmente avícola a una promesa más amplia:

> Adiós papel. Lleva tus cuentas desde el celular, sin dolores de cabeza.

## Goal

Al completar las features derivadas, `/landing` debe comunicar claramente que Avileo ayuda a negocios pequeños a vender, cobrar, controlar cuentas y revisar reportes desde el celular, con casos de uso explícitos para:

1. Reparto de agua.
2. Avícolas / polleros.
3. Cocheras.

## Decomposition Rationale

- El cambio no es solo visual: requiere alinear posicionamiento, SEO, hero, features, casos de uso, flujo visual, testimonios, FAQ y QA.
- La nueva sección de casos de uso debe depender de una narrativa base para evitar mensajes contradictorios.
- El flujo visual y la prueba social deben evitar prometer capacidades no soportadas por cada vertical.
- La landing es pública y comercial; conviene separar contenido, UI de casos de uso y cierre de validación.

## Scope Boundaries

### In scope

- Copy público en español es-PE.
- Reposicionamiento multi-negocio de metadata, hero, features, CTA, FAQ y testimonios.
- Nueva sección de casos de uso para agua, avícolas/polleros y cocheras.
- Ajuste del flujo visual actual para que deje de estar centrado en kilos/vendedores.
- Validación responsive, navegación pública, SEO básico y smoke visual.

### Out of scope

- Cambios de backend, base de datos o business modes.
- Registro/onboarding multi-rubro.
- Precios reales o cambios comerciales de planes.
- Integraciones nuevas con WhatsApp, pagos, facturación o GPS.
- Implementar funcionalidades prometidas por vertical; la landing solo debe reflejar capacidades existentes o prudentes.

## Verified Context

- La ruta pública está en `packages/app/app/routes/landing.tsx`.
- `/` redirige a `/landing` cuando no hay sesión válida desde `packages/app/app/routes/_index.tsx`.
- `landing.tsx` compone: `Navigation`, `HeroSection`, `FeaturesGrid`, `FlowAnimation`, `TestimonialsSection`, `PricingSection`, `FAQSection`, `CTASection`, `Footer`.
- La metadata de `landing.tsx` todavía menciona avícolas, inventario, vendedores y negocio avícola.
- `_index.tsx` todavía usa la descripción `Sistema de ventas de pollo`.
- `packages/app/app/components/landing/hero.tsx` tiene el mensaje genérico `Controla tu negocio en tiempo real`, pero no incluye todavía “adiós papel”, “cuentas” ni “dolores de cabeza”.
- `features-grid.tsx` incluye beneficios útiles, pero mantiene copy de kg/tara y menciona avícolas.
- `flow-animation.tsx` modela un día de trabajo con kg asignados a vendedores, por lo que sigue siendo avícola-first.
- `testimonials.tsx` usa tres ejemplos ligados a avícolas/pollo.
- `pricing.tsx`, `navigation.tsx`, `cta.tsx` y `faq.tsx` son reutilizables, pero necesitan copy multi-negocio y acentos visibles.
- `packages/app/package.json` expone `typecheck`, `build`, `test` y varios comandos e2e.
- Hay componentes UI existentes para tabs: dependencia `@radix-ui/react-tabs` y patrón shadcn-style en `packages/app`.
- Existen iniciativas previas relevantes: `.plans/agua-operativo-overview/` y `.plans/cocherapro-overview/`.

## Assumptions

- La landing puede usar testimonios placeholder similares a los actuales, salvo que producto aporte testimonios reales.
- La sección de casos de uso debe ser comercial y breve, no una documentación de funcionalidades por vertical.
- La primera versión debe priorizar mobile-first y evitar una landing demasiado larga.
- Se puede crear un nuevo componente bajo `packages/app/app/components/landing/`.

## Unknowns

- Si el equipo quiere naming comercial final: `Avileo`, `cuaderno digital`, `app de cuentas`, `sistema de ventas`, u otro.
- Si el copy de cocheras y agua debe mencionar solo capacidades ya implementadas o también visión comercial futura.
- Si se quiere mantener copy sin tildes por consistencia previa o normalizar toda la landing visible a español correcto.

## Suggested Validators

- `cd packages/app && bun run typecheck`
- `cd packages/app && bun test`
- `cd packages/app && bun run build`
- Smoke manual de `/landing` en mobile `390x844`.
- Smoke manual de navegación a `/login`, `/register`, anclas y modo claro/oscuro.
