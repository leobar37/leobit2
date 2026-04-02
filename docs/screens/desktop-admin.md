# 🖥️ Desktop - Admin

> Pantallas de administración diseñadas para uso en escritorio. Requieren conexión a internet.

---

## 🎯 Características Generales

- **Viewport**: 1024px+ (responsive desde 768px)
- **Navegación**: Sidebar izquierdo fijo
- **Layout**: Grid de múltiples columnas
- **Datos**: En tiempo real (con delay de sync)

---

## Layout Base Desktop

Todas las pantallas desktop comparten el mismo layout base:

```
┌─────────────────────────────────────────────────────────┐
│ 🟧 Avileo    Dashboard            🟢 Online  👤Admin │ ← Header
├──────────┬──────────────────────────────────────────────┤
│ 🏠 Dash  │                                              │
│ 📍 Dist  │          CONTENIDO PRINCIPAL                 │
│ 👥 Users │                                              │
│ 👤 Cli   │           (varía por pantalla)               │
│ 📊 Rep   │                                              │
│ ⚙️  Conf │                                              │
│          │                                              │
│ ─────────┤                                              │
│ 🚪 Logout│                                              │
└──────────┴──────────────────────────────────────────────┘
     ↑                      ↑
   Sidebar (w-56)      Main Content (flex-1)
```

### Sidebar
- **Ancho**: 224px (w-56)
- **Background**: Gray-900
- **Items**: Icono + Label
- **Activo**: Background naranja/20, texto naranja
- **Inactivo**: Texto gris, hover gris/800

### Header
- **Altura**: 56px (h-14)
- **Background**: Gray-900
- **Elementos**: Logo, título, estado conexión, avatar usuario

---

## 1. 🏠 Dashboard Admin

**ID**: `admin-dashboard` | **Offline**: ⚠️ Parcial

### Descripción
Panel de control principal para administradores. Muestra resumen de ventas, vendedores activos y métricas del día.

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ 🟧 Avileo    Dashboard            🟢 Online  👤Admin │
├──────────┬──────────────────────────────────────────────┤
│ 🏠 Dash  │  ┌─────────┬─────────┬─────────┬─────────┐   │
│ 📍 Dist  │  │ S/4,580 │   89    │ S/2,340 │    5    │   │ ← Stats 4-col
│ 👥 Users │  │VentasHoy│  Ventas │PorCobrar│Vendedor │   │
│ 👤 Cli   │  └─────────┴─────────┴─────────┴─────────┘   │
│ 📊 Rep   │                                              │
│ ⚙️  Conf │  ┌─────────────────────┬───────────────────┐ │
│          │  │  Ventas por Hora    │  Últimas Ventas   │ │ ← Charts 2-col
│          │  │                     │                   │ │
│          │  │  ▁▃▅▇▃▅▇██▅▃▁▃▅    │ María G.  S/150   │ │
│          │  │  6am    12pm    6pm │ Juan P.   S/80    │ │
│          │  │                     │ Carmen R. S/200   │ │
│          │  └─────────────────────┴───────────────────┘ │
│          │                                              │
│          │  ┌─────────────────────────────────────────┐ │
│          │  │      Estado de Vendedores               │ │ ← 5-col grid
│          │  │  🟢      🟢      ⚫      🟢      ⚫     │ │
│          │  │ Juan P. María G Pedro R CarmenT Luis M  │ │
│          │  │ 23 ventas 18 v  15 v    20 v   13 v    │ │
│          │  │ S/1,200  S/980   S/850   S/1,100 S/450  │ │
│          │  └─────────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────┘
```

### Stats Cards

| Label | Valor | Color | Icono |
|-------|-------|-------|-------|
| Ventas Hoy | S/ 4,580 | Green | 💵 |
| Total Ventas | 89 | Blue | 🛒 |
| Por Cobrar | S/ 2,340 | Orange | 💳 |
| Vendedores | 5 | Purple | 👥 |

### Gráficos

#### Ventas por Hora
- Tipo: Bar chart
- Eje X: Horas (6am - 6pm)
- Color: Orange-500/50
- Altura: 128px

#### Últimas Ventas
- Lista vertical
- Cliente + Vendedor + Hora
- Monto alineado derecha (verde)

### Estado de Vendedores
- Grid de 5 columnas
- Indicador online/offline (círculo)
- Nombre, # ventas, monto recaudado

---

## 2. 📍 Distribución del Día

**ID**: `admin-distribucion` | **Offline**: ❌ Requiere internet

### Descripción
Gestión de asignación de inventario a vendedores. Solo visible en modo "Inventario Propio".

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ 🟧 Avileo    Distribución         🟢 Online  👤Admin │
├──────────┬──────────────────────────────────────────────┤
│ 🏠 Dash  │  ┌─────────────────────────────────────────┐ │
│ 📍 Dist✓ │  │ Inventario Disponible Hoy               │ │ ← Header card
│ 👥 Users │  │         250 kg            Asignado: 200 │ │
│ 👤 Cli   │  │ [████████████████████░░░░░░░░░░] 80%    │ │
│ 📊 Rep   │  └─────────────────────────────────────────┘ │
│ ⚙️  Conf │                                              │
│          │  ┌─────────────────────────────────────────┐ │
│          │  │ Asignaciones de Hoy        [+ Nueva]    │ │
│          │  ├─────────────────────────────────────────┤ │
│          │  │ Vendedor   Punto      Asign  Vendido Estado│
│          │  │ ───────────────────────────────────────── │
│          │  │ 🟢 Juan P.  Carro A    50kg   32kg En ruta│ │ ← Tabla
│          │  │ 🟢 María G. Casa       40kg   40kg Cerrado│ │
│          │  │ ⚫ Pedro R. Local      60kg    0kgPendiente│ │
│          │  │ 🟢 CarmenT  Carro B    50kg   45kg En ruta│ │
│          │  │ ⚫ Luis M.  Casa       50kg    0kgPendiente│ │
│          │  └─────────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────┘
```

