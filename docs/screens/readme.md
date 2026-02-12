# 📱 UI Screens - PollosPro

> Documentación completa de las pantallas de la aplicación PollosPro

---

## 🎯 Resumen

PollosPro es una aplicación **mobile-first** diseñada principalmente para vendedores que trabajan en campo, complementada con un panel de administración desktop. La UI está optimizada para operación offline y sincronización cuando hay conectividad.

---

## 📁 Estructura de Documentación

| Archivo | Descripción |
|---------|-------------|
| [mobile-vendedor.md](./mobile-vendedor.md) | Pantallas mobile para vendedores (12 pantallas) |
| [desktop-admin.md](./desktop-admin.md) | Pantallas desktop para administradores (7 pantallas) |
| [componentes-ui.md](./componentes-ui.md) | Sistema de diseño y componentes reutilizables |
| [flujos-navegacion.md](./flujos-navegacion.md) | Flujos de usuario y navegación entre pantallas |

---

## 📊 Resumen de Pantallas

### Mobile (Vendedor) - 12 Pantallas

| # | Pantalla | Offline | Propósito Principal |
|---|----------|---------|---------------------|
| 1 | **Login** | ❌ Requiere internet | Autenticación del vendedor |
| 2 | **Dashboard (Con Inv.)** | ✅ 100% | Vista con control de inventario |
| 3 | **Dashboard (Sin Inv.)** | ✅ 100% | Vista modo libre (sin stock) |
| 4 | **Calculadora** | ✅ 100% | Cálculo de precios con tara |
| 5 | **Nueva Venta** | ✅ 100% | Registro completo de venta |
| 6 | **Clientes** | ✅ 100% | Gestión de cuentas por cobrar |
| 7 | **Nuevo Cliente** | ✅ 100% | Formulario de registro |
| 8 | **Registrar Abono** | ✅ 100% | Pago de deuda sin compra |
| 9 | **Historial Ventas** | ✅ 100% | Ventas del día/vendedor |
| 10 | **Cierre del Día** | ✅ 100% | Resumen y cierre de jornada |
| 11 | **Catálogo** | ✅ 100% | Productos para pedidos |
| 12 | **Estado Sync** | ✅ 100% | Estado de sincronización |

### Desktop (Admin) - 7 Pantallas

| # | Pantalla | Offline | Propósito Principal |
|---|----------|---------|---------------------|
| 1 | **Dashboard Admin** | ⚠️ Parcial | Panel de administración |
| 2 | **Distribución** | ❌ Requiere internet | Asignación a vendedores |
| 3 | **Usuarios** | ❌ Requiere internet | Gestión de vendedores |
| 4 | **Nuevo Usuario** | ❌ Requiere internet | Crear vendedor/admin |
| 5 | **Reportes** | ⚠️ Parcial | Estadísticas y análisis |
| 6 | **Clientes Admin** | ⚠️ Parcial | Vista global de clientes |
| 7 | **Configuración** | ❌ Requiere internet | Config del sistema |

---

## 🎨 Principios de Diseño

### Mobile-First
- Diseño optimizado para pantallas de 320px-428px
- Touch targets mínimos de 44x44px
- Navegación por bottom tab bar
- Gestos intuitivos (swipe, tap)

### Offline-First
- UI funciona sin conexión
- Estados de sync visibles
- Indicadores de operaciones pendientes
- Feedback inmediato de acciones

### Accesibilidad
- Contraste mínimo 4.5:1
- Labels claros en formularios
- Estados de error visibles
- Soporte para screen readers

---

## 🔄 Modos de Operación

El sistema soporta 2 modos que afectan la UI:

### Modo Inventario Propio
- Dashboard muestra **asignación de kilos**
- Nueva Venta valida **stock disponible**
- Muestra pantalla de **Distribución**

### Modo Libre (Sin Inventario)
- Dashboard muestra solo **resumen de ventas**
- Nueva Venta **sin validación de stock**
- Oculta pantalla de **Distribución**

---

## 🔗 Enlaces Relacionados

- [Módulos del Sistema](../technical/readme.md#módulos-del-sistema)
- [Wireframes Interactivos](../app/src/sections/Wireframes.tsx)
- [Mockups Visuales](../app/src/sections/Screens.tsx)
- [Development Guide](../development/readme.md)

---

*Documentación de UI - PollosPro v1.0*
