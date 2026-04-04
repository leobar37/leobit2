# T-008: Testing de integración del flujo completo

## Objective
Crear tests E2E que validen el flujo completo de onboarding simplificado.

## Requirements
- Verificación de todas las funcionalidades implementadas

## Files to Create
- `packages/app/e2e/onboarding.spec.ts`

## Test Scenarios

### Scenario 1: Registro Completo (Happy Path)
```typescript
test("Usuario nuevo completa onboarding de 3 pasos", async ({ page }) => {
  // 1. Landing → Register
  await page.goto("/landing");
  await page.click("text=Comenzar prueba gratis");
  await expect(page).toHaveURL("/register");
  
  // 2. Register
  await page.fill('input[name="name"]', "Juan Pérez");
  await page.fill('input[name="email"]', "juan@test.com");
  await page.fill('input[name="password"]', "password123");
  await page.click("text=Crear cuenta");
  
  // 3. Auto-redirect to Business Create
  await expect(page).toHaveURL("/business/create");
  
  // 4. Create Business
  await page.fill('input[name="name"]', "Pollería El Sabor");
  await page.click("text=Crear y continuar");
  
  // 5. Select Demo Data
  await expect(page).toHaveURL("/onboarding/data");
  await page.click("text=Cargar datos de ejemplo");
  await page.click("text=Continuar");
  
  // 6. Dashboard with Checklist
  await expect(page).toHaveURL("/dashboard");
  await expect(page.locator("text=1/3 completado")).toBeVisible();
  await expect(page.locator("text=Negocio creado")).toBeVisible();
});
```

### Scenario 2: Registro con Invitación
```typescript
test("Usuario acepta invitación durante registro", async ({ page }) => {
  const token = "valid-invitation-token";
  
  // 1. Go to register with token
  await page.goto(`/register?token=${token}`);
  
  // 2. See invitation info
  await expect(page.locator("text=Te han invitado")).toBeVisible();
  await expect(page.locator("text=Pollería El Sabor")).toBeVisible();
  
  // 3. Register and auto-accept
  await page.fill('input[name="name"]', "Pedro Vendedor");
  await page.fill('input[name="email"]', "pedro@test.com");
  await page.fill('input[name="password"]', "password123");
  await page.click("text=Crear cuenta y unirme");
  
  // 4. Skip business creation, go directly to dashboard
  await expect(page).toHaveURL("/dashboard");
});
```

### Scenario 3: Checklist Completion
```typescript
test("Checklist se actualiza al completar pasos", async ({ page }) => {
  // Given: User with business, no products
  await loginAsNewUser(page);
  
  // Dashboard shows 1/3
  await expect(page.locator("text=1/3 completado")).toBeVisible();
  
  // Add first product
  await page.click("text=Hacer ahora"); // Goes to /productos/nuevo
  await page.fill('input[name="name"]', "Pollo Entero");
  await page.click("text=Guardar");
  
  // Back to dashboard
  await page.goto("/dashboard");
  await expect(page.locator("text=2/3 completado")).toBeVisible();
  
  // Add first sale
  await page.click("text=Empezar"); // Goes to /ventas/nueva
  // ... complete sale flow
  
  // Back to dashboard
  await page.goto("/dashboard");
  await expect(page.locator("text=3/3 completado")).toBeVisible();
  
  // Checklist should disappear or show complete state
  await expect(page.locator("text=¡Todo listo!")).toBeVisible();
});
```

### Scenario 4: Dismiss Checklist
```typescript
test("Usuario puede cerrar checklist y no vuelve a aparecer", async ({ page }) => {
  await loginAsUserWithBusiness(page);
  
  // Close checklist
  await page.click("[data-testid=dismiss-checklist]");
  
  // Reload page
  await page.reload();
  
  // Checklist should not be visible
  await expect(page.locator("text=1/3 completado")).not.toBeVisible();
});
```

## Validation Checklist
- [ ] Test de registro completo (landing → dashboard)
- [ ] Test de registro con invitación
- [ ] Test de checklist progresivo
- [ ] Test de cerrar checklist
- [ ] Test de errores (email duplicado, token inválido)
- [ ] Test responsive (mobile viewport)

## Dependencies
- Todas las tareas T-001 a T-007 deben estar completadas
- Seeds de base de datos para tests

## Notes
- Usar `test.describe` para agrupar tests relacionados
- Crear fixtures para usuarios de prueba
- Considerar parallel execution para velocidad
