# Plan: E2E Tests para Registro de Avileo

## Objetivo

Implementar tests E2E con Playwright + MSW para el flujo de registro, cubriendo registro normal, validación de formularios, manejo de errores y registro con invitación.

## Contexto Verificado

- **Página de registro**: `packages/app/app/routes/register.tsx` - form con name, email, password, confirmPassword
- **Validación**: `registerSchema` en `packages/app/app/lib/schemas.ts` - Zod (email, password min 6, name min 2, passwords coinciden)
- **Auth**: Better Auth `signUp.email` en `/api/auth/sign-up/email` (built-in, no custom endpoint)
- **Post-registro**: hydrate business ID → redirect a `/business/create` o `/sync`
- **Invitación**: `/register?token=XYZ` → validate token → sign-up → accept invitation → redirect `/dashboard`
- **MSW ya configurado**: `e2e/mocks/handlers.ts` tiene handlers para sign-in y session, falta sign-up
- **Sin `data-testid`** en campos del form de registro
- **Sin Page Object** para registro (solo `LoginPage`)
- **Playwright configs**: `playwright.config.ts` (backend real) y `playwright.msw.config.ts` (MSW)

## Tareas

### Tarea 1: Agregar `data-testid` al form de registro

**Archivo**: `packages/app/app/routes/register.tsx`

Agregar `data-testid` a los 4 campos del form + botón submit + contenedor de error root:

| Elemento | testid | Línea aprox |
|----------|--------|-------------|
| Input nombre | `register-name` | 158 |
| Input email | `register-email` | 165 |
| Input password | `register-password` | 172 |
| Input confirmar password | `register-confirm-password` | 180 |
| Botón submit | `register-submit` | 196 |
| Error root | `register-error` | 188 |

Los campos usan `{...form.register("field")}` que spreadea props. Agregar `data-testid` como prop adicional. Para `FormInput` y `FormPassword`, verificar que acepten props extra (deberían por el spread).

### Tarea 2: Agregar handlers MSW para registro e invitaciones

**Archivo**: `packages/app/e2e/mocks/handlers.ts`

Agregar 3 handlers nuevos:

```typescript
// Sign-up - mockear respuesta de Better Auth
http.post("/api/auth/sign-up/email", async ({ request }) => {
  const body = await request.json();
  // Simular respuesta exitosa de Better Auth
  return HttpResponse.json({
    token: "mock-jwt-token-signup",
    user: { id: "user-new", email: body.email, name: body.name },
  });
});

// Validar invitación
http.get("/api/public/invitations/:token", ({ params }) => {
  if (params.token === "invalid-token") {
    return HttpResponse.json({ success: false, error: "Token inválido" }, { status: 404 });
  }
  return HttpResponse.json({
    success: true,
    data: { name: "Negocio Mock", email: "admin@mock.com", salesPoint: "Punto 1" },
  });
});

// Aceptar invitación
http.post("/api/public/invitations/accept", async () => {
  return HttpResponse.json({ success: true });
});
```

**Nota**: El formato exacto de respuesta de Better Auth sign-up necesita inspección. El handler anterior es un punto de partida. Verificar con el backend corriendo o la documentación de Better Auth.

También agregar handler para `/api/businesses/me` que ya existe parcialmente.

### Tarea 3: Crear Page Object `RegisterPage`

**Archivo nuevo**: `packages/app/e2e/page-objects/RegisterPage.ts`

```typescript
export class RegisterPage {
  constructor(private page: Page) {}

  async goto() { await this.page.goto("/register"); }
  async gotoWithInvitation(token: string) { await this.page.goto(`/register?token=${token}`); }

  async fillName(name: string) { await this.page.getByTestId("register-name").fill(name); }
  async fillEmail(email: string) { await this.page.getByTestId("register-email").fill(email); }
  async fillPassword(password: string) { await this.page.getByTestId("register-password").fill(password); }
  async fillConfirmPassword(password: string) { await this.page.getByTestId("register-confirm-password").fill(password); }

  async submit() { await this.page.getByTestId("register-submit").click(); }

  async register(data: { name: string; email: string; password: string }) {
    await this.fillName(data.name);
    await this.fillEmail(data.email);
    await this.fillPassword(data.password);
    await this.fillConfirmPassword(data.password);
    await this.submit();
  }

  async getErrorMessage() { return this.page.getByTestId("register-error").textContent(); }
  async getFieldError(field: string) { /* obtener error del campo */ }
  async isSubmitDisabled() { return this.page.getByTestId("register-submit").isDisabled(); }
}
```

### Tarea 4: Configurar project sin auth para tests de registro

**Archivo**: `packages/app/playwright.msw.config.ts`

Agregar un project `register` sin `storageState` (usuario no autenticado):

```typescript
{
  name: "register",
  testMatch: /register\.spec\.ts/,
  use: {
    ...devices["Pixel 5"],
    // Sin storageState - usuario no autenticado
  },
  dependencies: ["setup"], // solo setup básico, no auth.setup
},
```

**Nota**: El setup actual (`auth.setup.ts`) guarda auth state. Los tests de registro necesitan un setup que NO autentique. Puede necesitarse un setup separado o condicionar el setup existente.

### Tarea 5: Escribir tests E2E

**Archivo nuevo**: `packages/app/e2e/tests/register.spec.ts`

#### Happy Path

```
test("registro exitoso redirige a /business/create o /sync")
test("registro exitoso con business existente redirige a /sync")
```

#### Validación de formulario

```
test("email invalido muestra error")
test("password menor a 6 caracteres muestra error")
test("contraseñas no coinciden muestra error")
test("nombre menor a 2 caracteres muestra error")
test("submit deshabilitado con formulario invalido")
test("campos vacios muestran error al tocar y salir")
```

#### Error handling

```
test("email ya registrado muestra error del servidor")
test("error de red muestra mensaje generico")
```

#### Flujo con invitación

```
test("registro con invitacion valida muestra 'Unirme a un negocio'")
test("registro con invitacion valida acepta y redirige a /dashboard")
test("token invalido muestra advertencia pero permite registro normal")
test("fallo al aceptar invitacion muestra warning")
```

#### Navegación

```
test("link 'Inicia sesion' navega a /login")
test("usuario ya autenticado redirige a /sync")
```

## Orden de Ejecución

```
Tarea 1 (data-testid) ──┐
Tarea 2 (MSW handlers) ──┼──→ Tarea 3 (Page Object) ──→ Tarea 5 (Tests)
Tarea 4 (Config) ────────┘
```

Tareas 1, 2, 4 son independientes entre sí. Tarea 3 depende de 1. Tarea 5 depende de todas.

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Formato de respuesta de Better Auth sign-up desconocido | Inspeccionar con backend corriendo o docs de Better Auth |
| `FormInput`/`FormPassword` pueden no pasar `data-testid` al DOM | Verificar que acepten props extra via spread |
| Inconsistencia password min 6 (schema) vs min 8 (placeholder) | Testear contra schema (min 6), reportar bug del placeholder |
| Tests de registro pueden interferir con tests autenticados | Usar project separado sin storageState |

## Validación

- `bun run test:e2e:msw -- --grep register` para ejecutar solo tests de registro
- Verificar que tests de registro NO rompen tests existentes
- Verificar que MSW intercepta correctamente los endpoints
