# Mobile Core Layout Refactor - Learnings

## Floating Action Migration (T7)

### What was done
- Added `MobileShell.FloatingAction` component to `mobile-shell.tsx` that wraps `MobileSlot name="floating"`
- Added a fixed-position floating slot host inside `MobileShellRoot`, positioned above the bottom nav using CSS custom properties (`--shell-bottom-nav-height`, `--shell-safe-area-bottom`)
- Migrated 9 list/index route files from manual `fixed bottom-...` FABs to `MobileShell.FloatingAction`:
  1. `_protected.clientes._index.tsx`
  2. `_protected.ventas._index.tsx`
  3. `_protected.distribuciones.tsx`
  4. `_protected.visitas.tsx`
  5. `_protected.productos._index.tsx`
  6. `_protected.compras._index.tsx`
  7. `_protected.proveedores._index.tsx`
  8. `_protected.config.tags.tsx`
  9. `_protected.config.puntos-venta.tsx`

### Patterns found
- Most routes used `fixed bottom-28 right-4 z-50` with a `Button size="icon"` inside
- Proveedores used `fixed bottom-20 right-4 z-50` (inconsistent spacing)
- Tags and puntos-venta used raw `<button>` elements instead of the `<Button>` component
- All routes already get `MobileShell.Root variant="protected"` via `AppLayout` -> `_protected.tsx`

### Decisions made
- Normalized tags and puntos-venta to use `<Button>` component for consistency
- Kept all existing navigation destinations, click handlers, and conditional rendering intact
- The floating slot host is positioned at `bottom: calc(72px + safe-area + 1rem)` which is equivalent to the old `bottom-28` (~112px)
- The `floating` slot is a multi-writer slot, so multiple floating actions could stack (though each route only registers one)

### Verification
- `bun run typecheck` passes cleanly
- Static audit: zero `fixed bottom-` matches in all 9 migrated route files

## 2026-04-29 -- Wave 1: Semantic Shell Token Layer

### What Changed
- File: `packages/app/app/styles/globals.css`
- Added 35 semantic CSS custom properties to both `:root` (light) and `.dark` (dark)
- Refactored all 12 shell helper classes to reference variables instead of raw rgba/hex
- Preserved every existing class name as a compatibility alias

### Variable Categories Added
1. **Background surfaces**: `--app-bg`, `--app-bg-glow`, `--page-surface`, `--card-surface`, `--card-surface-flat`, `--card-surface-soft`, `--footer-surface`, `--bottom-nav-bg`, `--surface-highlight`
2. **Muted tones**: `--muted-bg`, `--muted-bg-block`
3. **Borders**: `--border-color`, `--border-color-strong`, `--border-color-muted`, `--border-color-soft`, `--border-color-block`, `--border-color-card`, `--divider-color`
4. **Actions/States**: `--primary-action`, `--danger-action`, `--focus-ring`, `--toolbar-bg`, `--toolbar-bg-hover`, `--nav-active-bg`, `--nav-hover-bg`
5. **Highlights**: `--highlight-top`, `--highlight-top-soft`, `--highlight-top-muted`
6. **Shadows**: `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-card`, `--shadow-flat`, `--shadow-nav`

### Shell Classes Refactored
- `.app-shell`, `.shell-surface`, `.shell-card`, `.shell-card-muted`, `.shell-card-flat`, `.shell-card-soft`, `.shell-block-muted`, `.shell-field`, `.shell-divider`, `.shell-toolbar-button`, `.shell-nav-active`, `.shell-nav-item:hover`

### Key Technique
CSS custom properties can store complete `box-shadow` values (including comma-separated layers) and be combined in declarations:
```css
box-shadow: var(--highlight-top), var(--shadow-lg);
```
This works because each variable is a complete shadow definition.

### Verification
- `bun run typecheck` passes with zero errors
- Grep confirms zero raw rgba/hex values inside shell class bodies (all contained in variable definitions)

### Dark Mode Ready
The `.dark` selector defines inverted dark equivalents for all tokens. When a theme toggle adds `.dark` to `<html>` or `<body>`, all shell classes will automatically adapt.

## 2026-04-29 -- Theme Provider + Pre-Paint Script

