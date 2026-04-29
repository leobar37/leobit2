# Mobile Core Layout Refactor - Learnings

## Conventions
- Shell class names must remain as compatibility aliases during migration.
- All new CSS uses semantic variables, not raw hex/rgb values.
- Compound JSX API preferred over prop-heavy wrappers.
- Portal slots: single-writer for header/footer, multi-writer for floating actions.
- DEV warnings for conflicting single-writer slots.
- Theme: persisted choice → system preference → light fallback.
- Keyboard: browser-managed default; VisualViewport progressive enhancement.

## Patterns
- Current shell classes in `globals.css:80-139` to convert to semantic variables.
- Modal precedent in `lib/modal/components.tsx` for compound slot mental model.
- `ToolbarActions` is current portal utility for footer actions.

## Gotchas
- Do not globally enable `navigator.virtualKeyboard.overlaysContent`.
- Safari/Firefox do not support VirtualKeyboard API.
- Hydration mismatch risk with theme: apply before paint.
- Auth pages must remain functional during migration (health drawer, invitations).
