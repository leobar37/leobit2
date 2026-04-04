# T-001: Crear ruta `/register` con formulario

## Objective
Crear la página de registro de usuarios accesible públicamente en `/register`.

## Requirements
- FR-001

## Files to Modify/Created

### New Files
- `packages/app/app/routes/register.tsx` - Página de registro

### Modified Files
- `packages/app/app/routes.ts` - Agregar ruta `/register`
- `packages/app/app/routes/login.tsx` - Agregar link "Crear cuenta"

## Implementation Details

### 1. register.tsx Structure
```typescript
// Formulario con:
// - name: string (required, min 2 chars)
// - email: string (required, email format)
// - password: string (required, min 8 chars)

// Usar:
// - useForm + zodResolver con registerSchema
// - useAuth().register() para submit
// - Redirigir a /business/create tras éxito
```

### 2. UI/UX Specifications
- Layout centrado, max-width: 400px
- Logo de Avileo en header
- Campos en orden: Nombre, Email, Contraseña
- Botón "Crear cuenta" primario (naranja)
- Link "¿Ya tienes cuenta? Inicia sesión"
- Mensajes de error en español

### 3. Error Handling
- Email ya registrado: "Este correo ya está registrado"
- Contraseña débil: "La contraseña debe tener al menos 8 caracteres"
- Error genérico: "No se pudo crear la cuenta. Intenta nuevamente."

## Validation Checklist
- [ ] Ruta `/register` accesible sin autenticación
- [ ] Formulario valida campos con Zod
- [ ] Integración con `useAuth().register()`
- [ ] Redirección correcta tras registro exitoso
- [ ] Mensajes de error claros
- [ ] Link a /login funciona
- [ ] Diseño responsive (mobile-first)

## Dependencies
- `packages/app/app/lib/schemas.ts` - registerSchema
- `packages/app/app/hooks/use-auth.ts` - useAuth hook
- `packages/app/app/lib/auth-client.ts` - authClient

## Notes
- Reutilizar estilos de `login.tsx` para consistencia
- No requiere confirmación de contraseña (simplificación UX)
