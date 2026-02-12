# 📋 Overview - Flujos de Usuario y Estado de Implementación

> Documento unificado: Comparación entre diseño documentado y código implementado.

---

## 📱 Mobile (Vendedor) - Pantallas

| # | Pantalla | Docs ID | Ruta Docs | Ruta Código | Estado |
|---|----------|---------|-----------|-------------|--------|
| 1 | Login | `login` | ✅ | `/login` | ✅ Implementado |
| 2 | Dashboard (Con Inv.) | `dashboard-vendedor` | ✅ | `/dashboard` | ✅ Implementado |
| 3 | Dashboard (Sin Inv.) | `dashboard-vendedor-libre` | ✅ | - | ❌ Pendiente |
| 4 | Calculadora | `calculadora` | ✅ | - | ❌ Pendiente |
| 5 | Nueva Venta | `nueva-venta` | ✅ | `/ventas/nueva` | ✅ Implementado |
| 6 | Clientes | `clientes` | ✅ | `/clientes` | ✅ Implementado |
| 7 | Nuevo Cliente | `nuevo-cliente` | ✅ | `/clientes/nuevo` | ✅ Implementado |
| 8 | Registrar Abono | `registrar-abono` | ✅ | - | ❌ Pendiente |
| 9 | Historial Ventas | `historial-ventas` | ✅ | `/ventas` | ✅ Implementado |
| 10 | Cierre del Día | `cierre-dia` | ✅ | - | ❌ Pendiente |
| 11 | Catálogo | `catalogo` | ✅ | `/productos` | ⚠️ Parcial |
| 12 | Estado Sync | `sync-status` | ✅ | - | ❌ Pendiente |

---

## 🖥️ Desktop (Admin) - Pantallas

| # | Pantalla | Docs ID | Ruta Docs | Ruta Código | Estado |
|---|----------|---------|-----------|-------------|--------|
| 1 | Dashboard Admin | `admin-dashboard` | ✅ | `/dashboard` | ✅ Implementado |
| 2 | Distribución | `admin-distribucion` | ✅ | `/distribuciones` | ✅ Implementado |
| 3 | Usuarios | `admin-usuarios` | ✅ | - | ❌ Pendiente |
| 4 | Nuevo Usuario | `admin-nuevo-usuario` | ✅ | `/business/create` | ⚠️ Parcial |
| 5 | Reportes | `admin-reportes` | ✅ | - | ❌ Pendiente |
| 6 | Clientes Admin | `admin-clientes` | ✅ | `/clientes` | ✅ Implementado |
| 7 | Configuración | `admin-config` | ✅ | `/profile` | ⚠️ Parcial |

---

## 🔄 Flujos de Navegación

### Mobile - Estructura de Navegación

```
                    ┌─────────────┐
                    │    Login    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Dashboard  │
                    └──────┬──────┘
                           │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
    │ 🧮 Calc │       │ 🛒 Venta│       │ 👥 Cli  │
    └────┬────┘       └────┬────┘       └────┬────┘
         │                  │                  │
         │             ┌────▼────┐       ┌────▼────┐
         │             │Confirmar│       │Nuevo Cli│
         │             └─────────┘       └────┬────┘
         │                                    │
         │                               ┌────▼────┐
         │                               │Abono    │
         │                               └─────────┘
         │
    ┌────▼──────────────────────────────────────────┐
    │                  📋 Historial                 │
    └───────────────────────────────────────────────┘
```

### Desktop - Estructura de Navegación

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER                               │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│  🏠 Dash │  ┌────────────────────────────────────────┐  │
│  📍 Dist │  │           MAIN CONTENT                 │  │
│  👥 Users│  │                                        │  │
│  👤 Cli  │  │    (Dashboard/Dist/Users/Reports)      │  │
│  📊 Rep  │  │                                        │  │
│  ⚙️ Conf │  └────────────────────────────────────────┘  │
│          │                                              │
│  🚪 Logout                                             │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

---

## 🎯 Flujos Principales

### 1. 🔐 Autenticación

```
Login → Dashboard (JWT cache 24-48h)
```

- **Ruta implementada**: `/login` → `/dashboard`
- **Estado**: ✅ Completo

---

### 2. 🛒 Venta Completa

```
Dashboard → Nueva Venta → [Seleccionar Cliente] → Agregar Productos → 
Tipo Pago → Confirmar → Dashboard
```

**Pasos:**
1. Dashboard → [+] Nueva Venta
2. Seleccionar cliente (opcional)
3. Agregar productos
4. Seleccionar tipo de pago (contado/crédito)
5. Confirmar venta
6. Retorno a Dashboard

- **Rutas implementadas**: 
  - Dashboard: ✅ `/dashboard`
  - Nueva Venta: ✅ `/ventas/nueva`
  - Historial Ventas: ✅ `/ventas`
- **Estado**: ✅ Implementado

---

### 3. 💵 Abono (Pago de Deuda)

```
Clientes → Seleccionar Cliente → Registrar Abono → Confirmar → Clientes
```

