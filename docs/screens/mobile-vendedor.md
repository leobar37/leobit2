# 📱 Mobile - Vendedor

> Pantallas diseñadas para vendedores que operan en campo. Todas funcionan 100% offline.

---

## 🎯 Características Generales

- **Viewport**: 320px - 428px (mobile)
- **Navegación**: Bottom tab bar (4 items)
- **Estado offline**: Indicadores visuales constantes
- **Touch targets**: Mínimo 44x44px

---

## 1. 🔐 Login

**ID**: `login` | **Offline**: ❌ Requiere internet

### Descripción
Pantalla de autenticación para vendedores. Es la única pantalla que requiere internet obligatoriamente (la primera vez).

### Layout
```
┌─────────────────────┐
│      9:41           │  ← Status Bar
├─────────────────────┤
│                     │
│    ┌─────────┐      │  ← Logo App
│    │    P    │      │
│    └─────────┘      │
│                     │
│   Avileo         │  ← Título
│   Sistema de Ventas │  ← Subtítulo
│                     │
│   ┌───────────────┐ │
│   │ Usuario       │ │  ← Input Email
│   └───────────────┘ │
│                     │
│   ┌───────────────┐ │
│   │ Contraseña    │ │  ← Input Password
│   └───────────────┘ │
│                     │
│   ┌───────────────┐ │
│   │ INICIAR       │ │  ← Botón Principal
│   │   SESIÓN      │ │
│   └───────────────┘ │
│                     │
│ Token válido 24-48h │  ← Nota
└─────────────────────┘
```

### Elementos UI

| Elemento | Tipo | Descripción |
|----------|------|-------------|
| Logo | Icono | "P" en gradiente orange-amber |
| Usuario | Input email | `vendedor@pollospro.com` |
| Contraseña | Input password | Máscara `••••••••` |
| Login | Button | Fondo naranja, texto blanco |

### Estados
- **Cargando**: Spinner en botón, inputs deshabilitados
- **Error**: Mensaje rojo debajo de inputs
- **Éxito**: Transición a Dashboard

---

## 2. 🏠 Dashboard (Con Inventario)

**ID**: `dashboard-vendedor` | **Offline**: ✅ 100%

### Descripción
Pantalla principal del vendedor cuando el sistema opera con control de inventario. Muestra asignación del día y accesos rápidos.

### Layout
```
┌─────────────────────┐
│ 9:41    ↻ Offline(3)│  ← Status + Sync
├─────────────────────┤
│ ⟲ Mi Día        🔄  │  ← Header + Sync btn
├─────────────────────┤
│ [Con Inv] [Sin Inv] │  ← Toggle modo (demo)
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Mi Asignación   │ │  ← Card Asignación
│ │ 🏷️ Hoy          │ │
│ │     45 kg       │ │
│ │ Vendido: 32 kg  │ │
│ │ [███████░░] 71% │ │  ← Progress bar
│ │ Punto: Carro A  │ │
│ └─────────────────┘ │
├─────────────────────┤
│ ┌──────┐ ┌──────┐   │
│ │  🧮  │ │  🛒  │   │  ← Grid 2x2
│ │ Calc │ │Venta │   │
│ └──────┘ └──────┘   │
│ ┌──────┐ ┌──────┐   │
│ │  👥  │ │  📋  │   │
│ │Client│ │Hist  │   │
│ └──────┘ └──────┘   │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ 📡 Offline      │ │  ← Estado offline
│ │ 3 operaciones   │ │
│ │       [Sync]    │ │
│ └─────────────────┘ │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Resumen del Día │ │
│ │ S/480  8  S/120 │ │  ← Stats: Ventas, #, Crédito
│ └─────────────────┘ │
├─────────────────────┤
│ 🏠   🧮   👥   📋   │  ← Bottom Nav
└─────────────────────┘
```

### Componentes

#### Card Asignación
- **Background**: Orange-500/10 (transparente naranja)
- **Border**: Orange-500/30
- **Kilos**: Número grande (3xl), blanco
- **Progress bar**: Naranja, altura 8px

#### Grid Accesos Rápidos
| Icono | Color | Acción |
|-------|-------|--------|
| 🧮 | Blue-500 | Ir a Calculadora |
| 🛒 | Green-500 | Nueva Venta |
| 👥 | Purple-500 | Clientes |
| 📋 | Gray-600 | Historial |

