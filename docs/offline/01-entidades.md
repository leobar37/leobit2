# Entidades Offline-First

> Documento de referencia para el sistema offline de Avileo (PollosPro)

## Overview

Este documento lista todas las entidades del sistema y determina cuáles deben soportar funcionalidad offline-first para el flujo del vendedor móvil.

---

## Inventario de Entidades

### 1. Customers (Clientes)

| Aspect | Detalle |
|--------|---------|
| **Tabla DB** | `customers` |
| **Backend** | ✅ `sync_status`, `sync_attempts` |
| **Frontend Collection** | ✅ `customer.collection.ts` |
| **Operaciones** | CRUD completo offline |
| **Estado** | ✅ Implementado |

### 2. Sales (Ventas)

| Aspect | Detalle |
|--------|---------|
| **Tabla DB** | `sales` |
| **Backend** | ✅ `sync_status`, `sync_attempts` |
| **Frontend Collection** | ✅ `sale.collection.ts` |
| **Operaciones** | CRUD completo offline |
| **Estado** | ✅ Implementado |

### 3. SaleItems (Items de Venta)

| Aspect | Detalle |
|--------|---------|
| **Tabla DB** | `sale_items` |
| **Backend** | ⚠️ **SIN** `sync_status`, `sync_attempts` |
| **Frontend Collection** | ✅ `sale-item.collection.ts` |
| **Operaciones** | CRUD completo offline |
| **Estado** | ⚠️ Necesita fix en backend |

### 4. Payments / Abonos (Pagos)

| Aspect | Detalle |
|--------|---------|
| **Tabla DB** | `abonos` |
| **Backend** | ✅ `sync_status`, `sync_attempts` |
| **Frontend Collection** | ✅ `payment.collection.ts` |
| **Operaciones** | CRUD completo offline |
| **Estado** | ✅ Implementado |

### 5. Suppliers (Proveedores)

| Aspect | Detalle |
|--------|---------|
| **Tabla DB** | `suppliers` |
| **Backend** | ✅ `sync_status`, `sync_attempts` |
| **Frontend Collection** | ✅ `supplier.collection.ts` |
| **Operaciones** | CRUD completo offline |
| **Estado** | ✅ Implementado |

### 6. Purchases (Compras)

| Aspect | Detalle |
|--------|---------|
| **Tabla DB** | `purchases` |
| **Backend** | ✅ `sync_status`, `sync_attempts` |
| **Frontend Collection** | ✅ `purchase.collection.ts` |
| **Operaciones** | CRUD completo offline |
| **Estado** | ✅ Implementado |

### 7. PurchaseItems (Items de Compra)

| Aspect | Detalle |
|--------|---------|
| **Tabla DB** | `purchase_items` |
| **Backend** | ✅ `sync_status`, `sync_attempts` |
| **Frontend Collection** | (anidado en purchase) |
| **Operaciones** | CRUD completo offline |
| **Estado** | ✅ Implementado |

### 8. Distribuciones

| Aspect | Detalle |
|--------|---------|
| **Tabla DB** | `distribuciones` |
| **Backend** | ✅ `sync_status`, `sync_attempts` |
| **Frontend Collection** | ✅ `distribucion.collection.ts` |
| **Operaciones** | CRUD completo offline |
| **Estado** | ✅ Implementado |

### 9. DistribucionItems

| Aspect | Detalle |
|--------|---------|
| **Tabla DB** | `distribucion_items` |
| **Backend** | ✅ `sync_status`, `sync_attempts` |
| **Frontend Collection** | (anidado en distribucion) |
| **Operaciones** | CRUD completo offline |
| **Estado** | ✅ Implementado |

### 10. Products (Productos)

| Aspect | Detalle |
|--------|---------|
| **Tabla DB** | `products` |
| **Backend** | ❌ Sin sync (catálogo) |
| **Frontend Collection** | ⚠️ Solo lectura (`product.collection.ts`) |
| **Operaciones** | Read-only cache |
| **Estado** | ⚠️ Solo lectura - no es crítico |

### 11. ProductVariants (Variantes)

| Aspect | Detalle |
|--------|---------|
| **Tabla DB** | `product_variants` |
| **Backend** | ✅ `sync_status`, `sync_attempts` |
| **Frontend Collection** | ❌ Falta |
| **Operaciones** | Solo lectura sin sync |
| **Estado** | ❌ No implementado |

### 12. Closings (Cierres)

| Aspect | Detalle |
|--------|---------|
| **Tabla DB** | `closings` |
| **Backend** | ✅ `sync_status`, `sync_attempts` |
| **Frontend Collection** | ❌ Falta |
| **Operaciones** | Por implementar |
| **Estado** | ❌ No implementado |

---

## Entidades NO Offline

Las siguientes entidades **NO** deben ser offline (solo admin/web):

| Entidad | Razón |
|---------|-------|
| `businesses` | Multi-tenant, solo web admin |
| `business_users` | Staff management, solo admin |
| `user_profiles` | Datos de auth |
| `tags` | Catálogo referencia |
| `customer_tags` | Relación simple |
| `assets` | Galería compartida |
| `files` | Archivos privados |
| `sale_tokens` | Compartir ventas web |
| `system_config` | Config global |
| `staff_invitations` | Invitaciones email |
| `whatsapp_settings` | Solo web admin |
| `whatsapp_templates` | Solo web admin |
| `whatsapp_messages` | Solo web admin |
| `business_payment_settings` | Solo web admin |
| `product_units` | Catálogo solo lectura |
| `sync_operations` | Cola interna backend |

---

## Resumen: Entidades Offline

### ✅ Implementadas (9)

- Customers
- Sales
- SaleItems (frontend ✅, backend ⚠️)
- Payments/Abonos
- Suppliers
- Purchases
- PurchaseItems
- Distribuciones
- DistribucionItems

### ❌ Faltan en Frontend (2)

- Closings - Crear `closing.collection.ts`
- ProductVariants - Crear collection o integrar en product

### ⚠️ Fix Requerido (1)

- SaleItems - Agregar `sync_status` y `sync_attempts` en backend

---

## Próximos Pasos

1. **Alta Prioridad**: Agregar `sync_status` a `sale_items` en backend
2. **Media Prioridad**: Crear `closing.collection.ts` para cierres offline
3. **Baja Prioridad**: Evaluar si `product_variants` necesita collection

---

## Historial

- 2025-03-11: Creado documento
