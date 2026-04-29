# Mobile Core Layout Refactor

## TL;DR
> **Summary**: Replace Avileo's route-local mobile shells, fixed footers, padding hacks, and hardcoded visual tokens with a portal-backed mobile core using JSX compound APIs, semantic theme tokens, and complete light/dark/system theme support. Migrate auth, protected forms, list/FAB pages, detail/edit pages, config/report pages, and relevant modal/page slot utilities in one bounded wave-based refactor.
> **Deliverables**:
> - Portal slot infrastructure and compound `MobileShell`/`MobilePage` APIs
> - Reusable `MobileFixedFooter` component with safe-area + keyboard-aware behavior
> - Complete theme provider, persisted light/dark/system mode, and theme toggle
> - Semantic token layer replacing route-level hardcoded visual tokens
> - Migration of auth, `FormPage`, protected route groups, manual fixed actions, and old page shells
> - Static audits + Playwright mobile QA for keyboard, footer, bottom nav, slot cleanup, and theme behavior
> **Effort**: XL
> **Parallel**: YES - 6 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Tasks 4-12 → Task 13 → Final Verification

## Context

### Original Request
- Refactor all screens into a scalable mobile core.
- Use wrappers, but not prop-heavy layout APIs; API must be JSX/compound-component based.
- Use React portals and utilities to insert layout nodes cleanly.
- Make fixed footer a component.
- Footer must stay visible on mobile while preserving access to inputs and keyboard usability.
- Research/consider Chrome keyboard APIs.
- Add complete dark mode with toggle.
- Avoid hardcoded tokens so future design-system changes are possible.
- Include auth pages as a public variant and migrate all route groups in one plan.

### Interview Summary
- Dark mode decision: full toggle + system/manual preference.
- Auth decision: include `login` and `register` from the first migration as public/auth variants of the same core.
- Migration decision: one aggressive plan covering core and all relevant routes in waves.
- Keyboard decision: browser-managed behavior first; use `VisualViewport` and CSS env vars progressively; do not globally force `navigator.virtualKeyboard.overlaysContent = true` unless a local utility explicitly opts in and has fallback.

### Research Findings
- Current protected shell: `packages/app/app/routes/_protected.tsx:60-63` wraps protected routes in `AppLayout`.
- `AppLayout` owns layout config, shared header, scroll area, toolbar portal host, and bottom nav: `packages/app/app/components/layout/app-layout.tsx:43-55`, `:67-94`, `:130-159`, `:235-277`.
- Existing page action portal: `packages/app/app/components/layout/toolbar-actions.tsx:11-30`.
- Competing wrapper: `packages/app/app/components/layout/form-page.tsx:27-78`; default mode recreates app shell/header/main/toolbar.
- `FormPage` is used by 11 routes; only `_protected.cobros.nuevo.tsx` and `_protected.distribuciones.nueva._index.tsx` already use layout mode.
- Auth hardcoded shells: `packages/app/app/routes/login.tsx:87-181`, `packages/app/app/routes/register.tsx:116-226`.
- Modal compound/portal precedent: `packages/app/app/lib/modal/components.tsx`, `packages/app/app/lib/modal/create-modal.tsx`.
- Repeated anti-patterns include `fixed bottom-*`, manual `pb-24/pb-32`, route-level `bg-gradient-to-br`, `bg-gray-50`, `border-0 shadow-lg`, `bg-white`, `orange-*`, `stone-*`.
- Testing: `packages/app/playwright.config.ts` has mobile Chrome Pixel 5; gap is no automated keyboard/fixed-footer/bottom-nav verification.
- Browser docs: React portals preserve React-tree context/event bubbling; VirtualKeyboard API is Chromium-only/experimental; `VisualViewport`, `safe-area`, `keyboard-inset-*`, and browser-managed resizing are safer defaults.

### Metis Review (gaps addressed)
- Added wrapper taxonomy, slot conflict rules, portal cleanup, theme flash, system/manual theme precedence, keyboard fallbacks, and route migration boundaries.
- Added guardrail separating route-shell migration from leaf component redesign.
- Added static audits for forbidden fixed positioning, padding hacks, and raw color tokens.
- Added mobile QA scenarios for auth, protected footer, long form keyboard, route transition slot cleanup, theme persistence, and system mode.

## Work Objectives

### Core Objective
Create a single mobile-first layout core that all app routes can use through JSX compound components and portal-backed slots, while introducing complete semantic theming and eliminating route-local layout/style hacks.

### Deliverables
- `packages/app/app/components/mobile/mobile-shell.tsx` — core shell/provider + compound API.
- `packages/app/app/components/mobile/mobile-slots.tsx` — portal host, slot registration, cleanup utilities.
- `packages/app/app/components/mobile/mobile-fixed-footer.tsx` — reusable fixed footer.
- `packages/app/app/components/mobile/mobile-page.tsx` — page/card/content composition primitives.
- `packages/app/app/hooks/use-mobile-keyboard.ts` — `VisualViewport` + optional VirtualKeyboard support.
- `packages/app/app/components/theme/theme-provider.tsx` and `theme-toggle.tsx` — persisted theme support.
- `packages/app/app/styles/globals.css` semantic shell/theme tokens.
- Migration of `AppLayout`, `ToolbarActions`, `FormPage`, auth routes, protected forms, list/FAB routes, detail/edit routes, config/report routes.
- New/updated Playwright mobile tests and static audit scripts or commands.

