# T-004: Auto-redirect post-login si no tiene business

## Objective
Detectar usuarios sin negocio después del login/registro y redirigirlos automáticamente a crear uno.

## Requirements
- FR-004

## Files to Modify
- `packages/app/app/hooks/use-auth.ts`

## Implementation Details

### 1. Current Behavior
```typescript
// Current (lines 95-98):
if (!businessId) {
  console.error("[useAuth] Business ID not found after login");
  throw new Error("No se encontró el negocio asociado a tu cuenta.");
}
```

### 2. New Behavior
```typescript
// New:
if (!businessId) {
  // No es un error, es un usuario nuevo sin negocio
  navigate("/business/create", { replace: true });
  return result.data;
}
```

### 3. Changes Required

En función `login()` (líneas 72-111):
```typescript
const businessId = await hydrateCurrentBusinessId();

if (!businessId) {
  // Redirect to business creation instead of error
  navigate("/business/create", { replace: true });
  return result.data;
}
```

En función `register()` (líneas 113-156):
```typescript
const businessId = await hydrateCurrentBusinessId();

if (!businessId) {
  // Redirect to business creation instead of error
  navigate("/business/create", { replace: true });
  return result.data;
}
```

### 4. Flow Result
```
Login/Register → API call → Check business → 
  ├─ Has business → /sync → /dashboard
  └─ No business → /business/create → /onboarding/data → /dashboard
```

## Validation Checklist
- [ ] Usuario nuevo tras registro va a /business/create
- [ ] Usuario sin negocio tras login va a /business/create
- [ ] Usuario con negocio sigue flujo normal a /sync
- [ ] No se muestra error si falta business
- [ ] Usuario puede refrescar página sin perder el flujo

## Dependencies
- T-001: Registro debe funcionar
- T-002: Business create debe existir

## Notes
- Usar `{ replace: true }` para que no pueda hacer "back" al login
- Mantener el return result.data para que el hook funcione correctamente