- **Rutas implementadas**: 
  - Clientes: ✅ `/clientes`
  - Registrar Abono: ❌ Pendiente
- **Estado**: ⚠️ Parcial

---

### 4. 🧮 Calculadora

```
Dashboard → Calculadora → [Usar en Venta] → Nueva Venta
```

- **Fórmulas:**
  - Kilos Netos = Kilos Brutos - Tara
  - Monto Total = Kilos Netos × Precio/kg

- **Estado**: ❌ Pendiente

---

### 5. 📍 Distribución (Admin)

```
Dashboard → Distribución → [Nueva Asignación] → Monitorear
```

- **Rutas implementadas**: 
  - Distribuciones: ✅ `/distribuciones`
  - Mi Distribución: ✅ `/mi-distribucion`
- **Estado**: ✅ Parcialmente implementado

---

### 6. 👥 Gestión de Usuarios (Admin)

```
Sidebar → Usuarios → [Nuevo Usuario] → Crear
```

- **Rutas implementadas**: 
  - Nuevo Usuario: ⚠️ `/business/create` (solo para creación de negocio)
- **Estado**: ❌ Pendiente

---

### 7. 🔄 Sync Offline/Online

```
Operación offline → IndexedDB → Cola de sync → 
[Online] → Sync automático cada 30s
```

- **Estado**: ⚠️ Parcial (componente sync-status existente)

---

## 📊 Resumen de Implementación

### Por Tipo

| Tipo | Total Docs | Implementado | Parcial | Pendiente |
|------|------------|--------------|---------|-----------|
| Mobile | 12 | 5 | 0 | 7 |
| Desktop | 7 | 3 | 3 | 1 |
| **Total** | **19** | **8** | **3** | **8** |

### Porcentaje de Avance

```
Implementado:  8/19 = 42.1%
Parcial:      3/19 = 15.8%
Pendiente:    8/19 = 42.1%
```

---

## 🎨 Rutas Actuales del Código

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `_index.tsx` | Landing/Index |
| `/login` | `login.tsx` | Login |
| `/register` | `register.tsx` | Registro |
| `/dashboard` | `_protected.dashboard.tsx` | Dashboard |
| `/ventas` | `_protected.ventas.tsx` | Historial de Ventas |
| `/ventas/nueva` | `_protected.ventas.nueva.tsx` | Nueva Venta |
| `/ventas/:id` | `_protected.ventas.$id.tsx` | Detalle de Venta |
| `/clientes` | `_protected.clientes.tsx` | Clientes |
| `/clientes/nuevo` | `_protected.clientes.nuevo.tsx` | Nuevo Cliente |
| `/productos` | `_protected.productos.tsx` | Productos/Catálogo |
| `/distribuciones` | `_protected.distribuciones.tsx` | Distribución Admin |
| `/mi-distribucion` | `_protected.mi-distribucion.tsx` | Mi Distribución |
| `/invitations` | `_protected.invitations.tsx` | Invitaciones |
| `/business/create` | `_protected.business.create.tsx` | Crear Negocio |
| `/business/edit` | `_protected.business.edit.tsx` | Editar Negocio |
| `/profile` | `_protected.profile.tsx` | Perfil/Configuración |

---

## 🆕 Componentes Nuevos (v2025-02)

| Componente | Ruta | Propósito |
|------------|------|-----------|
| `sale-card.tsx` | `components/sales/` | Card para lista de ventas |
| `sale-cart-item.tsx` | `components/sales/` | Item del carrito de venta |
| `customer-search.tsx` | `components/sales/` | Búsqueda de clientes en ventas |
| `sync-status.tsx` | `components/sync/` | Estado de sincronización |

---

## 🆕 Hooks Nuevos (v2025-02)

| Hook | Propósito |
|------|-----------|
| `use-sales.ts` | Gestión de ventas (listar, crear, detalle) |

---

## 🔗 Navegación Directa (Deep Links)

| Pantalla | Docs URL | Ruta Código |
|----------|----------|-------------|
| Login | `/login` | ✅ `/login` |
| Dashboard | `/dashboard` | ✅ `/dashboard` |
| Calculadora | `/calculadora` | ❌ Pendiente |
| Nueva Venta | `/ventas/nueva` | ✅ `/ventas/nueva` |
| Clientes | `/clientes` | ✅ `/clientes` |
| Historial | `/ventas` | ✅ `/ventas` |
| Cierre | `/cierre` | ❌ Pendiente |
| Sync | `/sync` | ❌ Pendiente |

---

## 📝 Notas

1. **Offline-first**: El documento de diseño especifica operación 100% offline para mobile. La implementación actual usa ElectricSQL para sincronización.

2. **Modos de operación**: El sistema debe soportar "Inventario Propio" y "Modo Libre". Esta lógica aún no está implementada.

3. **JWT**: El token se cachea 24-48h según docs. Verificar implementación actual de auth.

---

*Documento generado para comparación docs vs código - PollosPro*