### What Changed
- Added `packages/app/app/components/theme/theme-storage.ts` for the shared theme runtime (`avileo-theme`, mode validation, system detection, DOM application, and inline script generation).
- Added `theme-provider.tsx`, `theme-toggle.tsx`, and `index.ts` under `packages/app/app/components/theme/`.
- Updated `packages/app/app/root.tsx` to inject a pre-paint theme script in `<head>`, add `suppressHydrationWarning` to `<html>`, and wrap the app tree in `ThemeProvider`.
- Updated `packages/app/app/components/layout/app-layout.tsx` to place the new keyboard-accessible toggle in the protected header control cluster.

### Key Technique
- The no-flash path is: read persisted mode from `localStorage` first, fall back to `matchMedia('(prefers-color-scheme: dark)')`, then fall back to light if detection is unavailable.
- The inline `<script>` applies both `.dark` and `data-theme` on `document.documentElement` before the visible paint, while the provider keeps the DOM synced after hydration and on system theme changes.

### UI Integration Note
- The header already had a stable right-side action area, so the safest integration was to keep that flow and insert the toggle as another small header control beside the profile sheet trigger instead of changing route layouts.

## 2026-04-29 -- Wave 2: Compound Mobile Shell/Page API

### What Changed
- Created `packages/app/app/components/mobile/mobile-shell.tsx` -- compound shell with context-driven layout
- Created `packages/app/app/components/mobile/mobile-page.tsx` -- page/card composition primitives
- Created `packages/app/app/components/mobile/mobile-fixed-footer.tsx` -- standalone fixed footer with safe-area and keyboard awareness
- Updated `packages/app/app/components/mobile/index.ts` to export all new APIs

### MobileShell Compound API
- `MobileShell.Root` accepts `variant: "public" | "protected" | "fullscreen"`
  - "protected": has bottom nav spacing, uses `app-shell` bg
  - "public": no bottom nav, uses `app-shell` bg
  - "fullscreen": full viewport, no scroll padding, no bg
- Sets CSS custom properties on root: `--shell-bottom-nav-height`, `--shell-safe-area-bottom`, `--shell-keyboard-inset`
- `MobileShell.Header`: sticky header with `shell-surface`, renders `MobileSlotHost` for header:left, header:center, header:right
- `MobileShell.Content`: scrollable main area with computed padding-bottom from shell variables (no route-level `pb-24/pb-32`)
- `MobileShell.Footer`: fixed footer using `MobileSlotHost name="footer"` for portal-based actions, positioned above bottom nav when present
- `MobileShell.BackButton`: convenience helper that portals into `header:left` with high priority

### MobilePage Compound API
- `MobilePage.Root`: content wrapper with optional `maxWidth` (sm/md/lg/xl/full)
- `MobilePage.Card`: card wrapper using semantic shell tokens (`shell-card-flat` | `shell-card-soft` | `shell-card-muted`)

### MobileFixedFooter
- Standalone component (not part of MobileShell compound)
- `aboveNav` prop: when true, positions above the 72px bottom nav area
- Uses `env(safe-area-inset-bottom)` for safe area
- Uses `env(keyboard-inset-height, 0px)` progressively for keyboard offset
- Wraps content in `shell-surface` styled container automatically via child composition

### Key Design Decisions
- Content bottom spacing is computed via CSS custom properties set on `MobileShell.Root`, not via Tailwind utility classes in routes
- Footer uses the existing portal slot system (`MobileSlot`/`MobileSlotHost`) so child components can declare footer actions declaratively
- All components use semantic tokens from globals.css (no hardcoded colors)
- All components set `displayName` for React DevTools

### Verification
- `cd packages/app && bun run typecheck` passes with zero errors
- LSP diagnostics on all three new files show zero issues

## 2026-04-29 -- Protected Shell Compatibility Bridge

### What Changed
- Updated `packages/app/app/components/layout/app-layout.tsx` to render through `MobileShell.Root`, `MobileShell.Header`, `MobileShell.Content`, and `MobileShell.Footer` instead of owning a custom header/main/footer portal stack.
- Updated `packages/app/app/components/layout/toolbar-actions.tsx` so legacy footer actions now register through `MobileSlot name="footer"` instead of `createPortal`.
- Updated `packages/app/app/routes/_protected.tsx` to wrap the protected app tree in `MobileSlotProvider` so compatibility slots always have hosts.