### Definition of Done (verifiable conditions with commands)
- `cd packages/app && bun run typecheck` passes.
- `cd packages/app && bun test` passes.
- `cd packages/app && bun run test:e2e` passes or existing external dependency failures are documented with evidence.
- Static audit returns no forbidden route-level layout anti-patterns in migrated files:
  - no ad-hoc `fixed bottom-` route footers/FABs outside approved mobile primitives
  - no manual `pb-24`/`pb-32` compensation in migrated routes
  - no route-level `bg-gradient-to-br`, `bg-gray-50`, `bg-white`, `border-0 shadow-lg` for page shells/cards
  - no raw route-level `orange-*`, `stone-*`, `slate-*`, `gray-*` shell tokens where semantic tokens exist
- Playwright evidence exists under `.sisyphus/evidence/` for light/dark auth, protected fixed footer, long form keyboard, route slot cleanup, and persisted/system theme behavior.

### Must Have
- JSX compound API, not prop-heavy wrappers.
- Stable portal hosts owned by shell providers.
- Slot cleanup on unmount and route transition.
- Single-writer vs multi-writer slot rules.
- `MobileFixedFooter` independent of forms and reusable across auth/protected flows.
- Public/auth and protected variants of the same core.
- Full dark mode: `system`, `light`, `dark`, persisted preference, no hydration/initial flash regressions.
- Semantic tokens that support future system-design changes.
- Keyboard/safe-area behavior that degrades gracefully outside Chromium.

### Must NOT Have
- No new hardcoded route-local backgrounds, gradients, card colors, or brand colors.
- No duplicated shell systems (`AppLayout` + new shell + `FormPage` default mode) left without sunset rules.
- No global `navigator.virtualKeyboard.overlaysContent = true` default.
- No route-specific fixed footers/FABs outside the approved portal/footer primitives.
- No business logic, data model, API, validation, sync, or copy rewrites unless required to preserve current behavior during layout migration.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after + targeted Playwright additions; no TDD requirement for every visual migration, but each task must include executable static + browser QA.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{png|txt|json|webm}`.
- Required commands:
  - `cd packages/app && bun run typecheck`
  - `cd packages/app && bun test`
  - `cd packages/app && bun run test:e2e`
  - static audit commands documented in Task 13.

## Execution Strategy

### Parallel Execution Waves
Wave 1: Core contracts and tokens — Tasks 1-3.
Wave 2: Core shell integration and public/protected variants — Tasks 4-6.
Wave 3: Route migration foundations — Tasks 7-9.
Wave 4: Broad route migration — Tasks 10-12.
Wave 5: Static audits and automated QA — Tasks 13-14.
Wave 6: Cleanup/deprecation and final verification — Task 15 + Final Verification.

### Dependency Matrix (full, all tasks)
- T1 blocks T2, T3, T4, T5, T6.
- T2 blocks T4, T5, T6, T8, T9, T10, T11, T12.
- T3 blocks T6, T7, T8, T9, T10, T11, T12.
- T4 blocks T7-T12.
- T5 blocks T8-T12.
- T6 blocks T7-T12.
- T7 blocks T9.
- T8 blocks T10-T12.
- T9 blocks T10-T12.
- T10, T11, T12 block T13 and T14.
- T13 and T14 block T15.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1: 3 tasks → `visual-engineering`, `deep`, `quick`.
- Wave 2: 3 tasks → `visual-engineering`, `deep`.
- Wave 3: 3 tasks → `visual-engineering`.
- Wave 4: 3 tasks → `visual-engineering`, `deep`.
- Wave 5: 2 tasks → `deep`, `visual-engineering`.
- Wave 6: 1 task → `quick`.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Define semantic mobile/theme token layer

  **What to do**: In `packages/app/app/styles/globals.css`, add semantic CSS variables/classes for app background, page surface, card surface, footer surface, border, muted blocks, primary action, danger action, focus ring, bottom-nav, and shadow tokens for both `:root` and `.dark`. Replace current shell helper internals (`app-shell`, `shell-surface`, `shell-card-flat`, etc.) to reference variables instead of raw color values. Preserve existing class names as compatibility aliases during migration.
  **Must NOT do**: Do not rename existing shell classes yet. Do not rewrite leaf components unrelated to page shell usage.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: design-token and CSS architecture work with visual impact.
  - Skills: [`frontend`] - React/Tailwind/shadcn conventions.
  - Omitted: [`avileo-sync`] - No sync changes.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3,4,6,7,8,9,10,11,12 | Blocked By: none

  **References**:
  - Pattern: `packages/app/app/styles/globals.css:80-139` - current shell classes to convert to semantic variables.
  - Pattern: `AGENTS.md` - UI rules: orange primary and shell tokens.
  - Pattern: `packages/app/app/root.tsx:40-65` - root HTML/body where theme class/data attribute must apply.

  **Acceptance Criteria**:
  - [ ] `cd packages/app && bun run typecheck` passes.
  - [ ] CSS contains semantic variables for light and dark modes.
  - [ ] Existing shell class names still exist and compile.
  - [ ] Static check confirms no raw hex/rgb values remain inside shell helper class bodies except inside CSS variable definitions.

  **QA Scenarios**:
  ```
  Scenario: Shell tokens render in light and dark
    Tool: Bash
    Steps: Run `cd packages/app && bun run typecheck`; inspect compiled app via Playwright on `/login` after theme task exists.
    Expected: No type errors; shell classes resolve without missing styles.
    Evidence: .sisyphus/evidence/task-1-theme-tokens.txt

  Scenario: Token fallback does not break old classes
    Tool: Bash
    Steps: Search for `.app-shell`, `.shell-surface`, `.shell-card-flat`, `.shell-field` in globals.css.
    Expected: All compatibility classes remain present.
    Evidence: .sisyphus/evidence/task-1-token-compat.txt
  ```

  **Commit**: YES | Message: `feat(ui): add semantic mobile theme tokens` | Files: [`packages/app/app/styles/globals.css`]

- [x] 2. Build portal slot infrastructure and utilities

  **What to do**: Create `packages/app/app/components/mobile/mobile-slots.tsx` with `MobileSlotProvider`, `MobileSlotHost`, `MobileSlot`, `useMobileSlot`, and utilities for register/unregister. Slots: `header:left`, `header:center`, `header:right`, `footer`, `floating`, `bottom-nav`, `modal-header`, `modal-footer`. Define single-writer slots for header/footer; multi-writer stack only for floating actions. On unmount or route change, stale slot content must unregister. Use stable portal hosts and `createPortal`; ensure context stays in React tree.
  **Must NOT do**: Do not use imperative DOM mutation. Do not allow silent multiple footer writers; warn in DEV and last writer wins only for explicitly single-writer slots.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: cross-cutting architecture with lifecycle rules.
  - Skills: [`frontend`] - compound components and React context patterns.
  - Omitted: [`fullstack-backend`] - frontend-only.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,5,6,8,9,10,11,12 | Blocked By: none

  **References**:
  - Pattern: `packages/app/app/components/layout/toolbar-actions.tsx:11-30` - current portal host usage.
  - Pattern: `packages/app/app/lib/modal/components.tsx` - existing modal slot mental model.
  - External: `https://react.dev/reference/react-dom/createPortal` - portal behavior and event bubbling.

  **Acceptance Criteria**:
  - [ ] `cd packages/app && bun run typecheck` passes.
  - [ ] Slot provider/host APIs are exported from a mobile component index.
  - [ ] Unit or component test validates stale footer content is removed after unmount.
  - [ ] DEV warning exists for conflicting single-writer slots.

  **QA Scenarios**:
  ```
  Scenario: Footer slot registers and unregisters
    Tool: Bash
    Steps: Run targeted Vitest test for mobile slot provider cleanup.
    Expected: Footer content appears while mounted and is absent after unmount.
    Evidence: .sisyphus/evidence/task-2-slot-cleanup.txt

  Scenario: Conflict rule is enforced
    Tool: Bash
    Steps: Run targeted Vitest test mounting two footer slots.
    Expected: DEV warning is emitted and only one footer payload renders by deterministic rule.
    Evidence: .sisyphus/evidence/task-2-slot-conflict.txt
  ```

  **Commit**: YES | Message: `feat(ui): add mobile portal slot system` | Files: [`packages/app/app/components/mobile/mobile-slots.tsx`, `packages/app/app/components/mobile/index.ts`]

