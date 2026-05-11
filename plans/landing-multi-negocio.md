# Plan: Rediseño de Landing para Soporte Multi-Negocio

## Contexto

Avileo actualmente soporta tres tipos de negocio:
- **Pollería / distribuidora de pollo** (`polleria`)
- **Reparto de agua** (`agua`)
- **Cochera / playa de estacionamiento** (`cochera`)

La landing actual (`packages/app/app/routes/landing.tsx`) está orientada exclusivamente a avícolas/pollerías. El meta título dice "Sistema de Ventas Online para Avícolas" y todo el copy habla de kilos, vendedores de campo, etc.

El objetivo es transformar la landing para:
1. **Permitir al usuario elegir qué tipo de negocio quiere explorar** — no mostrar todo mezclado.
2. **Mostrar una descripción específica por cada giro de negocio** que refleje cómo Avileo ayuda en ese rubro.
3. **Comunicar que Avileo es un "sistema de bolsillo"** — no estamos en contra del papel, sino que somos el complemento digital que organiza lo que antes se hacía en cuadernos.

## Estado Actual de la Landing

La landing está compuesta por estas secciones (de arriba a abajo):

| Sección | Archivo | Estado |
|---|---|---|
| Navegación fija | `navigation.tsx` | Genérica, OK |
| Hero | `hero.tsx` | Muy específico a pollería |
| Features Grid | `features-grid.tsx` | 6 features genéricas pero con copy de avícola |
| Cómo funciona (animación) | `flow-animation.tsx` | Flujo de pollería (asignación de kg, vendedores) |
| Testimonios | `testimonials.tsx` | 3 testimonios de avícolas |
| Precios | `pricing.tsx` | Genérico, OK |
| FAQ | `faq.tsx` | Genérico, OK |
| CTA | `cta.tsx` | Genérico, OK |
| Footer | `footer.tsx` | Genérico, OK |

## Tipos de Negocio Soportados (fuente de verdad)

Los modos de negocio están definidos en:
- `packages/shared/src/business-modes/schema.ts` — `BusinessModeSlugSchema = z.enum(["polleria", "agua", "cochera"])`
- `packages/shared/src/business-modes/defaults.ts` — `BUSINESS_MODE_DEFAULTS` con flags por modo
- `packages/app/app/routes/_protected.business.create.tsx` — UI de selección de modo al crear negocio

Los modos actuales y sus descripciones en el form de creación:

| Modo | Título | Descripción actual en el form |
|---|---|---|
| `polleria` | Pollería / distribuidora de pollo | Ventas por kilos, reparto diario, clientes y cobros. |
| `agua` | Reparto de agua | Rutas, bidones, recargas y clientes recurrentes. |
| `cochera` | Cochera / playa de estacionamiento | Entradas, salidas, tarifas y cobro por permanencia. |

## Approach Propuesto

### Opción A: Selector de negocio en el Hero (recomendada)

1. **Hero rediseñado**: En lugar de ir directo a "Controla tu negocio avícola", el hero presenta a Avileo como plataforma multi-rubro y ofrece **3 tarjetas/botones para elegir negocio**.
2. **Al hacer click en un negocio**, la landing se "personaliza":
   - El hero se actualiza con copy específico del negocio seleccionado.
   - Las features se filtran/reordenan para mostrar las más relevantes para ese rubro.
   - El flujo "cómo funciona" muestra el flujo de trabajo específico de ese negocio.
   - Los testimonios (idealmente) serían del rubro seleccionado.
3. **Mensaje de "sistema de bolsillo"**: Incorporar en el hero o en una sección dedicada el mensaje de que Avileo organiza lo que antes se llevaba en papel — no reemplaza el cuaderno, lo mejora.

### Opción B: Landing con tabs/selector sticky

Similar a A pero con un selector sticky que permite cambiar de rubro en cualquier momento mientras se scrollea.

**Recomendamos Opción A** por simplicidad y claridad de mensaje.

## Archivos a Modificar

| Archivo | Cambio |
|---|---|
| `packages/app/app/routes/landing.tsx` | Añadir estado para modo seleccionado; pasar como prop a secciones hijas |
| `packages/app/app/components/landing/hero.tsx` | Rediseñar: selector de negocio + copy dinámico por modo |
| `packages/app/app/components/landing/features-grid.tsx` | Features dinámicas por modo de negocio |
| `packages/app/app/components/landing/flow-animation.tsx` | Flujo de trabajo dinámico por modo |
| `packages/app/app/components/landing/testimonials.tsx` | Testimonios dinámicos por modo (o genéricos) |
| `packages/app/app/routes/landing.tsx` (meta) | Actualizar meta tags para ser genéricos o dinámicos |

## Archivos Potencialmente Nuevos

| Archivo | Propósito |
|---|---|
| `packages/app/app/components/landing/business-selector.tsx` | Componente reutilizable de selección de negocio (tarjetas) |
| `packages/app/app/components/landing/business-descriptions.ts` | Centralizar copy, features, flujos y testimonios por modo |

## Reutilización Existente

- El componente `FeatureCard` (`feature-card.tsx`) ya soporta `icon`, `title`, `description` — se puede reutilizar para features por negocio.
- El componente `TestimonialCard` (`testimonial-card.tsx`) ya es genérico.
- El `PricingCard` (`pricing-card.tsx`) es genérico.
- Los íconos de Lucide ya usados: `Drumstick`, `Droplets`, `CarFront` — ya están en el form de creación de negocio.

## Respuestas del Usuario

1. **¿Más giros en roadmap?** ✅ **Sí** — lo que sigue son **barberos, peluqueros**, y potencialmente más. El diseño debe ser **escalable** para agregar nuevos rubros sin reescribir la landing.

2. **¿Tienes testimonios reales de agua y cochera?** ❓ *Pendiente.*

3. **¿Flujo "cómo funciona" específico por rubro?** ❓ *Pendiente.*

4. **¿"Sistema de bolsillo" — reemplazamos el papel?** ✅ **Sí, exacto.** El mensaje es que Avileo **reemplaza el papel** — tu cuaderno de notas, tus hojas de cálculo, tus papeles sueltos. Es tu sistema de bolsillo que organiza todo lo que antes escribías a mano. No es "complemento", es **la evolución digital del cuaderno de tu negocio**.

5. **¿URL con rubro seleccionado?** ❓ *Pendiente.*

---

## Implicaciones de la Escalabilidad

Dado que vendrán más rubros (barberos, peluqueros, etc.), el approach cambia:

- **No hardcodear** los 3 rubros actuales en la UI.
- **Centralizar la configuración por rubro** en un archivo de datos que sea fácil de extender.
- El componente de selección debe soportar **N rubros**, no solo 3. Considerar un diseño que escale visualmente (grid responsive, scroll horizontal, o categorías).
- Los features, flujos y testimonios por rubro deben vivir en un **objeto de configuración**, no dispersos en JSX.

## Preguntas Pendientes

2. **¿Tienes testimonios reales de clientes de agua y cochera?** Los actuales son solo de avícolas. Si no hay, ¿usamos testimonios genéricos u omitimos la sección para rubros sin testimonios reales?

3. **¿Qué tan específico debe ser el flujo "cómo funciona" por negocio?** Por ejemplo, para cochera el flujo sería: entrada de vehículo → cobro por tiempo → cierre del día. ¿Quieres que diseñemos un flujo visual diferente para cada rubro, o que simplifiquemos a un flujo genérico?

5. **¿Quieres que el selector de negocio persista (por ejemplo, en la URL como `?negocio=agua`)** para que al compartir el link se vea directamente el rubro elegido?