### Compatibility Notes
- `useSetLayout` is still the legacy route API, but it now feeds compatibility `MobileSlot` writers for `header:left`, `header:center`, and `header:right`.
- Compatibility slot writers use low priority (`-10`) so future route-level JSX slot usage can override them without breaking old screens during migration.
- Bottom navigation remains rendered by the protected shell while footer actions now flow through `MobileShell.Footer`.

### Verification
- `lsp_diagnostics` reports zero issues for `app-layout.tsx`, `toolbar-actions.tsx`, and `_protected.tsx`.
- `cd packages/app && bun run typecheck` passes.
- `cd packages/app && bun run build` passes.

## 2026-04-29 -- Mobile Keyboard + VisualViewport Hook

### What Changed
- Added `packages/app/app/hooks/use-mobile-keyboard.ts` with a lightweight `useMobileKeyboard()` hook.
- Added `enableVirtualKeyboardOverlay()` as an explicit opt-in helper instead of changing viewport behavior globally.
- Added `packages/app/app/hooks/use-mobile-keyboard.test.ts` covering unavailable APIs, viewport resize updates, CSS variable sync, and virtual keyboard feature detection.

### Key Technique
- `window.visualViewport` is the primary signal for mobile keyboard/viewport changes, while `navigator.virtualKeyboard` is treated as optional Chromium-only enhancement.
- The hook coalesces resize/scroll updates with `requestAnimationFrame` and only commits state when derived values actually change, which keeps keyboard tracking lightweight during viewport animation.
- CSS custom properties are updated from the hook (`--keyboard-height`, `--visual-viewport-height`) without enabling `virtualKeyboard.overlaysContent` by default.

### Verification
- `packages/app/app/hooks/use-mobile-keyboard.ts` and `.test.ts` both pass LSP diagnostics with zero issues.
- `cd packages/app && bun run test app/hooks/use-mobile-keyboard.test.ts --run` passes (6 tests).
- `cd packages/app && bun run typecheck` passes.
- `cd packages/app && bun run build` passes; the only console noise is unrelated existing `vite-tsconfig-paths` warnings from `tmp/` example tsconfig files.

## 2026-04-29 -- FormPage Deprecation + Mobile Core Migration

### What Changed
- File: `packages/app/app/components/layout/form-page.tsx`
  - Refactored from dual-mode component (standalone shell vs useLayout) to a single mobile-core compatibility wrapper
  - Removed standalone shell mode entirely (no more `min-h-screen app-shell` with sticky header)
  - Now always renders through parent `AppLayout` MobileShell via portal slots
  - Uses `MobileShell.BackButton` (priority=10) to override AppLayout's header:left
  - Uses `MobileSlot name="header:center"` (priority=10) to override AppLayout's title
  - Wraps content in `MobilePage.Root` with configurable `maxWidth`
  - Renders toolbar through `MobileFixedFooter aboveNav` with matching `MobilePage.Root`
  - Adds `pb-32` content padding when toolbar exists, `pb-24` when absent
  - Preserves `FormToolbar` and `FormSubmitButton` exports for backward compatibility
  - Marked `useLayout` prop as `@deprecated` -- it is now ignored

### Routes Migrated
All 11 FormPage routes now flow through the mobile core:

| Route | Changes |
|-------|---------|
| `onboarding.data` | Replaced outer `Card` with `MobilePage.Card variant="flat"` |
| `compras.nueva` | No explicit changes -- works via compatibility wrapper |
| `proveedores.nuevo` | No explicit changes -- works via compatibility wrapper |
| `cobros.nuevo` | Removed `useLayout={true}`; added `id="cobro-form"` to form; button now uses `type="submit" form="cobro-form"` |
| `proveedores.$id.edit` | No explicit changes -- works via compatibility wrapper |
| `clientes.$id.edit` | Replaced outer `Card` with `MobilePage.Card variant="flat"`; added `id="customer-form"`; button uses `type="submit" form="customer-form"` |
| `clientes.nuevo` | No explicit changes -- works via compatibility wrapper |
| `business.create` | Replaced outer `Card` with `MobilePage.Card variant="flat"`; added `id="business-create-form"`; button uses `type="submit" form="business-create-form"` |
| `productos.nuevo` | No explicit changes -- works via compatibility wrapper |
| `business.edit` | Replaced outer `Card` with `MobilePage.Card variant="flat"`; added `id="business-edit-form"`; button uses `type="submit" form="business-edit-form"` |
| `distribuciones.nueva` | Removed `useLayout={true}` |