- [x] 3. Implement complete theme provider and toggle

  **What to do**: Add `packages/app/app/components/theme/theme-provider.tsx`, `theme-toggle.tsx`, and theme storage helpers. Mode values: `system`, `light`, `dark`. Precedence: persisted choice → system preference → light fallback. Apply `.dark` and `data-theme` before visible paint using an inline script in `root.tsx` or a hydration-safe effect strategy. Theme toggle must be available in protected app header/settings and public/auth layout through a compound slot/control.
  **Must NOT do**: Do not depend on server theme state. Do not add a backend preference in this refactor. Do not use raw Tailwind color overrides for dark mode in routes.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: hydration, persistence, and global UI behavior.
  - Skills: [`frontend`] - React provider and UI component patterns.
  - Omitted: [`fullstack-auth-better`] - no auth data persistence required.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 6,7,8,9,10,11,12,14 | Blocked By: 1

  **References**:
  - Pattern: `packages/app/app/root.tsx:40-65` - HTML root and body for pre-paint theme application.
  - Pattern: `packages/app/app/components/layout/app-layout.tsx:130-159` - protected header area for theme toggle placement.
  - API/Type: localStorage usage pattern in `packages/app/app/root.tsx:72-91`.

  **Acceptance Criteria**:
  - [ ] `system`, `light`, `dark` modes work and persist in localStorage.
  - [ ] First paint does not flash incorrect theme in Playwright reload test.
  - [ ] Theme toggle is keyboard accessible and has `aria-label`.
  - [ ] `cd packages/app && bun run typecheck` passes.

  **QA Scenarios**:
  ```
  Scenario: Manual dark mode persists
    Tool: Playwright
    Steps: Open `/login`, set theme to dark, reload page.
    Expected: `document.documentElement` has `.dark` or `data-theme="dark"` before screenshot; dark tokens visible.
    Evidence: .sisyphus/evidence/task-3-dark-persist.png

  Scenario: System mode follows media query
    Tool: Playwright
    Steps: Emulate dark color scheme, set theme mode to system, reload.
    Expected: effective theme is dark; switching emulation to light updates or reloads to light.
    Evidence: .sisyphus/evidence/task-3-system-theme.json
  ```

  **Commit**: YES | Message: `feat(ui): add persisted theme modes` | Files: [`packages/app/app/components/theme/*`, `packages/app/app/root.tsx`]

