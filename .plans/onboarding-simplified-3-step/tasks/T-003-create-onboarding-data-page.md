# T-003: Crear página `/onboarding/data`

## Objective
Crear página para que el usuario elija entre cargar datos de ejemplo o empezar con negocio vacío.

## Requirements
- FR-003

## Files to Create
- `packages/app/app/routes/_protected.onboarding.data.tsx`

## Files to Modify
- `packages/app/app/routes.ts` - Agregar ruta

## Implementation Details

### 1. Page Structure
```typescript
// Estado local:
type OnboardingOption = 'demo' | 'empty' | null;

// Selección visual de dos opciones:
// - Opción A: Cargar datos de ejemplo (recomendado)
// - Opción B: Empezar vacío
```

### 2. UI Design
```
┌─────────────────────────────────┐
│  ¿Quieres empezar con           │
│   datos de ejemplo?             │
│      Paso 3 de 3                │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │  ✨ Cargar datos de ejemplo │ │
│ │                             │ │
│ │ Productos típicos de        │ │
│ │ pollería, clientes de       │ │
│ │ ejemplo, configuración      │ │
│ │ básica lista para usar.     │ │
│ │                             │ │
│ │ [Ideal para aprender]       │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │  📦 Empezar vacío           │ │
│ │                             │ │
│ │ Sin productos ni clientes.  │ │
│ │ Configurarás todo desde     │ │
│ │ cero según tus necesidades. │ │ │
│ │                             │ │
│ │ [Para negocios establecidos]│ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│  [Continuar]                    │
└─────────────────────────────────┘
```

### 3. Interaction Flow
1. Usuario selecciona una opción (click en card)
2. La opción seleccionada se resalta (border naranja, bg naranja claro)
3. Botón "Continuar" habilitado solo cuando hay selección
4. Al hacer click:
   - Si `demo`: Llamar a `POST /businesses/seed-demo`, luego redirigir a `/dashboard`
   - Si `empty`: Redirigir directamente a `/dashboard`

### 4. API Integration
```typescript
// Hook a crear: useSeedDemoData()
const seedDemo = useMutation({
  mutationFn: async () => {
    const { data, error } = await api.businesses['seed-demo'].post();
    if (error) throw new Error(String(error.value));
    return data;
  }
});
```

## Validation Checklist
- [ ] Ruta `/onboarding/data` accesible
- [ ] Dos opciones visibles y seleccionables
- [ ] Solo una opción puede seleccionarse a la vez
- [ ] Botón "Continuar" deshabilitado hasta seleccionar
- [ ] Si selecciona demo: llama a API y espera respuesta
- [ ] Redirección a /dashboard tras completar
- [ ] Diseño responsive

## Dependencies
- T-002: Business creation debe funcionar primero
- T-006: Backend seed endpoint debe existir

## Notes
- Usar FormPage layout para consistencia
- Mostrar loading state mientras se cargan datos demo
- Considerar error handling si falla el seed