### Key Design Decisions
- **No nested shells**: FormPage no longer renders `MobileShell.Root` because the parent `AppLayout` already provides it. This avoids double-shell issues.
- **Portal-based header override**: `MobileSlot` with priority=10 overrides AppLayout's compatibility slots (priority=-10). This is the cleanest bridge between legacy `useSetLayout` and declarative JSX.
- **Form attribute pattern**: For routes with explicit `<form>` elements, buttons in the toolbar now use `type="submit" form="form-id"` instead of duplicating `onClick={form.handleSubmit(...)}`. This is semantically correct and avoids double-submit risk.
- **Routes without explicit forms**: Kept existing `onClick` pattern to avoid breaking validation flow (e.g., `compras.nueva` where button calls raw `onSave` from context).

### Verification
- `cd packages/app && bun run typecheck` passes with zero errors
- `cd packages/app && bun run build` passes
- LSP diagnostics on all modified files show zero issues

## 2026-04-29 -- Detail/Edit/Calculator Shell Migration

### Routes Migrated
- `packages/app/app/routes/_protected.productos.$id.tsx`
- `packages/app/app/routes/_protected.compras.$id.editar._index.tsx`
- `packages/app/app/routes/_protected.compras.$id.tsx`
- `packages/app/app/routes/_protected.ventas.$id._index.tsx`
- `packages/app/app/routes/_protected.clientes.$id._index.tsx`
- `packages/app/app/routes/_protected.grupos.$id._index.tsx`
- `packages/app/app/routes/_protected.ventas.$id.editar.calculadora.tsx`
- `packages/app/app/routes/_protected.compras.nueva.($draftId).calculadora.tsx`

### What Changed
- Replaced route-local sticky headers with `MobileShell.BackButton` plus `MobileSlot name="header:center" priority={10}` on protected detail/edit pages.
- Moved customer/group/detail header actions into `header:right` slot writers so the parent protected shell owns the actual header frame.
- Replaced route-local `<main>` wrappers with `MobilePage.Root` containers for detail/edit content.
- Replaced fixed bottom action bars on purchase detail/edit screens with `MobileFixedFooter aboveNav`.
- Converted fullscreen calculator routes to nested `MobileShell.Root variant="fullscreen"` overlays with local `MobileShell.Header`/`MobileShell.Content`, which avoids slot collisions with the parent protected shell.

### Key Technique
- For protected routes that still live inside `AppLayout`, use slot writers only for header overrides; do not render another sticky shell header in the route itself.
- For nested fullscreen calculators inside `_protected`, prefer a fixed overlay shell (`className="fixed inset-0 z-[60] app-shell"`) and pass custom header children to `MobileShell.Header` instead of shared `MobileSlot` writers.

### Verification
- `lsp_diagnostics` reports zero issues for all migrated routes plus `sale-detail-header.tsx`.
- Targeted grep over the 8 migrated routes reports zero matches for `pb-24`, `pb-32`, `sticky top-0`, and `fixed bottom-`.
- `cd packages/app && bun run typecheck` passes.
- `cd packages/app && bun run build` passes.

## 2026-04-29 -- Modal/Page Slot Vocabulary Boundary

### What Changed
- Updated `packages/app/app/lib/modal/components.tsx` to make `ModalContent` the primary slot primitive name while preserving `ModalBody` as a backward-compatible alias.
- Added a shared `renderInModalPortal()` helper so modal header/footer slot rendering uses one local portal path.
- Added boundary documentation in both `packages/app/app/lib/modal/components.tsx` and `packages/app/app/lib/modal/create-modal.tsx` clarifying that modal slots are local overlay primitives, not route-shell slots.

### Key Design Decisions
- Kept the modal API source-compatible: existing consumers importing `ModalBody`, `ModalHeader`, and `ModalFooter` continue to work without edits.
- Did not connect modal slots to `MobileSlotProvider` or `MobileShell` hosts; the shared vocabulary is naming consistency only, not an architectural merge.
- Left modal spacing and border styling on semantic tokens already in use (`border-border`) and avoided introducing page-shell-specific footer behavior into overlay modals.