### Header Card
- Inventario total disponible
- Progreso de asignación (80%)
- Color: Naranja transparente

### Tabla de Distribución

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| Vendedor | Nombre + indicador online | 🟢 Juan P. |
| Punto de Venta | Ubicación | Carro A |
| Asignado | Kilos asignados | 50kg |
| Vendido | Kilos vendidos | 32kg |
| Estado | Badge de estado | En ruta |

### Estados
- 🟢 **En ruta**: Vendedor activo vendiendo
- 🔵 **Cerrado**: Vendedor completó su asignación
- ⚫ **Pendiente**: Aún no empieza

### Acciones
- **+ Nueva Asignación**: Botón naranja, abre modal
- **Editar**: Icono lápiz por fila
- **Cerrar**: Finalizar distribución de vendedor

---

## 3. 👥 Gestión de Usuarios

**ID**: `admin-usuarios` | **Offline**: ❌ Requiere internet

### Descripción
CRUD de usuarios del sistema. Admin puede crear vendedores y otros admins.

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ 🟧 Avileo    Usuarios             🟢 Online  👤Admin │
├──────────┬──────────────────────────────────────────────┤
│ 🏠 Dash  │  ┌─────────────────────────────────────────┐ │
│ 📍 Dist  │  │ [+ Nuevo Usuario]  [🔍 Buscar...]       │ │ ← Acciones
│ 👥 Users✓│  └─────────────────────────────────────────┘ │
│ 👤 Cli   │                                              │
│ 📊 Rep   │  ┌─────────────────────────────────────────┐ │
│ ⚙️  Conf │  │ Nombre      Rol        Estado   Acciones│ │
│          │  │ ─────────────────────────────────────── │
│          │  │ Admin Prin  🟧ADMIN      🟢Activo  ✎ ✕ │ │ ← Tabla
│          │  │ Juan Vend.  🔵VENDEDOR   🟢Activo  ✎ ✕ │ │
│          │  │ Pedro Vend. 🔵VENDEDOR   ⚫Inactivo ✎ ✕ │ │
│          │  │ María Vend. 🔵VENDEDOR   🟢Activo  ✎ ✕ │ │
│          │  │ Carmen Vend.🔵VENDEDOR   🟢Activo  ✎ ✕ │ │
│          │  └─────────────────────────────────────────┘ │
│          │                                              │
│          │  ┌─────────────────────────────────────────┐ │
│          │  │ Permisos por Rol                        │ │
│          │  │ ─────────────────────────────────────── │ │
│          │  │ 🟧 ADMIN    Todo el sistema             │ │
│          │  │ 🔵 VENDEDOR Ventas, Clientes, Catálogo  │ │
│          │  └─────────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────┘
```

### Tabla de Usuarios

| Columna | Descripción |
|---------|-------------|
| Nombre | Nombre completo del usuario |
| Rol | Badge ADMIN (naranja) o VENDEDOR (azul) |
| Estado | Activo/Inactivo con indicador |
| Acciones | Editar ✎ / Eliminar ✕ |

### Roles y Permisos

| Rol | Color | Permisos |
|-----|-------|----------|
| **ADMIN** | 🟧 Naranja | Todo el sistema |
| **VENDEDOR** | 🔵 Azul | Ventas, Clientes, Calculadora, Catálogo |

---

## 4. ➕ Nuevo Usuario

**ID**: `admin-nuevo-usuario` | **Offline**: ❌ Requiere internet

### Descripción
Formulario para crear nuevos usuarios (vendedores o admins). Genera contraseña automática.

### Layout (Modal)
```
┌─────────────────────────────────────┐
│  ✕  Nuevo Usuario                   │
├─────────────────────────────────────┤
│                                     │
│  Nombre completo                    │
│  [                              ]   │
│                                     │
│  DNI                                │
│  [                              ]   │
│                                     │
│  Email                              │
│  [                              ]   │
│                                     │
│  Teléfono                           │
│  [                              ]   │
│                                     │
│  Rol                          ▼     │
│  [Vendedor                    ]     │
│                                     │
│  Punto de venta (opcional)          │
│  [Ej: Carro A, Casa, Local    ]     │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ ℹ️  La contraseña se generará    ││
│  │    automáticamente y se enviará  ││
│  │    por email al usuario          ││
│  └─────────────────────────────────┘│
│                                     │
│     [Cancelar]  [Crear Usuario]     │
│                                     │
└─────────────────────────────────────┘
```

### Campos

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| Nombre | Sí | Nombre completo |
| DNI | Sí | Documento de identidad |
| Email | Sí | Para enviar credenciales |
| Teléfono | No | Contacto |
| Rol | Sí | ADMIN o VENDEDOR |
| Punto de venta | No | Ubicación de venta |

### Proceso Post-Creación
1. Sistema genera contraseña segura
2. Envía email con credenciales
3. Usuario debe cambiar contraseña en primer login

---

## 5. 📊 Reportes

**ID**: `admin-reportes` | **Offline**: ⚠️ Parcial

### Descripción
Visualización de reportes y estadísticas. Funciona con datos ya sincronizados.

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ 🟧 Avileo    Reportes             🟢 Online  👤Admin │
├──────────┬──────────────────────────────────────────────┤
│ 🏠 Dash  │  ┌─────────────────┐ ┌─────────────────┐     │
│ 📍 Dist  │  │ Desde           │ │ Hasta           │     │ ← Filtros
│ 👥 Users │  │ [01/01/2024  ]  │ │ [31/01/2024  ]  │     │
│ 👤 Cli   │  └─────────────────┘ └─────────────────┘     │
│ 📊 Rep✓  │                                              │
│ ⚙️  Conf │  ┌─────────────────┐ ┌─────────────────┐     │
│          │  │                 │ │                 │     │
│          │  │   S/ 45,230     │ │    S/ 12,450    │     │ ← Stats
│          │  │  Total Ventas   │ │    Ganancia     │     │
│          │  │                 │ │                 │     │
│          │  └─────────────────┘ └─────────────────┘     │
│          │                                              │
│          │  ┌─────────────────────────────────────────┐ │
│          │  │ Ventas vs Compras                       │ │
│          │  │                                         │ │
│          │  │  Ventas  ████████████████████           │ │
│          │  │  Compras ██████████                     │ │
│          │  │                                         │ │
│          │  └─────────────────────────────────────────┘ │
│          │                                              │
│          │  ┌─────────────────────────────────────────┐ │
│          │  │ Top Clientes                            │ │
│          │  │ 1. María G. ─────────────── S/ 3,450    │ │
│          │  │ 2. Juan P.  ──────────── S/ 2,800       │ │
│          │  │ 3. Carmen R. ──────────── S/ 2,100      │ │
│          │  └─────────────────────────────────────────┘ │
│          │                                              │
│          │  [     📥 Exportar Excel     ]               │
└──────────┴──────────────────────────────────────────────┘
```

