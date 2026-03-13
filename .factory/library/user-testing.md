# User Testing Guide

## Testing Surface

### Pages to Test
1. `/distribuciones` - Admin distribuciones list
2. `/mi-distribucion` - Vendor distribution view
3. `/compras` - Purchases list
4. `/compras/nueva` - Create purchase
5. `/proveedores` - Suppliers list
6. `/productos` - Products list

### Testing Tools
- **Browser DevTools**: Network tab for sync, Application tab for IndexedDB
- **React Query DevTools**: Query cache inspection
- **PGlite Console**: Direct DB inspection

### Offline Testing
1. Open Chrome DevTools
2. Go to Network tab
3. Set "Offline" throttle
4. Perform actions
5. Check IndexedDB for queued writes
6. Set "Online" and verify sync

### Data Validation
```javascript
// Check PGlite data in console
const { getDatabase } = await import('~/engine');
const { db } = getDatabase();
const data = await db.select().from(customers);
console.log(data);
```

### Sync Verification
- Watch Electric sync in Network tab
- Check shape responses
- Verify real-time updates