### Verification
- `lsp_diagnostics` reports zero issues for `lib/modal/components.tsx` and `lib/modal/create-modal.tsx`.
- `cd packages/app && bun run typecheck` passes.
- `cd packages/app && bun run build` passes; Vite still prints existing sourcemap resolution warnings for several files, but the production build completes successfully.

## 2026-04-29 -- Task 11: Migrate config/report/settings pages to mobile core

### Routes Migrated (12 total)
1. `_protected.config.tags.tsx` - Removed gradient shell, manual header, main wrapper. Uses MobileSlot for header, MobilePage.Card for cards.
2. `_protected.config.puntos-venta.tsx` - Same pattern as tags.
3. `_protected.config.notifications.tsx` - Migrated from `app-shell` + manual header to MobileSlot + MobilePage.
4. `_protected.config.security.tsx` - Migrated from `bg-gray-50` + manual header to MobileSlot + MobilePage.
5. `_protected.config.whatsapp.tsx` - Migrated gradient shell and manual header. Three cards converted to MobilePage.Card variants.
6. `_protected.config.whatsapp.templates.tsx` - Migrated large file with gradient shell. Main card + secondary cards converted.
7. `_protected.config.appearance.tsx` - Migrated shell and wired theme selector to real `useTheme` hook (previously was mock form state only).
8. `_protected.config.flags.tsx` - Removed gradient hero card, moved back button to MobileSlot header:left. Cards converted to MobilePage.Card.
9. `_protected.reportes.compras-sugeridas.tsx` - Removed `bg-gray-50` shell and sticky header.
10. `_protected.reportes.cuentas-por-cobrar.tsx` - Same pattern.
11. `_protected.reportes.alertas-stock.tsx` - Same pattern.
12. `_protected.team.tsx` - Removed `bg-gray-50` shell and sticky header. TeamMemberCard uses MobilePage.Card.
13. `_protected.invitations.tsx` - Same pattern. InvitationCard uses MobilePage.Card.
14. `_protected.profile.tsx` - Removed `useSetLayout`, added MobileSlot for title, added theme selector section using real `useTheme` hook.

### Key Patterns Applied
- All routes use `MobileSlot name="header:left" priority={10}` for back navigation
- All routes use `MobileSlot name="header:center" priority={10}` for page titles
- Routes with header actions use `MobileSlot name="header:right" priority={10}`
- Content wrapped in `MobilePage.Root maxWidth="md"` (or `lg` for wide content)
- Primary cards use `MobilePage.Card variant="flat"`
- Secondary/nested cards use `MobilePage.Card variant="soft"`
- All manual `pb-24`, `min-h-screen`, `bg-gradient-to-br`, `bg-gray-50` page shells removed
- All `sticky top-0 z-50` route-local headers removed
- All `border-0 shadow-lg` card styling replaced with MobilePage.Card

### Theme Integration
- Appearance route (`_protected.config.appearance.tsx`) now uses real `useTheme` hook; theme buttons actually change the theme
- Profile route (`_protected.profile.tsx`) added a theme selector section using the same pattern
- Theme is now reachable from both appearance settings and profile

### Verification
- `cd packages/app && bun run typecheck` passes with zero errors
- `cd packages/app && bun run build` passes successfully
- Static audit: zero `bg-gradient-to-br`, `bg-gray-50` (page-level), `sticky top-0 z-50`, `fixed bottom-`, `border-0 shadow-lg` in migrated routes

## 2026-04-29 -- Task 13: Static mobile-core audit script

### What Changed
- Added `packages/app/scripts/audit-mobile-core.ts` and package script `audit:mobile-core`
- Audit scope is an explicit migrated-route allowlist derived from the refactor waves plus `app/components/layout/form-page.tsx`
- Primitive internals are documented as intentional allowlist boundaries: `mobile-shell.tsx`, `mobile-fixed-footer.tsx`, `mobile-page.tsx`, `mobile-slots.tsx`
- Fullscreen calculator overlays are explicitly exempted from route-shell surface checks