- [x] 4. Create compound mobile shell/page API

  **What to do**: Create `packages/app/app/components/mobile/mobile-shell.tsx`, `mobile-page.tsx`, and `mobile-fixed-footer.tsx`. API must be JSX compound components, e.g. `<MobileShell.Root variant="protected|public">`, `<MobileShell.Header>`, `<MobileShell.Content>`, `<MobileShell.Footer>`, `<MobilePage.Root>`, `<MobilePage.Card>`, `<MobileFixedFooter>`. Props allowed only for semantic variants (`public`, `protected`, `fullscreen`) and accessibility identifiers; no prop-heavy layout assembly. Footer must use portal slot internally and CSS `env(safe-area-inset-bottom)` plus progressive keyboard offsets.
  **Must NOT do**: Do not require route files to pass title/footer/header as props. Do not hardcode colors in component classes.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: foundational UI architecture and mobile layout.
  - Skills: [`frontend`] - React compound components.
  - Omitted: [`qamanual`] - execution includes automated QA later.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 7,8,9,10,11,12 | Blocked By: 1,2,3

  **References**:
  - Pattern: `packages/app/app/components/layout/app-layout.tsx:235-277` - current scroll/footer/bottom-nav behavior.
  - Pattern: `packages/app/app/components/layout/form-page.tsx:53-77` - standalone form shell behavior to absorb and deprecate.
  - External: `https://developer.mozilla.org/en-US/docs/Web/CSS/env` - safe-area and keyboard env vars.

  **Acceptance Criteria**:
  - [ ] Compound API is exported from `components/mobile`.
  - [ ] `MobileFixedFooter` supports content above bottom nav and public pages without bottom nav.
  - [ ] Content receives bottom spacing through shell variables/classes, not route-level `pb-24/pb-32`.
  - [ ] `cd packages/app && bun run typecheck` passes.

  **QA Scenarios**:
  ```
  Scenario: Public footer does not overlap content
    Tool: Playwright
    Steps: Render `/login` after migration or a test harness route with long content and footer.
    Expected: Last input can scroll above footer; footer remains visible.
    Evidence: .sisyphus/evidence/task-4-public-footer.png

  Scenario: Protected footer sits above bottom nav
    Tool: Playwright
    Steps: Render a protected test route with bottom nav and footer slot.
    Expected: Footer bottom is above nav top; no overlap.
    Evidence: .sisyphus/evidence/task-4-protected-footer.png
  ```

  **Commit**: YES | Message: `feat(ui): add compound mobile shell primitives` | Files: [`packages/app/app/components/mobile/*`]

- [x] 5. Add mobile keyboard and viewport utility

  **What to do**: Add `packages/app/app/hooks/use-mobile-keyboard.ts` and optional CSS vars updated from `visualViewport`. Expose `isKeyboardLikelyVisible`, `keyboardHeight`, `visualViewportHeight`, and `supportsVirtualKeyboard`. Default mode must not set `navigator.virtualKeyboard.overlaysContent = true`. Add explicit `enableVirtualKeyboardOverlay()` helper for future opt-in only, with feature detection. `MobileFixedFooter` consumes CSS variables and safe fallbacks.
  **Must NOT do**: Do not globally change viewport behavior. Do not make Safari/Firefox depend on Chromium-only APIs.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: browser compatibility and edge-case behavior.
  - Skills: [`frontend`] - hook architecture.
  - Omitted: [`playwright-skill`] - testing handled in later tasks.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8,9,10,11,12,14 | Blocked By: 2,4

  **References**:
  - External: `https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport` - broader viewport signal.
  - External: `https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API` - Chromium-only progressive enhancement.
  - External: `https://developer.chrome.com/docs/web-platform/virtual-keyboard/` - overlaysContent caveats.

  **Acceptance Criteria**:
  - [ ] Hook compiles without DOM type errors.
  - [ ] Hook works when `visualViewport` is missing.
  - [ ] VirtualKeyboard helper is not invoked globally.
  - [ ] Tests validate fallback state when APIs are unavailable.

  **QA Scenarios**:
  ```
  Scenario: API unavailable fallback
    Tool: Bash
    Steps: Run unit test with mocked missing `visualViewport` and missing `virtualKeyboard`.
    Expected: Hook returns safe defaults and no throw.
    Evidence: .sisyphus/evidence/task-5-keyboard-fallback.txt

  Scenario: Keyboard height updates
    Tool: Bash
    Steps: Run unit test dispatching mocked `visualViewport.resize`.
    Expected: Hook updates height/visibility state deterministically.
    Evidence: .sisyphus/evidence/task-5-keyboard-resize.txt
  ```

  **Commit**: YES | Message: `feat(ui): add mobile keyboard viewport utility` | Files: [`packages/app/app/hooks/use-mobile-keyboard.ts`, relevant tests]

- [x] 6. Integrate mobile core into root and protected shell

  **What to do**: Wrap app in `ThemeProvider` and protected layout in mobile slot provider/shell. Refactor `AppLayout` to become a compatibility adapter over `MobileShell.Root variant="protected"`, preserving `useSetLayout` temporarily while introducing JSX slot usage. Bottom nav remains owned by protected shell. `ToolbarActions` becomes a compatibility wrapper around `MobileShell.Footer` or `MobileSlot name="footer"`.
  **Must NOT do**: Do not break existing routes that still call `useSetLayout` or `ToolbarActions`. Do not remove `FormPage` yet.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: integration touches root protected shell.
  - Skills: [`frontend`] - routing/layout patterns.
  - Omitted: [`fullstack-infrastructure`] - no package/setup changes.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 7,8,9,10,11,12 | Blocked By: 2,3,4

  **References**:
  - Pattern: `packages/app/app/routes/_protected.tsx:60-63` - protected shell entry.
  - Pattern: `packages/app/app/components/layout/app-layout.tsx:43-94` - current context API to preserve temporarily.
  - Pattern: `packages/app/app/components/layout/toolbar-actions.tsx:11-30` - compatibility target.

  **Acceptance Criteria**:
  - [ ] Existing protected routes render without missing portal hosts.
  - [ ] Existing `ToolbarActions` consumers still work.
  - [ ] `useSetLayout` still works but is marked compatibility/deprecated in comments.
  - [ ] `cd packages/app && bun run typecheck` passes.

  **QA Scenarios**:
  ```
  Scenario: Protected route shell compatibility
    Tool: Playwright
    Steps: Log in and visit `/dashboard` and `/clientes`.
    Expected: Header and bottom nav render once; no duplicate headers.
    Evidence: .sisyphus/evidence/task-6-protected-shell.png

  Scenario: ToolbarActions compatibility
    Tool: Playwright
    Steps: Visit an existing route using toolbar actions.
    Expected: Footer action appears in the new footer slot and clears on navigation.
    Evidence: .sisyphus/evidence/task-6-toolbar-compat.webm
  ```

  **Commit**: YES | Message: `refactor(ui): route app layout through mobile shell` | Files: [`packages/app/app/root.tsx`, `packages/app/app/components/layout/app-layout.tsx`, `packages/app/app/components/layout/toolbar-actions.tsx`]