#### Bottom Navigation
```
┌──────┬──────┬──────┬──────┐
│  🏠  │  🧮  │  👥  │  📋  │
│Inicio│ Calc │Client│ Hist │
└──────┴──────┴──────┴──────┘
```
- Icono activo: Naranja (#f97316)
- Icono inactivo: Gris (#6b7280)

---

## 3. 🏠 Dashboard (Sin Inventario / Modo Libre)

**ID**: `dashboard-vendedor-libre` | **Offline**: ✅ 100%

### Descripción
Dashboard para modo sin control de inventario. No muestra asignación de kilos.

### Diferencias vs Modo Inventario
- ❌ Sin card "Mi Asignación"
- ❌ Sin kilos en resumen
- ✅ Badge "Modo Libre" verde
- ✅ Mensaje informativo sobre modo libre

### Layout
```
┌─────────────────────┐
│ 9:41    ↻ Offline(3)│
├─────────────────────┤
│ ⟲ Mi Día        🔄  │
├─────────────────────┤
│ [Con Inv] [Sin Inv✓]│  ← Modo Libre activo
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ ✅ Modo Libre   │ │  ← Info modo
│ │ Registra ventas │ │
│ │ sin control     │ │
│ └─────────────────┘ │
├─────────────────────┤
│ ┌──────┐ ┌──────┐   │  ← Grid igual
│ │  🧮  │ │  🛒  │   │
│ └──────┘ └──────┘   │
│ ┌──────┐ ┌──────┐   │
│ │  👥  │ │  📋  │   │
│ └──────┘ └──────┘   │
├─────────────────────┤
│ 🏠   🧮   👥   📋   │
└─────────────────────┘
```

---

## 4. 🧮 Calculadora

**ID**: `calculadora` | **Offline**: ✅ 100%

### Descripción
Calculadora inteligente de precios. Ingresa 2 valores de 3 posibles y calcula el tercero automáticamente.

### Layout
```
┌─────────────────────┐
│ 9:41                │
├─────────────────────┤
│ ⟲ Calculadora       │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │  S/ 84.00       │ │  ← Resultado grande
│ │ Total a Pagar   │ │
│ ├────────┬────────┤ │
│ │7.00 kg │S/12.00│ │  ← Kilos Netos | Precio/kg
│ └────────┴────────┘ │
├─────────────────────┤
│ Kilos Brutos    kg  │  ← Input
│ [8.50           ]   │
├─────────────────────┤
│ Tara (envase)   kg  │  ← Input
│ [1.50           ]   │
├─────────────────────┤
│ Precio por Kg   S/  │  ← Input
│ [12.00          ]   │
├─────────────────────┤
│ [Limpiar] [Usar en] │  ← Botones
│           [Venta  ] │
└─────────────────────┘
```

### Fórmulas
```
Kilos Netos = Kilos Brutos - Tara

Caso 1: Monto Total + Precio/kg → Calcula Kilos
Caso 2: Monto Total + Kilos → Calcula Precio/kg
Caso 3: Precio/kg + Kilos → Calcula Monto Total
```

### Estados de Input
- **Vacío**: Border gris
- **Completo**: Border naranja + ✓ verde
- **Calculado**: Background naranja claro

---

## 5. 🛒 Nueva Venta

**ID**: `nueva-venta` | **Offline**: ✅ 100%

### Descripción
Formulario completo para registrar una venta. Soporta venta con/sin cliente, contado/crédito.

### Layout
```
┌─────────────────────┐
│ 9:41    ✕ Offline   │
├─────────────────────┤
│ ⟲ Nueva Venta       │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Cliente    [Sin]│ │  ← Selección cliente
│ │ ┌───┐ ┌───────┐ │ │
│ │ │ 🔍│ │Buscar │ │ │  ← Buscar + Botón +
│ │ └───┘ └───────┘ │ │
│ │ [👤 Vender sin  ]│ │  ← Opción sin cliente
│ └─────────────────┘ │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Pollo Entero    │ │  ← Producto seleccionado
│ │ S/ 12.00/kg     │ │
│ │ [-] 7 [+]  S/84 │ │  ← Selector cantidad
│ └─────────────────┘ │
├─────────────────────┤
│ ┌───────┐ ┌───────┐ │
│ │CONTADO│ │CRÉDITO│ │  ← Tipo de pago
│ │  ✓    │ │       │ │
│ └───────┘ └───────┘ │
├─────────────────────┤
│ Monto Pagado    S/  │  ← Solo si es parcial
│ [84.00          ]   │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │          S/84.00│ │  ← Total
│ └─────────────────┘ │
├─────────────────────┤
│ [  ✅ CONFIRMAR   ] │  ← Botón principal
│   VENTA             │
│ 📡 Se guardará local│  ← Nota offline
└─────────────────────┘
```

### Estados de Tipo de Pago
- **Contado**: Background naranja, texto blanco
- **Crédito**: Background gris, texto gris

### Validaciones
- Si crédito: Monto pagado puede ser menor al total
- Si contado: Monto pagado = Total
- Cliente opcional (null permitido)

---

## 6. 👥 Clientes

**ID**: `clientes` | **Offline**: ✅ 100%

### Descripción
Gestión de clientes y cuentas por cobrar. Lista, búsqueda, filtros y acceso a historial.

### Layout
```
┌─────────────────────┐
│ 9:41                │
├─────────────────────┤
│ ⟲ Clientes          │
├─────────────────────┤
│ ┌─────┐ ┌─────────┐ │
│ │ 🔍  │ │Buscar...│ │  ← Buscador
│ └─────┘ └─────────┘ │
├─────────────────────┤
│ [Todos][Con deuda][Al]│  ← Filtros
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ 💵 Registrar    │ │  ← Acción rápida abono
│ │    Abono        │ │
│ └─────────────────┘ │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ 👤 María G.    🔴│ │  ← Cliente con deuda
│ │ DNI: 45678912   │ │
│ │ Debe: S/ 450.00 │ │
│ │ [💰Abono][🛒Vta]│ │  ← Acciones rápidas
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ 👤 Juan P.     🟢│ │  ← Cliente al día
│ │ DNI: 12345678   │ │
│ │ Al día          │ │
│ └─────────────────┘ │
├─────────────────────┤
│ 🏠   🧮   👥   📋   │
└─────────────────────┘
```

### Indicadores de Deuda
- 🔴 **Rojo**: Cliente con deuda pendiente
- 🟢 **Verde**: Cliente al día (sin deuda)

### Acciones por Cliente
| Botón | Color | Acción |
|-------|-------|--------|
| Abono | Green-500 | Registrar pago de deuda |
| Venta | Orange-500 | Nueva venta a este cliente |

---

## 7. ➕ Nuevo Cliente

**ID**: `nuevo-cliente` | **Offline**: ✅ 100%

### Descripción
Formulario para registrar un nuevo cliente. Guarda localmente cuando está offline.

### Layout
```
┌─────────────────────┐
│ 9:41    ✕ Offline   │
├─────────────────────┤
│ ⟲ Nuevo Cliente     │
├─────────────────────┤
│ DNI                 │
│ [12345678       ]   │
├─────────────────────┤
│ Nombres             │
│ [Juan           ]   │
├─────────────────────┤
│ Apellidos           │
│ [Pérez          ]   │
├─────────────────────┤
│ Teléfono            │
│ [987654321      ]   │
├─────────────────────┤
│ Dirección (opcional)│
│ [Av. Principal  ]   │
├─────────────────────┤
│ ⚠️ Modo Offline     │
│ Se guardará local   │
├─────────────────────┤
│ [GUARDAR CLIENTE  ] │
└─────────────────────┘
```

### Campos
| Campo | Requerido | Tipo |
|-------|-----------|------|
| DNI | Sí | Texto (8 dígitos) |
| Nombres | Sí | Texto |
| Apellidos | Sí | Texto |
| Teléfono | Sí | Teléfono |
| Dirección | No | Texto |

---

## 8. 💵 Registrar Abono

**ID**: `registrar-abono` | **Offline**: ✅ 100%

### Descripción
Pantalla para registrar un pago de deuda independiente (sin compra asociada).

### Layout
```
┌─────────────────────┐
│ 9:41    ✕ Offline   │
├─────────────────────┤
│ ⟲ Registrar Abono   │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ 👤 María G.     │ │  ← Info cliente
│ │ DNI: 45678912   │ │
│ ├─────────────────┤ │
│ │ Deuda actual    │ │
│ │    S/ 450.00    │ │  ← Deuda actual (rojo)
│ └─────────────────┘ │
├─────────────────────┤
│ Monto del abono     │
│ S/ [100.00      ]   │  ← Input monto
│ ├─────────────────┤ │
│ │[Todo][S/50][S/10]│ │  ← Botones rápidos
│ │[0][S/200]        │ │
├─────────────────────┤
│ Método de pago      │
│ ┌──────┐ ┌──────┐   │
│ │💵Efec│ │📱Yape│   │  ← Grid métodos
│ └──────┘ └──────┘   │
│ ┌──────┐ ┌──────┐   │
│ │📱Plin│ │💳Tran│   │
│ └──────┘ └──────┘   │
├─────────────────────┤
│ Notas (opcional)    │
│ [Pago parcial...]   │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Deuda: S/450.00 │ │  ← Resumen
│ │ Abono: -S/100.00│ │
│ │ ─────────────── │ │
│ │ Nueva: S/350.00 │ │
│ └─────────────────┘ │
├─────────────────────┤
│ [ ✅ CONFIRMAR    ] │
│      ABONO          │
└─────────────────────┘
```

### Botones Rápidos de Monto
- **Todo**: Abona toda la deuda
- **S/50, S/100, S/200**: Montos predefinidos

### Métodos de Pago
- 💵 Efectivo (default)
- 📱 Yape
- 📱 Plin
- 💳 Transferencia

---

## 9. 📋 Historial de Ventas

**ID**: `historial-ventas` | **Offline**: ✅ 100%

### Descripción
Lista de ventas realizadas por el vendedor. Muestra estado de sincronización.

### Layout
```
┌─────────────────────┐
│ 9:41                │
├─────────────────────┤
│ ⟲ Historial Ventas  │
├─────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐│
│ │S/84│ │ 12 │ │S/32││  ← Stats
│ │Total│Vent│Credi│ │
│ └────┘ └────┘ └────┘│
├─────────────────────┤
│ [Hoy][Ayer][Semana] │  ← Filtros fecha
├─────────────────────┤
│ ┌─────────────────┐ │
│ │🟢 María G.      │ │  ← Venta sync'd
│ │10:30 AM         │ │
│ │        S/ 84.00 │ │
│ │    ✓ Sincronizado│ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │🟡 Carmen R.     │ │  ← Venta pendiente
│ │9:45 AM          │ │
│ │        S/ 56.00 │ │
│ │ ⏳ Pendiente    │ │
│ └─────────────────┘ │
├─────────────────────┤
│ 🏠   🧮   👥   📋   │
└─────────────────────┘
```

### Indicadores de Estado
| Icono | Color | Estado |
|-------|-------|--------|
| 🟢 | Verde | Sincronizado |
| 🟡 | Amarillo | Pendiente de sync |
| 💵 | Verde | Venta contado |
| 💳 | Naranja | Venta crédito |

---

## 10. 🔒 Cierre del Día

**ID**: `cierre-dia` | **Offline**: ✅ 100%

### Descripción
Resumen final de la jornada. Muestra ventas, kilos vendidos y operaciones pendientes.

### Layout
```
┌─────────────────────┐
│ 9:41    ↻ Offline(2)│
├─────────────────────┤
│ ⭘ Cierre del Día  🔄│
├─────────────────────┤
│ ┌─────────────────┐ │
│ │   ✅            │ │  ← Éxito
│ │ Día Completado  │ │
│ │ Listo para sync │ │
│ └─────────────────┘ │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Resumen del Día │ │
│ │ Asignado: 45 kg │ │
│ │ Vendido:  42 kg │ │  ← Verde
│ │ Devuelto: 3 kg  │ │  ← Naranja
│ │ ─────────────── │ │
│ │ Total: S/ 1,240 │ │
│ └─────────────────┘ │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Desglose Pagos  │ │
│ │ 💵 Efectivo     │ │
│ │       S/ 920    │ │  ← Verde
│ │ 💳 Crédito      │ │
│ │       S/ 320    │ │  ← Naranja
│ └─────────────────┘ │
├─────────────────────┤
│ ⚠️ 2 operaciones    │  ← Pendientes
│    pendientes       │
├─────────────────────┤
│ [  🔄 SINCRONIZAR  ]│
│      AHORA          │
└─────────────────────┘
```

### Secciones
1. **Estado**: Badge verde con check
2. **Resumen**: Kilos asignados/vendidos/devueltos
3. **Desglose**: Efectivo vs Crédito
4. **Pendientes**: Operaciones esperando sync
5. **Acción**: Botón sincronizar

---

## 11. 📦 Catálogo

**ID**: `catalogo` | **Offline**: ✅ 100%

### Descripción
Catálogo de productos disponibles para pedidos. Separado por categorías.

### Layout
```
┌─────────────────────┐
│ 9:41                │
├─────────────────────┤
│ ⟲ Catálogo          │
├─────────────────────┤
│ [Pollo][Huevos][Otr]│  ← Tabs
├─────────────────────┤
│ ┌──────┐ ┌──────┐   │
│ │  🐔  │ │  🍗  │   │  ← Grid productos
│ │ Pollo│ │Pechug│   │
│ │S/12.0│ │S/18.0│   │
│ │ 🟢   │ │ 🟢   │   │  ← Stock status
│ └──────┘ └──────┘   │
│ ┌──────┐ ┌──────┐   │
│ │  🍗  │ │  🍗  │   │
│ │Pierna│ │Alitas│   │
│ │S/14.0│ │S/15.0│   │
│ │ 🟡   │ │ 🔴   │   │
│ └──────┘ └──────┘   │
├─────────────────────┤
│ [  🛒 Ver Carrito   ]│  ← Carrito flotante
│     (2 items)       │
└─────────────────────┘
```

### Tabs
- **Pollo**: Productos de pollo (entero, cortes)
- **Huevos**: Cajas y unidades
- **Otros**: Aceitunas, menudencias

### Estados de Stock
| Badge | Significado |
|-------|-------------|
| 🟢 Disponible | En stock |
| 🟡 Bajo stock | Menos de 10 unidades |
| 🔴 Agotado | Sin stock |

---

## 12. 🔄 Estado Sync

**ID**: `sync-status` | **Offline**: ✅ 100%

### Descripción
Pantalla de estado de sincronización. Muestra cola de operaciones y configuración.

### Layout
```
┌─────────────────────┐
│ 9:41                │
├─────────────────────┤
│ ⟲ Estado de Sync    │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │      ✅         │ │  ← Estado general
│ │ Sincronizado    │ │
│ │ Último: 5min ago│ │
│ └─────────────────┘ │
├─────────────────────┤
│ ┌──────┐ ┌──────┐   │
│ │  47  │ │  12  │   │  ← Stats
│ │ Ventas│Clientes│   │
│ └──────┘ └──────┘   │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Cola de Ops     │ │
│ │ ✅ María G.     │ │  ← Items sync'd
│ │    Venta - 10:30│ │
│ │ ✅ Pedro L.     │ │
│ │    Cliente-10:15│ │
│ └─────────────────┘ │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Configuración   │ │
│ │ ☑ Auto-sync     │ │  ← Toggle
│ │ Intervalo: 30s  │ │
│ │ ☐ Solo WiFi     │ │  ← Toggle
│ └─────────────────┘ │
├─────────────────────┤
│ [  🔄 SYNC MANUAL  ]│
└─────────────────────┘
```

### Configuración
- **Sync automático**: Toggle (default: ON)
- **Intervalo**: 30s (configurable)
- **Solo WiFi**: Toggle (default: OFF)

---

## 🔗 Navegación entre Pantallas

### Flujo Principal
```
Login → Dashboard → [Calculadora | Nueva Venta | Clientes | Historial]
```

### Flujo Venta
```
Dashboard → Nueva Venta → [Seleccionar Cliente] → Confirmar → Dashboard
```

### Flujo Abono
```
Clientes → Seleccionar Cliente → Registrar Abono → Confirmar → Clientes
```

---

*Documentación de pantallas mobile - Avileo v1.0*
