# T-005: Crear checklist component en dashboard

## Objective
Crear un componente de checklist de 3 items en el dashboard para guiar al usuario a su primera venta.

## Requirements
- FR-005

## Files to Create
- `packages/app/app/components/dashboard/onboarding-checklist.tsx`

## Files to Modify
- `packages/app/app/routes/_protected.dashboard.tsx` - Integrar componente

## Implementation Details

### 1. Component Interface
```typescript
interface OnboardingChecklistProps {
  hasProducts: boolean;
  hasSales: boolean;
  onDismiss: () => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
  actionLabel: string;
  actionHref: string;
}
```

### 2. Checklist Items
```typescript
const items: ChecklistItem[] = [
  {
    id: 'business_created',
    label: 'Negocio creado',
    completed: true, // Siempre true
    actionLabel: 'Ver',
    actionHref: '/config'
  },
  {
    id: 'first_product',
    label: 'Agregar tu primer producto',
    description: 'Ej: Pollo entero, medio pollo, etc.',
    completed: hasProducts,
    actionLabel: 'Hacer ahora',
    actionHref: '/productos/nuevo'
  },
  {
    id: 'first_sale',
    label: 'Registrar tu primera venta',
    description: 'Empieza a registrar tus ventas diarias',
    completed: hasSales,
    actionLabel: 'Empezar',
    actionHref: '/ventas/nueva'
  }
];
```

### 3. UI Design
```
┌─────────────────────────────────────────┐
│  ¡Bienvenido, Juan!          1/3  [X]  │
│  Completa estos pasos                   │
├─────────────────────────────────────────┤
│  ✅ Negocio creado              Listo   │
├─────────────────────────────────────────┤
│  ② Agregar tu primer producto           │
│    Ej: Pollo entero...                  │
│                      [Hacer ahora]      │
├─────────────────────────────────────────┤
│  ③ Registrar tu primera venta           │
│    Empieza a registrar...               │
│                      [Empezar]          │
└─────────────────────────────────────────┘
```

### 4. State Management
```typescript
// Usar localStorage para "dismiss"
const CHECKLIST_DISMISSED_KEY = 'avileo:onboarding-checklist-dismissed';

const [isDismissed, setIsDismissed] = useState(() => {
  return localStorage.getItem(CHECKLIST_DISMISSED_KEY) === 'true';
});

const handleDismiss = () => {
  localStorage.setItem(CHECKLIST_DISMISSED_KEY, 'true');
  setIsDismissed(true);
};
```

### 5. Integration in Dashboard
```typescript
// En _protected.dashboard.tsx:
const { data: products } = useProducts();
const { data: sales } = useSales({ limit: 1 });

const hasProducts = (products?.length ?? 0) > 0;
const hasSales = (sales?.length ?? 0) > 0;

// Render checklist solo si no está completo
{!allCompleted && !isDismissed && (
  <OnboardingChecklist
    hasProducts={hasProducts}
    hasSales={hasSales}
    onDismiss={() => setIsDismissed(true)}
  />
)}
```

## Validation Checklist
- [ ] Componente muestra 3 items correctamente
- [ ] Item 1 siempre marcado como completado
- [ ] Items 2 y 3 se actualizan según datos reales
- [ ] Barra de progreso muestra X/3 correctamente
- [ ] Botones navegan a las páginas correctas
- [ ] Se puede cerrar con X y no vuelve a aparecer
- [ ] Diseño consistente con UI existente

## Dependencies
- T-003: Onboarding data debe funcionar
- `useProducts` hook (existente)
- `useSales` hook (existente)

## Notes
- Calcular estado en tiempo real, no guardar en DB
- Usar colores: verde para completado, naranja para pendientes
- Animar transiciones cuando se completa un item