- [x] 7. Migrate auth pages to public mobile core

  **What to do**: Refactor `packages/app/app/routes/login.tsx` and `packages/app/app/routes/register.tsx` to use `MobileShell.Root variant="public"`, `MobilePage`, and `MobileFixedFooter`. Move submit CTAs and auth links to footer slot using `form` attribute where needed. Keep health drawer behavior and invitation alert behavior unchanged. Add theme toggle access in public shell/header or footer. Remove hardcoded `bg-white`, `orange-*`, `stone-*`, `CardFooter` layout from auth shells.
  **Must NOT do**: Do not change auth redirects, validation schemas, or health repair behavior.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: mobile auth UI/layout migration.
  - Skills: [`frontend`] - forms and JSX APIs.
  - Omitted: [`fullstack-auth-better`] - auth logic unchanged.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 13,14 | Blocked By: 3,4,5,6

  **References**:
  - Pattern: `packages/app/app/routes/login.tsx:87-181` - existing auth shell to migrate.
  - Pattern: `packages/app/app/routes/register.tsx:116-226` - existing register shell to migrate.
  - Pattern: `packages/app/app/components/forms/form-input.tsx:81-91` - keep form wrapper usage.
  - Pattern: `packages/app/app/components/forms/form-password.tsx:51-86` - keep password wrapper behavior.

  **Acceptance Criteria**:
  - [ ] `/login` and `/register` share the same public mobile core layout.
  - [ ] Primary CTA remains visible in mobile footer.
  - [ ] Last input can scroll above footer on Pixel 5 viewport.
  - [ ] Existing register test IDs remain (`register-submit`, `register-error`, `input-*`).
  - [ ] `cd packages/app && bun run typecheck` passes.

  **QA Scenarios**:
  ```
  Scenario: Register long form with footer
    Tool: Playwright
    Steps: Open `/register` on Pixel 5, focus confirm password, type text.
    Expected: `Crear cuenta` footer remains visible; focused input is not obscured.
    Evidence: .sisyphus/evidence/task-7-register-keyboard.png

  Scenario: Auth dark mode
    Tool: Playwright
    Steps: Open `/login`, switch to dark mode, navigate to `/register`.
    Expected: Both pages use dark semantic tokens and no light hardcoded card/background remains.
    Evidence: .sisyphus/evidence/task-7-auth-dark.png
  ```

  **Commit**: YES | Message: `refactor(auth): use public mobile shell` | Files: [`packages/app/app/routes/login.tsx`, `packages/app/app/routes/register.tsx`]

- [x] 8. Deprecate FormPage default mode and migrate form routes

  **What to do**: Refactor `FormPage` into a compatibility wrapper around `MobilePage`/`MobileFixedFooter`, or replace route usage directly with compound APIs. Migrate all 11 `FormPage` routes: `_protected.onboarding.data.tsx`, `_protected.compras.nueva.($draftId)._index.tsx`, `_protected.proveedores.nuevo.tsx`, `_protected.cobros.nuevo.tsx`, `_protected.proveedores.$id.edit.tsx`, `_protected.clientes.$id.edit.tsx`, `_protected.clientes.nuevo.tsx`, `_protected.business.create.tsx`, `_protected.productos.nuevo.tsx`, `_protected.business.edit.tsx`, `_protected.distribuciones.nueva._index.tsx`. Ensure all submit buttons live in `MobileFixedFooter` and no route uses standalone app shell mode.
  **Must NOT do**: Do not keep `FormPage` default mode as a second shell. Do not change form schemas, mutations, or navigation outcomes.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: large UI form migration.
  - Skills: [`frontend`] - FormProvider and form wrappers.
  - Omitted: [`avileo-sync`] - no sync logic changes.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 13,14 | Blocked By: 4,5,6

  **References**:
  - Pattern: `packages/app/app/components/layout/form-page.tsx:27-78` - wrapper to absorb/deprecate.
  - Pattern: `packages/app/app/routes/_protected.clientes.nuevo.tsx:50-77` - simple form route.
  - Pattern: `packages/app/app/routes/_protected.productos.nuevo.tsx:52-115` - form + extra card route.
  - Pattern: `packages/app/app/routes/_protected.business.create.tsx:65-171` - standalone form shell to standardize.

  **Acceptance Criteria**:
  - [ ] No migrated route calls `FormPage` in standalone/default shell mode.
  - [ ] All migrated form submit CTAs render through mobile footer slot.
  - [ ] No duplicate headers or missing back buttons on migrated routes.
  - [ ] Static audit finds no `pb-32` in these route files.

  **QA Scenarios**:
  ```
  Scenario: New customer form footer
    Tool: Playwright
    Steps: Visit `/clientes/nuevo`, fill required name, focus last field.
    Expected: Save button remains visible above bottom nav/footer area; form submits to `/clientes`.
    Evidence: .sisyphus/evidence/task-8-new-customer-footer.png

  Scenario: Product form slot cleanup
    Tool: Playwright
    Steps: Visit `/productos/nuevo`, then navigate to `/productos`.
    Expected: Product save footer is removed; list page shows only its own actions.
    Evidence: .sisyphus/evidence/task-8-product-slot-cleanup.webm
  ```

  **Commit**: YES | Message: `refactor(forms): migrate FormPage routes to mobile core` | Files: [`packages/app/app/components/layout/form-page.tsx`, listed route files]

