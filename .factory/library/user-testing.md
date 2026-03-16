# User Testing

Testing surface and validation approach for this mission.

## Validation Surfaces

| Surface | Tool | Setup |
|---------|------|-------|
| API endpoints | curl | Run backend server |
| Frontend pages | Manual verification | Run frontend server |

## Validation Approach

Given the constraint of no browser automation:

1. **API Validation**: Use curl to test all REST endpoints
2. **TypeScript**: Verify build passes
3. **Code Review**: Verify patterns match existing codebase

## Resource Cost Classification

- **Backend validation**: Minimal resources (just API calls)
- **Frontend validation**: N/A - manual verification

## Limitations

- No E2E/browser tests
- No automated UI validation
- Manual verification required for frontend flows
