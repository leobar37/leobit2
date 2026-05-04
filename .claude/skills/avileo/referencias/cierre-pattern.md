# Cierre del Dia Pattern - Patron de Cierre Diario

## Descripcion

Patron para el cierre diario de distribuciones por vendedor. Resume ventas, cobros y rendimiento de la distribucion.

## Componentes

### Backend

#### 1. Distribucion Cierre Items (`packages/backend/src/db/schema/inventory.ts`)

Items reportados por el vendedor al cerrar:

```typescript
interface DistribucionCierreItem {
  distribucionId: UUID;
  variantId: UUID;
  cantidadLlevada: Decimal;    // Cantidad que se llevo
  cantidadVendida: Decimal;    // Cantidad vendida
  cantidadDevuelta: Decimal;   // Cantidad devuelta
  montoVentas: Decimal;        // Monto total de ventas
}
```

#### 2. Distribucion Status

- `activo` - Distribucion en curso
- `cerrado` - Distribucion cerrada
- `en_ruta` - Vendedor en ruta

### Frontend

#### 1. Cierre Route

**Archivo:** `packages/app/app/routes/_protected.cierre.tsx`

#### 2. ToolbarActions

Usa ToolbarActions para el boton de confirmar cierre:
```tsx
<ToolbarActions>
  <Button onClick={handleConfirm} disabled={isPending}>
    {isPending ? "Cerrando..." : "Confirmar Cierre"}
  </Button>
</ToolbarActions>
```

### Flujo Completo

```
1. VENDEDOR ACCEDE A CIERRE
   - Ve resumen del dia:
     |-- Total ventas
     |-- Total cobros
     |-- Balance
     |-- Items de distribucion

2. VENDEDOR REPORTA CIERRE
   - Para cada item de distribucion:
     |-- Cantidad llevada
     |-- Cantidad vendida
     |-- Cantidad devuelta
   - Ingresa nota de cierre (opcional)

3. SISTEMA CALCULA
   - Monto de ventas por item
   - Diferencias (sobrante/faltante)
   - Balance final

4. CONFIRMACION
   - Vendedor confirma cierre
   - Estado de distribucion cambia a "cerrado"
   - Se guarda fecha/hora de cierre
   - Sync al servidor cuando haya conexion
```

## Referencias de Codigo

| Componente | Ruta |
|-----------|------|
| DistribucionCierreItems schema | `packages/backend/src/db/schema/inventory.ts` |
| Cierre route | `packages/app/app/routes/_protected.cierre.tsx` |
| ToolbarActions | `packages/app/app/components/layout/toolbar-actions.tsx` |
| AppLayout | `packages/app/app/components/layout/app-layout.tsx` |

---

*Creado: May 2026*