- [x] 9. Migrate list/index routes and floating actions

  **What to do**: Replace route-local floating action buttons and manual bottom offsets with `MobileShell.FloatingAction` or `MobileSlot name="floating"` in list/index routes. Candidates: `_protected.clientes._index.tsx`, `_protected.ventas._index.tsx`, `_protected.distribuciones.tsx`, `_protected.visitas.tsx`, `_protected.productos._index.tsx`, `_protected.compras._index.tsx`, `_protected.proveedores._index.tsx`, `_protected.config.tags.tsx`, `_protected.config.puntos-venta.tsx`. Remove `fixed bottom-28/right-4` and inconsistent `bottom-20` usage.
  **Must NOT do**: Do not change list filters, data loading, or navigation destinations.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: route UI consistency and floating action placement.
  - Skills: [`frontend`] - route component migration.
  - Omitted: [`fullstack-backend`] - no data changes.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 13,14 | Blocked By: 4,6

  **References**:
  - Pattern: `packages/app/app/components/layout/app-layout.tsx:241-277` - bottom nav and current portal host.
  - Pattern: `_protected.clientes._index.tsx:255-263` - representative route-local fixed FAB.
  - Pattern: `_protected.proveedores._index.tsx:113-123` - inconsistent bottom offset.

  **Acceptance Criteria**:
  - [ ] Static audit finds no `fixed bottom-` in migrated list route files.
  - [ ] Floating actions render above bottom nav and do not overlap footer slots.
  - [ ] Route navigation from each floating action remains unchanged.

  **QA Scenarios**:
  ```
  Scenario: Customer list floating action
    Tool: Playwright
    Steps: Visit `/clientes`, assert floating action visible, click it.
    Expected: Navigates to `/clientes/nuevo`; action does not overlap bottom nav.
    Evidence: .sisyphus/evidence/task-9-customers-fab.png

  Scenario: Floating action slot cleanup
    Tool: Playwright
    Steps: Visit `/productos`, then `/dashboard`.
    Expected: Product floating action disappears on dashboard.
    Evidence: .sisyphus/evidence/task-9-floating-cleanup.webm
  ```

  **Commit**: YES | Message: `refactor(routes): standardize floating actions` | Files: [listed route files]

- [x] 10. Migrate detail/edit/manual shell routes

  **What to do**: Replace route-local sticky headers, manual `<main>` padding, and fixed bottom action bars in detail/edit/calculator routes with mobile shell slots and content primitives. Candidates: `_protected.productos.$id.tsx`, `_protected.compras.$id.editar._index.tsx`, `_protected.compras.$id.tsx`, `_protected.ventas.$id._index.tsx`, `_protected.clientes.$id._index.tsx`, `_protected.grupos.$id._index.tsx`, `_protected.ventas.$id.editar.calculadora.tsx`, `_protected.compras.nueva.($draftId).calculadora.tsx`. Preserve fullscreen calculator intent using `MobileShell.Root variant="fullscreen"` only where needed.
  **Must NOT do**: Do not change calculator math, purchase/sale mutations, or route params.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: route-specific manual shell migration with behavior risk.
  - Skills: [`frontend`] - complex route UI.
  - Omitted: [`avileo-sync`] - no sync changes.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 13,14 | Blocked By: 4,6,8

  **References**:
  - Pattern: `_protected.productos.$id.tsx:226-259` - route-local sticky/header style.
  - Pattern: `_protected.compras.$id.editar._index.tsx:35-59` and `:157` - manual header/main/fixed footer.
  - Pattern: `_protected.ventas.$id.editar.calculadora.tsx:20-21` - fullscreen calculator shell.

  **Acceptance Criteria**:
  - [ ] No duplicate route-local sticky shell headers remain in migrated detail/edit routes.
  - [ ] Fullscreen routes explicitly use fullscreen variant and still preserve required scroll behavior.
  - [ ] Static audit finds no manual `pb-24/pb-32` in migrated routes unless explicitly approved in primitive internals.

  **QA Scenarios**:
  ```
  Scenario: Purchase edit footer
    Tool: Playwright
    Steps: Open a seeded purchase edit route, scroll to bottom, inspect footer.
    Expected: Footer action is fixed through mobile core and content remains accessible.
    Evidence: .sisyphus/evidence/task-10-purchase-edit-footer.png

  Scenario: Calculator fullscreen
    Tool: Playwright
    Steps: Open sale calculator route on Pixel 5.
    Expected: Fullscreen content renders without protected header duplication and required actions remain accessible.
    Evidence: .sisyphus/evidence/task-10-calculator-fullscreen.png
  ```

  **Commit**: YES | Message: `refactor(routes): migrate detail shells to mobile core` | Files: [listed route files]