### Filtros
- **Fecha inicio**: Date picker
- **Fecha fin**: Date picker

### Reportes Disponibles

| Reporte | Tipo | Descripción |
|---------|------|-------------|
| Total Ventas | Número grande | Suma de ventas en período |
| Ganancia | Número grande | Ventas - Compras |
| Ventas vs Compras | Bar chart | Comparación visual |
| Top Clientes | Lista ordenada | Clientes por volumen |

### Exportación
- **Formato**: Excel (.xlsx)
- **Botón**: Naranja, icono descarga

---

## 6. 👤 Clientes Admin

**ID**: `admin-clientes` | **Offline**: ⚠️ Parcial

### Descripción
Vista global de todos los clientes del sistema. Incluye deudas totales y historial completo.

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ 🟧 Avileo    Clientes             🟢 Online  👤Admin │
├──────────┬──────────────────────────────────────────────┤
│ 🏠 Dash  │  ┌─────────────────────────────────────────┐ │
│ 📍 Dist  │  │ [🔍 Buscar cliente...] [Filtros ▼]      │ │
│ 👥 Users │  └─────────────────────────────────────────┘ │
│ 👤 Cli✓  │                                              │
│ 📊 Rep   │  ┌─────────────────────────────────────────┐ │
│ ⚙️  Conf │  │ Total Clientes: 47    Deuda Total: S/8,450│ │ ← Stats
│          │  └─────────────────────────────────────────┘ │
│          │                                              │
│          │  ┌─────────────────────────────────────────┐ │
│          │  │ 👤 María González        Debe: S/ 450   │ │
│          │  │    DNI: 45678912 | 📞 987654321         │ │ ← Lista
│          │  │    📍 Av. Los Pollos 123                │ │
│          │  │    Última compra: 15/01/2024            │ │
│          │  │    [Ver historial] [Registrar abono]    │ │
│          │  ├─────────────────────────────────────────┤ │
│          │  │ 👤 Juan Pérez           Al día ✓        │ │
│          │  │    DNI: 12345678 | 📞 912345678         │ │
│          │  │    📍 Jr. Las Gallinas 456              │ │
│          │  │    [Ver historial] [Nueva venta]        │ │
│          │  └─────────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────┘
```

### Filtros
- Buscar por nombre o DNI
- Filtro por estado: Todos, Con deuda, Al día

### Card de Cliente
- Avatar con inicial
- Nombre + DNI + Teléfono
- Dirección
- Deuda (rojo) o Al día (verde)
- Última compra
- Acciones: Ver historial / Registrar abono / Nueva venta

---

## 7. ⚙️ Configuración

**ID**: `admin-config` | **Offline**: ❌ Requiere internet

### Descripción
Configuración del sistema: modo de operación, precios, parámetros generales.

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ 🟧 Avileo    Configuración        🟢 Online  👤Admin │
├──────────┬──────────────────────────────────────────────┤
│ 🏠 Dash  │  ┌─────────────────────────────────────────┐ │
│ 📍 Dist  │  │ ⚙️ Configuración General                │ │
│ 👥 Users │  └─────────────────────────────────────────┘ │
│ 👤 Cli   │                                              │
│ 📊 Rep   │  Modo de Operación                    ▼     │
│ ⚙️  Conf✓│  [Inventario Propio             ]           │
│          │                                              │
│          │  ☑ Control de kilos                         │
│          │    Activar control de stock de pollo         │
│          │                                              │
│          │  ☑ Usar distribución                        │
│          │    Asignar kilos a vendedores                │
│          │                                              │
│          │  ☑ Permitir venta sin stock                 │
│          │    Vendedores pueden vender sin asignación   │
│          │                                              │
│          │  ─────────────────────────────────────────── │
│          │                                              │
│          │  Precio por defecto (kg)                    │
│          │  [12.00                                    ]│
│          │                                              │
│          │  ─────────────────────────────────────────── │
│          │                                              │
│          │  Moneda                                   ▼ │
│          │  [PEN - S/ Soles Peruanos          ]        │
│          │                                              │
│          │  ─────────────────────────────────────────── │
│          │                                              │
│          │  Zona horaria                             ▼ │
│          │  [America/Lima                     ]        │
│          │                                              │
│          │                                              │
│          │  [     💾 Guardar Cambios      ]            │
└──────────┴──────────────────────────────────────────────┘
```

