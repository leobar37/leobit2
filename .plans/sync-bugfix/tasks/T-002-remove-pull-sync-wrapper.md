# T-002: Remove PullSyncWrapper from _protected.tsx

**Requirement**: FR-001

## Action

Edit `packages/app/app/routes/_protected.tsx` and remove the `<PullSyncWrapper>` wrapper in 3 places.

### Location 1 — Lines 154-160 (offline mode with cached business)
```tsx
// ANTES
<ServicesProvider pg={pg} db={db} businessId={businessId} businessUserId={businessUserId} authToken={token}>
  <PullSyncWrapper>
    <div className="fixed top-0 left-0 right-0 bg-amber-500/90 ...">
      ...
    </div>
    {children}
  </PullSyncWrapper>
</ServicesProvider>

// DESPUÉS
<ServicesProvider pg={pg} db={db} businessId={businessId} businessUserId={businessUserId} authToken={token}>
  <div className="fixed top-0 left-0 right-0 bg-amber-500/90 ...">
    ...
  </div>
  {children}
</ServicesProvider>
```

### Location 2 — Lines 171-177 (timeout mode with cached business)
Same pattern — remove `<PullSyncWrapper>` wrapping, keep the amber banner div and children.

### Location 3 — Lines 276-278 (normal authenticated state)
```tsx
// ANTES
<ServicesProvider pg={pg} db={db} businessId={businessId} businessUserId={businessUserId} authToken={token}>
  <PullSyncWrapper>
    {children}
  </PullSyncWrapper>
</ServicesProvider>

// DESPUÉS
<ServicesProvider pg={pg} db={db} businessId={businessId} businessUserId={businessUserId} authToken={token}>
  {children}
</ServicesProvider>
```

Also remove the import at the top of the file:
```tsx
// ELIMINAR esta línea
import { PullSyncWrapper } from "~/components/sync/pull-sync-wrapper";
```

## Why This Works

`SyncCoordinator` (created in `ServicesProvider`) already calls `pullService.startAutoPull()` in its `start()` method. No separate pull mechanism is needed.

## Verification

1. Run frontend tests: `cd packages/app && bun test app/lib/sync/__tests__ --run`
2. The PullSyncWrapper's functionality (periodic pull) is now handled by SyncCoordinator
3. Check that `onChangesApplied` callback in SyncCoordinator's PullService invalidates TanStack queries — this was also a function of PullSyncWrapper

## Files Modified
- `packages/app/app/routes/_protected.tsx`