- [x] 11. Migrate config/report/settings pages and token hardcodes

  **What to do**: Standardize config/report/admin pages to the mobile core and semantic tokens. Candidates: `_protected.config.tags.tsx`, `_protected.config.puntos-venta.tsx`, `_protected.config.notifications.tsx`, `_protected.config.security.tsx`, `_protected.config.whatsapp.tsx`, `_protected.config.whatsapp.templates.tsx`, `_protected.config.appearance.tsx`, `_protected.config.flags.tsx`, `_protected.reportes.*`, `_protected.team.tsx`, `_protected.invitations.tsx`, `_protected.profile.tsx`. Add theme toggle/config UI to appearance/profile/settings route as appropriate.
  **Must NOT do**: Do not redesign settings workflows; only migrate shell/actions/tokens and add theme setting UI.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: broad visual/token standardization.
  - Skills: [`frontend`] - UI components and forms.
  - Omitted: [`fullstack-auth-better`] - no permissions changes.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 13,14 | Blocked By: 3,4,6

  **References**:
  - Pattern: `_protected.config.tags.tsx:65-83` - old gradient shell pattern.
  - Pattern: `_protected.config.notifications.tsx:64-78` - config form shell.
  - Pattern: `_protected.config.appearance.tsx` - likely placement for theme controls.

  **Acceptance Criteria**:
  - [ ] Config/report pages use semantic page/surface/action tokens.
  - [ ] Theme setting is reachable from protected UI.
  - [ ] Static audit finds no old route shell gradients in migrated config/report routes.

  **QA Scenarios**:
  ```
  Scenario: Appearance theme control
    Tool: Playwright
    Steps: Visit appearance/settings route, switch theme modes.
    Expected: Theme mode persists and applies across navigation.
    Evidence: .sisyphus/evidence/task-11-appearance-theme.png

  Scenario: Report page dark mode
    Tool: Playwright
    Steps: Set dark mode and visit one report route.
    Expected: Page shell/cards use semantic dark tokens; no light hardcoded surfaces.
    Evidence: .sisyphus/evidence/task-11-report-dark.png
  ```

  **Commit**: YES | Message: `refactor(settings): standardize mobile shell and theme tokens` | Files: [listed route files]

- [x] 12. Unify modal/page portal vocabulary

  **What to do**: Align modal compound components with the new slot vocabulary without breaking existing modal API. Update `lib/modal/components.tsx` and `create-modal.tsx` only if needed to share naming/utilities (`Header`, `Content`, `Footer`, slot cleanup concepts). Document that modal slots are sibling primitives, not page shell slots, unless rendered inside the same provider intentionally.
  **Must NOT do**: Do not rewrite modal behavior or all modal consumers. Do not make modal slots depend on protected page shell hosts.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: portal system convergence with modal risk.
  - Skills: [`frontend`] - portal and compound component patterns.
  - Omitted: [`qamanual`] - QA automated later.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 13,14 | Blocked By: 2,4

  **References**:
  - Pattern: `packages/app/app/lib/modal/components.tsx:35-96` - current modal compound slots.
  - Pattern: `packages/app/app/lib/modal/create-modal.tsx:71-129` - current modal composition.
  - Pattern: `packages/app/app/components/products/variant-modal.tsx:1-50` - consumer example.

  **Acceptance Criteria**:
  - [ ] Modal APIs still compile and existing consumers render.
  - [ ] Page slots and modal slots have documented separation/shared utility usage.
  - [ ] No modal footer/header content leaks into page shell slots.

  **QA Scenarios**:
  ```
  Scenario: Modal footer unaffected by page footer
    Tool: Playwright
    Steps: Open a modal with footer while page has a fixed footer.
    Expected: Modal footer renders inside modal; page footer remains behind/disabled according to existing modal behavior.
    Evidence: .sisyphus/evidence/task-12-modal-footer.png

  Scenario: Modal close cleans portal content
    Tool: Playwright
    Steps: Open and close modal.
    Expected: Modal header/footer nodes are removed from DOM.
    Evidence: .sisyphus/evidence/task-12-modal-cleanup.webm
  ```

  **Commit**: YES | Message: `refactor(ui): align modal slot vocabulary` | Files: [`packages/app/app/lib/modal/*`, selected consumers if needed]

- [x] 13. Add static audit for mobile core compliance

  **What to do**: Add a script or documented command set under `packages/app` (preferred: `scripts/audit-mobile-core.ts` or package script) that fails on forbidden patterns in migrated route files: ad-hoc `fixed bottom-`, manual `pb-24`/`pb-32`, old route shell gradients, raw shell colors, direct `CardFooter` layout usage in auth/form route footers, and `FormPage` standalone/default mode. Allowlist primitive internals and intentional fullscreen exceptions.
  **Must NOT do**: Do not fail on legitimate leaf component color usage until corresponding semantic tokens exist. Keep initial audit focused on route shell/layout tokens.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: cross-file compliance tooling.
  - Skills: [] - no special skill needed.
  - Omitted: [`frontend`] - mostly script/static audit.

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: 15 | Blocked By: 7,8,9,10,11,12

  **References**:
  - Pattern: research findings list of bad patterns.
  - Pattern: `packages/app/package.json` - add script if needed.

  **Acceptance Criteria**:
  - [ ] Audit command fails before allowlisted cleanup if a forbidden pattern is reintroduced.
  - [ ] Audit command passes after migrations.
  - [ ] Allowlist is explicit and documented.

  **QA Scenarios**:
  ```
  Scenario: Audit detects forbidden fixed footer
    Tool: Bash
    Steps: Run mobile core audit command.
    Expected: Command exits 0 on migrated code; test fixture or documented dry run proves detection behavior.
    Evidence: .sisyphus/evidence/task-13-static-audit.txt

  Scenario: Audit allowlist is constrained
    Tool: Bash
    Steps: Inspect audit output/config.
    Expected: Only primitive internals and explicit fullscreen routes are allowlisted.
    Evidence: .sisyphus/evidence/task-13-allowlist.txt
  ```

  **Commit**: YES | Message: `test(ui): add mobile core static audit` | Files: [`packages/app/scripts/*`, `packages/app/package.json`]

