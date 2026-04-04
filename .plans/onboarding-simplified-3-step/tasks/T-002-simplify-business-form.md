# T-002: Simplificar formulario `/business/create`

## Objective
Simplificar el formulario de creación de negocio para que solo el nombre sea obligatorio, reduciendo fricción en el onboarding.

## Requirements
- FR-002

## Files to Modify
- `packages/app/app/routes/_protected.business.create.tsx`

## Implementation Details

### 1. Schema Changes
```typescript
// Current:
const createBusinessSchema = z.object({
  name: z.string().min(2).max(100),
  ruc: z.string().max(20).optional(),
  address: z.string().optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().or(z.literal("")).optional(),
});

// Simplified - keep same but mark more as optional in UI
// Only name shows as required field
```

### 2. UI Changes
- Header: "Paso 2 de 3" indicador
- Campos opcionales colapsados en sección "Opcional (puedes agregar después)"
- Solo mostrar: Nombre del negocio (destacado)
- Campos opcionales: RUC, Teléfono (ocultos o colapsados)
- Botón "Crear y continuar" (más grande)

### 3. Layout Updates
```
┌─────────────────────────────────┐
│     ¿Cómo se llama tu           │
│       negocio?                  │
│         Paso 2 de 3             │
├─────────────────────────────────┤
│  Nombre del negocio *           │
│  [_________________]            │
├─────────────────────────────────┤
│  Opcional (puedes agregar       │
│  después):                      │
│  [RUC] [Teléfono]               │
├─────────────────────────────────┤
│  [Crear y continuar]            │
└─────────────────────────────────┘
```

## Validation Checklist
- [ ] Solo nombre es obligatorio
- [ ] Campos opcionales están colapsados/ocultos
- [ ] Indicador "Paso 2 de 3" visible
- [ ] Layout centrado y limpio
- [ ] Redirección a /onboarding/data tras crear
- [ ] Funciona con solo nombre (sin RUC/teléfono)

## Notes
- El backend ya acepta solo name, no requiere cambios
- Actualizar texto del botón de "Crear negocio" a "Crear y continuar"
- Asegurar que backHref siga funcionando correctamente
