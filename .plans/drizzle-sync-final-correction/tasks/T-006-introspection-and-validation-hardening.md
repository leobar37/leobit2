# T-006: Introspection and Validation Hardening

## Objective

Remove domain-specific introspection heuristics and enforce strict relation graph validity against declared entities.

## Requirements Covered

- `FR-006`

## Dependencies

- `T-001`

## Files or Areas Involved

- `packages/drizzle-sync/src/config/introspect.ts` — **Modify**
- `packages/drizzle-sync/src/config/validator.ts` — **Modify**
- `packages/drizzle-sync/src/config/schema-manager.ts` — **Review**
- Relevant config/introspection tests — **Modify/Add**

## Actions

1. Remove hardcoded domain plural/relationship inference that can introduce undeclared entities.
2. Prefer explicit relations from config as primary source.
3. Add strict validator checks so serialized graph cannot reference entities outside config.
4. Ensure fallbacks, if any, only operate within declared entity set.

## Completion Criteria

- Introspection no longer injects ghost entities.
- Validator fails fast on invalid graph references.
- Serialized graph remains consistent with declared config entities.

## Validation

- Unit tests for relation detection and graph validation.
- Regenerate schema and verify no undeclared entity nodes appear.

## Risks or Notes

- Some current implicit behavior may need explicit config declarations after this change.
