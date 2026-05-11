# Avileo Contract

This contract defines how to make decisions when a task touches business types, vertical-specific flows, sales, customers, payments, inventory, configuration, or reports.

## Mandatory reading

Every agent must read this file before:

- Adding a new business type.
- Changing behavior conditioned by business type.
- Modifying vertical-specific sales, customer, collection, visit, distribution, report, or configuration flows.
- Deciding whether to reuse an existing screen, component, hook, or service.

## Core principle

Reuse only counts when reuse is simple.

If reuse requires many conditionals, hard-to-understand props, hidden knowledge, or business-specific exceptions, it is not sustainable reuse. In that case, create a specialized feature, component, module, or service built on top of simple shared primitives.

## Business mode contract

Persisted and shared business types live as `businessMode`.

Current sources:

- `packages/shared/src/business-modes/schema.ts`
- `packages/shared/src/business-modes/defaults.ts`
- `packages/backend/src/context/request-context.ts`
- `packages/app/app/hooks/use-business-mode.ts`

Current canonical keys:

| `businessMode` | Concept | Conceptual alias |
|---|---|---|
| `polleria` | Poultry sales | `poultry` |
| `agua` | Water delivery | `water` |
| `cochera` | Parking garage | `garage` |

Do not introduce new ad hoc keys. Every new mode must first be added to the shared `@avileo/shared` contract.

## How to write business-specific conditionals

Use the simplest level that solves the problem.

### 1. Small differences: flags

Use flags when the difference is a capability or one isolated field.

Examples:

- `useTara`
- `useNetWeight`
- `supportsCreditSettlement`
- `supportsPartialSettlement`
- `customCustomerFields`

Frontend:

```tsx
<BusinessMode flag="useTara">
  <TaraInput />
</BusinessMode>
```

Backend:

```ts
if (!ctx.modeFlags.supportsPartialSettlement) {
  // reject unsupported behavior
}
```

### 2. Simple gating: `useBusinessMode().is`

Use `useBusinessMode()` when a small section depends on the active mode.

```tsx
const { is } = useBusinessMode();

if (is.cochera) {
  return <CocheraContent />;
}
```

Prefer `useBusinessMode().is` over reading `business?.businessMode === "..."` directly in components, unless the component already has the business loaded and the case is very local and simple.

### 3. Declarative rendering: `BusinessMode`

Use `BusinessMode` for small, readable UI conditionals.

```tsx
<BusinessMode is="agua">
  <WaterOnlySection />
</BusinessMode>
```

```tsx
<BusinessMode isNot="cochera">
  <StandardInventorySection />
</BusinessMode>
```

### 4. Different flow: dedicated module, feature, or service

If the flow changes materially, do not fill the shared flow with conditionals.

Create a dedicated component, hook, route, module, or service when:

- The user's mental model changes.
- The main sequence of steps changes.
- Business rules, validations, or core entities change.
- The same file needs several `if businessMode === ...` branches.
- A shared component starts receiving props that only exist for one business type.

Current examples:

- `WaterRouteService.assertWaterMode()`
- `CocheraSessionService.ensureCocheraMode()`
- `useCocheraSessions`
- `_protected.cochera.*` routes

## Reuse vs create something new

| Situation | Decision |
|---|---|
| Text, labels, or optional fields change | Reuse with flags/configuration |
| A small UI section changes | Use `BusinessMode` or `useBusinessMode().is` |
| One validation rule changes | Use `ctx.businessMode` or `ctx.modeFlags` in the service |
| The main flow changes | Create a specialized feature/module |
| Many business-specific conditionals appear | Extract a strategy, module, or dedicated component |
| A shared file needs to know too many modes | Split responsibilities |

## Frontend standard for future lazy loading

The frontend must be able to load only the code for the active business type. Even when lazy loading is not implemented yet, new code must keep it possible.

For code exclusive to one vertical, use an explicit frontend module key:

| `businessMode` | `businessModuleKey` |
|---|---|
| `polleria` | `poultry` |
| `agua` | `water` |
| `cochera` | `garage` |

Recommended standard for new business-exclusive frontend code:

```txt
packages/app/app/business-modules/
├── poultry/
│   ├── components/
│   ├── hooks/
│   ├── routes/
│   └── index.ts
├── water/
│   ├── components/
│   ├── hooks/
│   ├── routes/
│   └── index.ts
└── garage/
    ├── components/
    ├── hooks/
    ├── routes/
    └── index.ts
```

Rules:

- If a file only serves one vertical, it must live under its business module or be clearly named with that vertical.
- If a file serves multiple verticals, it must live in shared `components/`, `hooks/`, or `lib/`.
- Each module must expose an `index.ts` to make imports and future lazy loading easier.
- Routes may continue to follow `flatRoutes()`, but exclusive logic must be imported from the corresponding module.
- Legacy names such as `components/cochera` or `use-water-routes` may remain; new code should move toward the module standard.

## Backend

In the backend, the active mode lives in `RequestContext`.

Use:

- `ctx.businessMode` to restrict exclusive services or flows.
- `ctx.modeFlags` for configurable capabilities.
- Dedicated services when the domain has its own entities or rules.

Every exclusive service must validate the mode at the beginning of its public methods or through a private helper.

```ts
private ensureGarageMode(ctx: RequestContext): void {
  if (ctx.businessMode !== "cochera") {
    throw new ForbiddenError("Esta función solo está disponible para cocheras");
  }
}
```

Do not resolve vertical rules in repositories. Repositories should focus on tenant-scoped data access; business decisions belong in services.

## Warning signs

Stop and reconsider before continuing if any of these signs appear:

- “Just one more `if`”.
- A shared component knows about three or more business types.
- A shared hook has several vertical-specific branches.
- A generic screen needs complex props to work for one business type.
- Changing one vertical can break another.
- An exclusive feature is mixed into a base flow without a clear interface.
- A new business type forces scattered changes across many unrelated screens.

## Final rule

First identify what is common, what is configurable, and what is specific.

- Common behavior is shared.
- Configurable behavior uses flags.
- Specific behavior is isolated.

Do not sacrifice maintainability for apparent reuse.
