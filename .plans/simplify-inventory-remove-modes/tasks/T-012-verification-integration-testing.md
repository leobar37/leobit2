# T-012: Verification - Integration testing

**Status:** pending  
**Priority:** P1  
**Est. Time:** 2-3 hours  
**Requirements:** NFR-002  

## Description
End-to-end testing of the complete simplified inventory flow to ensure everything works together correctly.

## Test Scenarios

### Scenario 1: Admin Creates Distribution
**Flow:** Admin → Create Distribución → Assign to Vendor

**Steps:**
1. Login as admin
2. Go to Distribuciones page
3. Click "Nueva Distribución"
4. Select vendedor
5. Select punto de venta
6. Add nota de creación (optional)
7. Submit

**Expected:**
- Distribución created with estado="activo"
- No modo field present
- No items assigned (optional)
- No stock reserved
- Vendor can see distribution in "Mi Distribución"

### Scenario 2: Vendor Sells Without Distribution
**Flow:** Vendor → Create Sale (no distribución)

**Steps:**
1. Login as vendor
2. Go to Ventas
3. Create new sale
4. Select products
5. Complete sale

**Expected:**
- Sale created successfully
- No modo validation errors
- No stock validation against distribution

### Scenario 3: Vendor Sells With Distribution
**Flow:** Vendor with Distribución → Create Sale → Reference Distribución

**Steps:**
1. Vendor has active distribución
2. Create sale
3. Sale references distribución

**Expected:**
- Sale created
- Distribución not modified
- No stock checks

### Scenario 4: Vendor Closes Distribution
**Flow:** Vendor → Close Distribución → Register Products

**Steps:**
1. Vendor has active distribución
2. Click "Cerrar Distribución"
3. Add products with quantities:
   - Select variant
   - Input cantidadLlevada
   - Input cantidadVendida
4. Verify cantidadDevuelta calculated
5. Add nota de cierre
6. Submit

**Expected:**
- Cierre items created
- Distribución estado="cerrado"
- Products visible in cierre summary

### Scenario 5: Admin Reviews Closed Distribution
**Flow:** Admin → View Distribución → See Cierre Items

**Steps:**
1. Login as admin
2. View closed distribución
3. See cierre items with quantities

**Expected:**
- Cierre items displayed
- Llevada/Vendida/Devuelta visible
- Monto ventas calculated

### Scenario 6: Offline Sync
**Flow:** Offline → Create Distribución → Online Sync

**Steps:**
1. Go offline
2. Create distribución (no modo)
3. Create sales
4. Close distribución with items
5. Go online
6. Sync

**Expected:**
- All data syncs successfully
- No modo-related sync errors
- Cierre items synced

## Manual QA Checklist

### Backend API
- [ ] POST /distribuciones - creates without modo
- [ ] PATCH /distribuciones/:id/close-with-items - closes with cierre items
- [ ] POST /sales - creates without modo validation
- [ ] GET /distribuciones/:id - returns without modo field

### Frontend UI
- [ ] Create distribución form - no modo selector
- [ ] Mi distribución - shows active distribution
- [ ] Close form - allows product registration
- [ ] Sales - no modo validation errors

### Database
- [ ] distribuciones table - no modo column
- [ ] businesses table - no modo columns
- [ ] distribucion_cierre_items table - exists and populated

### Sync
- [ ] Offline distribución creation syncs
- [ ] Offline close with items syncs
- [ ] No modo-related sync errors

## Automated Integration Tests

Create test file: `packages/backend/src/__tests__/inventory-simplified-flow.test.ts`

```typescript
describe("Simplified Inventory Flow", () => {
  it("complete flow: create -> sell -> close", async () => {
    // 1. Admin creates distribution
    // 2. Vendor creates sales
    // 3. Vendor closes with items
    // 4. Verify data integrity
  });

  it("sale without distribution works", async () => {
    // Vendor creates sale without active distribution
    // Should succeed
  });

  it("close with items calculates correctly", async () => {
    // Close with known quantities
    // Verify calculations
  });
});
```

## Implementation Steps

1. **Manual testing of each scenario**
2. **Run automated integration tests**
3. **Check all API endpoints**
4. **Verify database state**
5. **Test sync flow**
6. **Document any issues**
7. **Fix regressions**

## Sign-Off Criteria

Before marking complete:

- [ ] All scenarios tested manually
- [ ] All automated tests passing
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Code review approved

## Dependencies

**Blocks:** None (final task)  
**Depends on:** T-009, T-010

## Notes

- This is the final validation before production
- Test on staging environment first
- Include mobile testing (vendors use phones)
- Test offline scenarios thoroughly
- Document any edge cases found
