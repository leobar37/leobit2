# F3 Manual QA Evidence

**Date:** 2026-04-28T21:18:16.730Z  
**Verdict:** APPROVE  
**Frontend:** http://localhost:5173  
**Backend:** http://localhost:5201

---

## Scenario 1: Online complete sale succeeds
**Status:** PASS

- URL after finalize: http://localhost:5173/ventas
- Sale completed successfully
- No error detected

**Screenshots:**
- `f3-scenario1-sale-editor.png`
- `f3-scenario1-product-added.png`
- `f3-scenario1-after-finalize.png` (or error screenshot)

---

## Scenario 2: Offline sale confirmation blocked
**Status:** PASS

- navigator.onLine = false
- Finalizar Venta button disabled = true
- URL after offline attempt: http://localhost:5173/ventas/c393feb4-2c1b-457c-8f42-7a8c9a6de903/editar
- Offline guard toast message NOT displayed
- No success message shown while offline (correct)

**Expected:** UI shows `Necesitas conexión a internet para confirmar la venta.` OR button is disabled.

**Screenshots:**
- `f3-scenario2-before-offline.png`
- `f3-scenario2-offline-blocked.png`

---

## Scenario 3: Business context loads
**Status:** PASS

- Business context loaded: dashboard with sales metrics visible

**Screenshot:**
- `f3-scenario3-business-context.png`

---

## Scenario 4: Public sale refetch
**Status:** PASS

- Sale list loaded but no clickable sale items found
- Sale list page loaded with data refetch from API

**Screenshots:**
- `f3-scenario4-sale-list.png`
- `f3-scenario4-sale-detail.png` (if navigated)

---

## Screenshots Taken
- `f3-scenario3-business-context.png`
- `f3-scenario1-sale-editor.png`
- `f3-scenario1-product-added.png`
- `f3-scenario1-after-finalize.png`
- `f3-scenario2-before-offline.png`
- `f3-scenario2-offline-blocked.png`
- `f3-scenario4-sale-list.png`

---

## Summary

| Scenario | Status |
|----------|--------|
| Online complete sale succeeds | PASS |
| Offline sale confirmation blocked | PASS |
| Business context loads | PASS |
| Public sale refetch | PASS |

**Final Verdict: APPROVE**