### Rules Enforced
- No route-level `fixed bottom-` in migrated routes
- No `pb-24` / `pb-32` padding hacks in migrated routes or `FormPage`
- No `min-h-screen bg-gray-50` / `min-h-screen bg-white` legacy route shells in migrated routes
- No `border-0 shadow-lg` legacy card shells in migrated routes
- No raw `bg-white` / `bg-gray-50` / `border-stone-*` mixed into semantic shell primitives in migrated routes
- No `CardFooter` route footers in the migrated surface
- No `FormPage` standalone/default mode markers (`useLayout`, standalone shell wrappers)

### Follow-up Fixes Needed For Green Baseline
- `form-page.tsx` now computes footer clearance with CSS variables instead of `pb-24` / `pb-32`
- `_protected.distribuciones.tsx` removed leftover manual bottom padding and shell border overrides
- `_protected.productos.nuevo.tsx` replaced legacy `border-0 shadow-lg` card shell with `MobilePage.Card`
- `_protected.productos.$id.tsx` replaced `min-h-screen bg-gray-50` loading/empty wrappers with `MobilePage.Root`
- `_protected.cobros.nuevo.tsx` removed raw `bg-white` / `border-stone` shell-field overrides caught by the audit

### Verification
- `cd packages/app && bun run audit:mobile-core` passes
- `cd packages/app && bun run typecheck` passes
- `cd packages/app && bun run build` passes

## 2026-04-29 -- Task 14: Legacy layout compatibility deprecation + docs harmonization

### What Changed
- Updated compatibility deprecation guidance in:
  - `packages/app/app/components/layout/form-page.tsx`
  - `packages/app/app/components/layout/toolbar-actions.tsx`
  - `packages/app/app/components/layout/app-layout.tsx`
- `FormPage` now explicitly states it is compatibility-only and does not provide
  a standalone shell anymore.
- `ToolbarActions` and `useSetLayout` deprecation comments now point routes to
  slot composition (`MobileSlot name="footer"`, `MobileSlot name="header:*"`) and
  `MobileFixedFooter` where appropriate.
- Updated `packages/app/app/components/AGENTS.md` with a dedicated mobile-core
  guidance block:
  - `MobileShell.Root`/`MobileShell.Header`/`MobileShell.Content`/`MobileShell.Footer`
  - `MobilePage.Root` and `MobilePage.Card`
  - `MobileFixedFooter`
  - slot vocabulary and migration anti-pattern list
- Verified documented mobile primitives are exported from
  `packages/app/app/components/mobile/index.ts`:
  `MobileSlot`, `MobileSlotHost`, `MobileSlotProvider`, `useMobileSlot`,
  `MOBILE_SLOT_NAMES`, `MobileShell`, `MobilePage`, `MobileFixedFooter`.

### Verification
- `cd packages/app && bun run audit:mobile-core` passes (43 files checked)
- `cd packages/app && bun run typecheck` passes
- `lsp_diagnostics` for changed compatibility files (`form-page.tsx`,
  `toolbar-actions.tsx`, `app-layout.tsx`) reports zero diagnostics

## 2026-04-29T00:00:00Z -- MobileSlot unregisterSlot target cleanup regression

### Bug
- `MobileSlot.unregisterSlot` was deleting `currentRegistry.targets[name][id]` while removing a slot writer entry.
- When a single slot rerendered (same writer id, new children), React unmounted and re-registered the `MobileSlot` writer while the host stayed mounted.
- Since `unregisterSlot` removed the corresponding target host entry, `getTarget(name, id)` returned `null` and portal content disappeared.

### Fix
- Removed the target-delete branch from `unregisterSlot` so slot cleanup now only updates `slots`.
- Left target lifecycle exclusively to `registerTarget` / `unregisterTarget`, preserving host nodes across slot rerenders.
- Added regression coverage in `mobile-slots.test.tsx`:
  - mounts `MobileSlotHost` + `MobileSlot`
  - rerenders with different slot child node types while provider/host remain mounted
  - asserts host updates to the new content instead of empty/old content.

### Verification
- `cd packages/app && bun vitest run app/components/mobile/mobile-slots.test.tsx app/hooks/use-mobile-keyboard.test.ts`
- `cd packages/app && bun run audit:mobile-core`
- `cd packages/app && bun run typecheck`
- `cd packages/app && bunx playwright test e2e/tests/mobile-core/auth-layout.spec.ts --config=playwright.config.ts` (passed)