### Configuraciones

#### Modo de Operación
- **Inventario Propio**: Control completo de stock
- **Sin Inventario**: Solo registro de ventas
- **Pedidos**: Sistema de pre-venta
- **Mixto**: Combinación de modos

#### Toggles
- ☑ Control de kilos
- ☑ Usar distribución
- ☑ Permitir venta sin stock

#### Parámetros
- Precio por kg (default)
- Moneda
- Zona horaria

---

## 🔄 Estados de Conexión

Las pantallas desktop muestran estos estados:

| Icono | Texto | Significado |
|-------|-------|-------------|
| 🟢 | "Online" | Conectado, datos en tiempo real |
| 🟡 | "Sincronizando..." | Hay operaciones pendientes |
| 🔴 | "Offline" | Sin conexión, funcionalidad limitada |

### Funcionalidad Offline
- ✅ Dashboard: Muestra últimos datos cacheados
- ❌ Distribución: No disponible
- ❌ Usuarios: No disponible
- ⚠️ Reportes: Solo datos ya sincronizados
- ❌ Configuración: No disponible

---

## 📐 Responsive Breakpoints

| Breakpoint | Ancho | Layout |
|------------|-------|--------|
| Desktop | 1280px+ | Sidebar fijo + 4-col grids |
| Laptop | 1024px | Sidebar fijo + 3-col grids |
| Tablet | 768px | Sidebar colapsable + 2-col grids |
| Mobile | <768px | Bottom nav (ver mobile-vendedor.md) |

---

*Documentación de pantallas desktop - Avileo v1.0*
