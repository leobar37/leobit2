# ToolbarActions

Componente para renderizar acciones en una barra fija en la parte inferior de la pantalla (sobre el bottom navigation).

## Propósito

Permite que cualquier ruta añada acciones que aparecen en una barra inferior fija, sin necesidad de pasar props a través de la jerarquía. Usa el patrón **React Portal** + **Context API**.

## Cómo Funciona

1. **AppLayout** crea un portal host en la barra de navegación inferior (`app-layout.tsx:103-104, 212-217`)
2. **useLayout** hook proporciona acceso al `toolbarPortalHost` desde el contexto
3. **ToolbarActions** renderiza sus children en un portal dentro del bottom nav

## Uso en Rutas

```tsx
import { ToolbarActions } from "~/components/layout/toolbar-actions";

export default function MiPagina() {
  return (
    <div>
      {/* contenido de la página */}
      
      <ToolbarActions>
        <Button>Guardar</Button>
        <Button>Cancelar</Button>
      </ToolbarActions>
    </div>
  );
}
```

## Componente

**Archivo:** `packages/app/app/components/layout/toolbar-actions.tsx`

```tsx
interface ToolbarActionsProps {
  children: ReactNode;
  className?: string;
}

export function ToolbarActions({ children, className }: ToolbarActionsProps) {
  const { toolbarPortalHost } = useLayout();

  if (!toolbarPortalHost) return null;

  return createPortal(
    <div className={cn(
      "pointer-events-auto w-full bg-white/95 backdrop-blur-xl border-t border-gray-200",
      className
    )}>
      <div className="max-w-lg mx-auto">
        {children}
      </div>
    </div>,
    toolbarPortalHost
  );
}
```

## Portal Host (AppLayout)

**Archivo:** `packages/app/app/components/layout/app-layout.tsx`

```tsx
// State para el portal
const [toolbarPortalHost, setToolbarPortalHost] = useState<HTMLDivElement | null>(null);

// Portal host en el bottom nav
<div 
  ref={setToolbarPortalHost}
  className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-50 pointer-events-none"
>
```

## Hook

```tsx
import { useLayout } from "~/components/layout/app-layout";

const { toolbarPortalHost } = useLayout();
```

## Ejemplo Real

**Archivo:** `packages/app/app/routes/_protected.cierre.tsx`

```tsx
<ToolbarActions>
  <Button 
    onClick={handleConfirm}
    disabled={isPending}
    className="flex-1"
  >
    {isPending ? "Cerrando..." : "Confirmar Cierre"}
  </Button>
</ToolbarActions>
```

## Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `app/components/layout/toolbar-actions.tsx` | Componente ToolbarActions |
| `app/components/layout/app-layout.tsx` | Layout con portal host |
| `app/routes/_protected.cierre.tsx` | Ejemplo de uso |
