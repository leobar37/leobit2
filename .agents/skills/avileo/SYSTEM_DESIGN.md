# System Design Notes

> Durable product and UI decisions inferred from real Avileo implementation and browser QA.

## Business-Vertical Design

Avileo supports multiple business types. When a workflow changes in language, operating model, or user intent, prefer a vertical component or route-level branch instead of filling one large component with scattered conditionals.

Recommended pattern:

- Route decides the business variant.
- Shared hooks/services remain shared when the data contract is truly the same.
- Business-specific components own copy, layout, and operational decisions.

Examples:

- `PolleriaCobrosPage`, `WaterCobrosPage`, `CocheraCobrosPage`
- Polleria sales editor vs water quick sale
- Polleria inventory distribution vs water route summary

Use small `businessMode` conditionals only for local field labels or tiny visual differences inside an otherwise identical experience.

## Water Business Operating Model

For `agua`, do not force the polleria mental model.

Core flow:

- Customer is an operational contact: name, phone, address, route/zone, instructions, usual containers.
- Delivery is created for a concrete date when there is intent to serve the customer.
- Daily route is the driver's work container.
- Completing a delivery is the main source of truth for sale, payment, and inventory deduction.
- Frequency/days are optional or legacy; they should not guide the primary customer UX.

Language:

- Use `entrega`, `ruta`, `repartidor`, `bidones`, `entregado`, `no atendio`, `reprogramar`.
- Avoid polleria language in water surfaces: `compro/no compro`, `kilos`, `tara`, `presentacion`, `modo libre`.

Inventory in water:

- Current stage can use global stock.
- The UI must not imply that inventory is uncontrolled.
- Future evolution: driver load control with initial load, delivered, returned, damaged/lost, and closing balance.

## Mobile UI Direction

Avileo is a pocket business app, not a marketing dashboard. Mobile screens should feel operational, readable, and calm.

Prefer:

- Flat lists with separators for dense operational records.
- Segment controls for mode/date/theme selection.
- Small icon containers, subtle borders, and restrained color signals.
- Text hierarchy, spacing, and dividers over nested cards.
- Clear empty states and direct actions.

Avoid:

- Large rounded cards for every row.
- Pills/badges for common states when a colored dot plus text is enough.
- Nested cards or card-inside-card layouts.
- Heavy shadows in dark mode.
- Oversized hero blocks on operational screens.
- One-off hardcoded dark surfaces that do not follow theme tokens.

Practical defaults:

- Use `rounded-lg` or smaller for routine controls and rows.
- Reserve strong orange for primary actions or selected states.
- Use `border-border`, `bg-muted/*`, `text-muted-foreground`, and theme tokens before custom colors.
- Keep mobile viewport `390x844` as a baseline.

## Patterns Confirmed In Browser QA

The following screens were intentionally moved toward a flatter style:

- `/profile`: compact theme segmented control and flat app-install row.
- `/config`: settings options as a flat list with subtle dividers.
- `/dashboard`: flatter header, compact period selector, lighter quick actions, lighter metric cards.
- `/visitas` in water mode: flat delivery rows, subtle status text, readable route header, human-readable dates and reasons.

When updating related screens, keep this direction consistent across the shell, navbar, toolbar, and operational lists.

## Validation Expectations

For visible UX changes, validate with the Codex in-app Browser on the real local app, especially in:

- Dark mode.
- Mobile viewport around `390x844`.
- The actual route the user is looking at.

Check:

- Text does not overlap.
- Buttons remain tappable.
- Bottom navbar does not cover important actions.
- Drawer/sheet interactions do not fight the mobile keyboard.
- Water flows do not leak polleria language.
