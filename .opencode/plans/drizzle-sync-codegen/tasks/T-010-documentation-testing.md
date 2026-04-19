# T-010: Documentation & Testing

## Objective

Write comprehensive documentation and test the entire system.

## Requirements

**From**: Task definition

## Implementation Details

### Documentation Files

1. `packages/drizzle-sync/README.md`
   - Overview and quick start
   - Installation instructions
   - Basic usage examples

2. `packages/drizzle-sync/docs/usage.md`
   - Detailed API documentation
   - Configuration examples
   - CLI commands reference

3. `packages/drizzle-sync/docs/architecture.md`
   - How the code generation works
   - Relation cascade algorithm
   - Type mapping tables

### Testing Strategy

1. **Unit Tests**
   ```typescript
   // __tests__/config/validator.test.ts
   describe("Config Validation", () => {
     it("validates valid config", () => {
       const config = defineSyncConfig({
         entities: { /* ... */ }
       });
       expect(validateConfig(config).valid).toBe(true);
     });
   });
   ```

2. **Generator Tests**
   ```typescript
   // __tests__/generators/zod-generator.test.ts
   describe("Zod Generator", () => {
     it("generates correct schema for customers", () => {
       const output = generateZodSchema(/* ... */);
       expect(output.schemaCode).toContain("z.string()");
     });
   });
   ```

3. **Integration Tests**
   ```typescript
   // __tests__/integration/full-pipeline.test.ts
   describe("Full Pipeline", () => {
     it("generates all files from backend config", async () => {
       const config = await loadConfig("./test-sync.config.ts");
       const output = await generateAll(config);
       expect(output.files).toHaveLength(5);
     });
   });
   ```

4. **Snapshot Tests**
   ```typescript
   // Snapshot tests for generated code
   expect(generatedCode).toMatchSnapshot();
   ```

### Test Files to Create

```
packages/drizzle-sync/
├── __tests__/
│   ├── config/
│   │   ├── define-config.test.ts
│   │   ├── validator.test.ts
│   │   └── loader.test.ts
│   ├── generators/
│   │   ├── zod-generator.test.ts
│   │   ├── ddl-generator.test.ts
│   │   ├── applier-generator.test.ts
│   │   └── hooks-generator.test.ts
│   ├── introspection/
│   │   ├── introspect.test.ts
│   │   └── relations.test.ts
│   └── integration/
│       └── full-pipeline.test.ts
└── vitest.config.ts
```

## Acceptance Criteria

- [ ] Write README.md with quick start guide
- [ ] Write docs/usage.md with full API reference
- [ ] Write docs/architecture.md explaining internals
- [ ] Unit tests for config (validator, loader)
- [ ] Unit tests for all generators
- [ ] Integration test for full pipeline
- [ ] Snapshot tests for generated code
- [ ] All tests passing
- [ ] Code coverage > 80%

## Testing Commands

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific test file
bun test generators/zod-generator

# Update snapshots
bun test --update
```

## Dependencies

- T-009: Frontend Integration (complete before testing)

## Estimated Time

3 hours

## Notes

- Documentation is critical for adoption
- Tests should use real Drizzle tables (test schema)
- Snapshots help detect unintended changes
- Include examples in docs
