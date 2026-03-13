# Architecture

## PGlite + ElectricSQL Migration

### Stack
- **Local DB**: PGlite (PostgreSQL WASM)
- **Sync**: ElectricSQL (read sync)
- **ORM**: Drizzle ORM
- **Write Queue**: IndexedDB + custom write-engine

### Data Flow
```
┌─────────────┐     ┌──────────┐     ┌─────────────┐
│   React UI  │────▶│  Drizzle │────▶│   PGlite    │
└─────────────┘     └──────────┘     └──────┬──────┘
                                            │
                              ┌─────────────┴─────────────┐
                              │                           │
                              ▼                           ▼
                        ┌──────────┐              ┌──────────────┐
                        │ Electric │              │ Write Queue  │
                        │  (read)  │              │  (IndexedDB) │
                        └────┬─────┘              └──────┬───────┘
                             │                           │
                             ▼                           ▼
                        ┌──────────┐              ┌──────────────┐
                        │PostgreSQL│◀─────────────│  REST API    │
                        │ (server) │   (writes)   │  (ElysiaJS)  │
                        └──────────┘              └──────────────┘
```

### Key Patterns

#### Hook Pattern
```typescript
// Query
const { data } = useQuery({
  queryKey: ['entity', id],
  queryFn: async () => {
    const { db } = getDatabase();
    return db.select().from(entities).where(eq(entities.id, id));
  }
});

// Mutation
const mutation = useMutation({
  mutationFn: async (data) => {
    return pushWrite('/api/entities', 'POST', data);
  }
});
```

#### Offline Write Flow
1. User triggers mutation
2. `pushWrite` checks online status
3. If online: POST to API
4. If offline: Queue in IndexedDB
5. When online: Process queue
6. Electric syncs changes back
