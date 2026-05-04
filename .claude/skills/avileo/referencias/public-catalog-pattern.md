# Public Catalog Pattern - Patron de Catalogo Publico

## Descripcion

Patron para el catalogo publico de ventas que permite a los clientes ver productos y realizar pre-ordenes sin autenticacion.

## Componentes

### Backend

#### 1. Sale Tokens (`packages/backend/src/db/schema/sale-tokens.ts`)

Tokens de acceso para compartir ventas (pre-orders) con clientes.

**Caracteristicas:**
- Token de 12 caracteres URL-safe
- Un token por venta (unique)
- Expira despues de 7 dias
- Tracking de ultimo uso

#### 2. Public Catalog API

Endpoints publicos (sin auth):
- `GET /venta/:slug` - Obtener catalogo publico del negocio
- `POST /venta/:slug/orden` - Crear pre-orden
- `GET /venta/:token` - Ver venta compartida por token

### Frontend

#### 1. Public Catalog Routes

**Archivos:**
- `packages/app/app/routes/venta.$slug._index.tsx` - Catalogo publico
- `packages/app/app/routes/venta.$slug.detalle.tsx` - Detalle de producto

#### 2. Business Configuration

En `businesses.ts`:
```typescript
publicCatalogEnabled: boolean  // Habilitar catalogo
publicCatalogSlug: string      // URL slug (ej: "mi-negocio")
```

### Flujo Completo

```
1. ADMIN HABILITA CATALOGO
   - Configura publicCatalogEnabled = true
   - Establece publicCatalogSlug = "mi-negocio"

2. CLIENTE ACCEDE AL CATALOGO
   - Visita /venta/mi-negocio
   - Ve productos con variantes y precios
   - Selecciona items

3. CLIENTE REALIZA PRE-ORDEN
   - Ingresa datos de contacto
   - Selecciona metodo de pago
   - Confirma pre-orden

4. SISTEMA CREA VENTA
   - Tipo: pre_order
   - Estado: draft
   - Genera sale_token
   - Notifica al negocio

5. NEGOCIO PROCESA PEDIDO
   - Admin ve pre-orden en dashboard
   - Confirma o modifica
   - Cambia estado a confirmed -> delivered
```

## Referencias de Codigo

| Componente | Ruta |
|-----------|------|
| SaleTokens schema | `packages/backend/src/db/schema/sale-tokens.ts` |
| Public catalog route | `packages/app/app/routes/venta.$slug._index.tsx` |
| Public catalog detail | `packages/app/app/routes/venta.$slug.detalle.tsx` |
| Businesses schema | `packages/backend/src/db/schema/businesses.ts` |
| Sales schema | `packages/backend/src/db/schema/sales.ts` |

---

*Creado: May 2026*