- [x] 14. Add Playwright mobile layout/theme regression coverage

  **What to do**: Add Playwright specs for mobile core behavior: `/login`, `/register`, `/clientes/nuevo`, a list route with floating action, a protected route with bottom nav + footer, theme persistence/system mode, route transition slot cleanup, and modal/page footer coexistence. Use Pixel 5 project. Add stable selectors to mobile primitives where needed (`data-testid="mobile-fixed-footer"`, `mobile-bottom-nav`, `theme-toggle`, slot hosts).
  **Must NOT do**: Do not rely on manual screenshots only; every test must have binary assertions.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: UI QA with Playwright.
  - Skills: [`e2e-testing`, `playwright-skill`] - Avileo E2E conventions and browser testing.
  - Omitted: [`fullstack-backend`] - no API changes.

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: 15 | Blocked By: 7,8,9,10,11,12,13

  **References**:
  - Test: `packages/app/playwright.config.ts` - mobile Chrome Pixel 5 config.
  - Test: `packages/app/e2e/tests/register.spec.ts` - representative auth form test style.
  - Test: `packages/app/e2e/page-objects/LoginPage.ts` - login page object.
  - Pattern: `packages/app/e2e/PATTERNS.md` - E2E conventions.

  **Acceptance Criteria**:
  - [ ] New tests assert footer visibility and non-overlap with bottom nav.
  - [ ] New tests assert theme persistence and system mode.
  - [ ] New tests assert slot cleanup after navigation.
  - [ ] `cd packages/app && bun run test:e2e` includes or can target the new suite.

  **QA Scenarios**:
  ```
  Scenario: Full mobile layout suite
    Tool: Playwright
    Steps: Run new mobile core Playwright suite.
    Expected: All tests pass; traces/screenshots stored for failures and key evidence.
    Evidence: .sisyphus/evidence/task-14-mobile-core-suite.txt

  Scenario: Keyboard/focused input accessibility
    Tool: Playwright
    Steps: Focus last input on `/register` and `/clientes/nuevo`, type value, inspect footer and bounding boxes.
    Expected: Focused input and primary footer action are both visible or scrollable into visible viewport.
    Evidence: .sisyphus/evidence/task-14-keyboard-access.png
  ```

  **Commit**: YES | Message: `test(ui): cover mobile shell regressions` | Files: [`packages/app/e2e/tests/*`, page objects if needed]

- [x] 15. Remove deprecated shells, update docs, and finalize compliance

  **What to do**: Remove or narrow deprecated `FormPage` standalone mode, mark `useSetLayout`/`ToolbarActions` compatibility APIs with sunset comments if retained, update `packages/app/app/components/AGENTS.md` or relevant local docs with the new mobile core rules. Ensure route authors know to use compound API and footer slots. Run full static audit and tests.
  **Must NOT do**: Do not delete compatibility functions still referenced unless all references are migrated.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: cleanup/documentation after migrations.
  - Skills: [`frontend`] - component documentation context.
  - Omitted: [`writing`] - docs are technical and scoped.

  **Parallelization**: Can Parallel: NO | Wave 6 | Blocks: Final Verification | Blocked By: 13,14

  **References**:
  - Pattern: `packages/app/app/components/layout/form-page.tsx` - deprecate/narrow.
  - Pattern: `packages/app/app/components/layout/toolbar-actions.tsx` - compatibility wrapper.
  - Pattern: `packages/app/app/components/AGENTS.md` - local component guidance if present.

  **Acceptance Criteria**:
  - [ ] No unmigrated references to deprecated standalone shell mode.
  - [ ] New mobile core usage documented with examples.
  - [ ] Static audit, typecheck, unit tests, and E2E tests pass.

  **QA Scenarios**:
  ```
  Scenario: Compliance sweep
    Tool: Bash
    Steps: Run mobile audit, typecheck, unit tests, and E2E suite.
    Expected: All commands pass or known external infra issue is documented with logs.
    Evidence: .sisyphus/evidence/task-15-compliance.txt

  Scenario: Documentation examples compile mentally against exports
    Tool: Bash
    Steps: Grep docs examples for exported component names and verify matching exports exist.
    Expected: Every documented component is exported from mobile core index.
    Evidence: .sisyphus/evidence/task-15-doc-export-check.txt
  ```

  **Commit**: YES | Message: `docs(ui): document mobile core layout standard` | Files: [`packages/app/app/components/mobile/*`, docs/AGENTS updates]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit after each task or tightly coupled pair if execution tooling requires fewer commits.
- Use conventional commits listed per task.
- Do not commit generated evidence unless repository convention requires it; keep `.sisyphus/evidence/` for review artifacts.
- Do not push unless explicitly requested.

## Success Criteria
- All app routes in the migration inventory use the mobile core or documented public/fullscreen variants.
- Auth pages, protected pages, forms, lists, details, config/report pages share semantic shell/page/footer tokens.
- `MobileFixedFooter` is the only route-approved fixed footer/action primitive.
- Dark mode works in `system`, `light`, and `dark` modes and persists without first-paint mismatch.
- Keyboard/fixed-footer behavior is verified on mobile viewport with automated assertions.
- Static audit prevents reintroducing route-local layout hacks and shell color hardcodes.
