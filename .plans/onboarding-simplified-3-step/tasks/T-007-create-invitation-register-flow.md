# T-007: Flow invitación con token en registro

## Objective
Mejorar la experiencia cuando un usuario llega a /register desde una invitación, mostrando información del negocio y auto-aceptando la invitación tras registro.

## Requirements
- FR-007

## Files to Modify
- `packages/app/app/routes/register.tsx`

## Implementation Details

### 1. Detect Token in URL
```typescript
// En register.tsx
import { useSearchParams } from "react-router";

const [searchParams] = useSearchParams();
const invitationToken = searchParams.get("token");
```

### 2. Validate Token
```typescript
// Usar useQuery para validar token
const { data: invitationData, isLoading: isLoadingInvitation } = useQuery({
  queryKey: ["invitation", invitationToken],
  queryFn: async () => {
    if (!invitationToken) return null;
    const { data, error } = await api.public.invitations({ token: invitationToken }).get();
    if (error) throw new Error("Token inválido");
    return data;
  },
  enabled: !!invitationToken,
});
```

### 3. UI States

**Con token válido:**
```
┌─────────────────────────────────┐
│  Te han invitado a unirte a     │
│  "Pollería El Sabor"            │
│                                 │
│  Crea tu cuenta para aceptar    │
│  la invitación.                 │
├─────────────────────────────────┤
│  Nombre completo                │
│  Email                          │
│  Contraseña                     │
├─────────────────────────────────┤
│  [Crear cuenta y unirme]        │
└─────────────────────────────────┘
```

**Con token inválido:**
```
┌─────────────────────────────────┐
│  ⚠️ Invitación no válida        │
│                                 │
│  El enlace ha expirado o        │
│  ya fue usado.                  │
│                                 │
│  [Crear cuenta individual]      │
└─────────────────────────────────┘
```

### 4. Auto-Acept After Register
```typescript
const handleRegister = async (formData: RegisterFormData) => {
  // 1. Register user
  await register(formData);
  
  // 2. If token exists, auto-accept invitation
  if (invitationToken) {
    try {
      await api.public.invitations.accept.post({ token: invitationToken });
      // Redirect to dashboard (already has business from invitation)
      navigate("/dashboard");
      return;
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      // Continue to business creation if acceptance fails
    }
  }
  
  // 3. Normal flow - redirect to business creation
  navigate("/business/create");
};
```

## Validation Checklist
- [ ] Detecta token en URL (?token=xxx)
- [ ] Valida token con API público
- [ ] Muestra nombre del negocio invitador
- [ ] Cambia CTA a "Crear cuenta y unirme"
- [ ] Auto-acepta invitación tras registro exitoso
- [ ] Redirige a dashboard del negocio invitado
- [ ] Maneja token inválido/expirado gracefulmente

## Dependencies
- T-001: Registro base debe funcionar
- `packages/app/app/hooks/use-invitation-public.ts` - Hook existente

## Notes
- Si el token es inválido, permitir registro normal (no bloquear)
- El auto-accept es "best effort" - si falla, ir a flujo normal
- Considerar mostrar toast de éxito al aceptar invitación
