# 🔄 Flujos de Navegación

> Mapa de flujos de usuario y navegación entre pantallas

---

## 🗺️ Navegación General

### Estructura de Navegación Mobile

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

### Estructura de Navegación Desktop

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

## 📱 Flujos Mobile

### 1. 🔐 Flujo de Autenticación

```
┌─────────────────────────────────────────────┐
│              FLUJO LOGIN                    │
├─────────────────────────────────────────────┤
│                                             │
│  1. Usuario ingresa email y contraseña     │
│           ↓                                 │
│  2. Validación de credenciales             │
│           ↓                                 │
│  ┌─────────────────────────────────────┐   │
│  │ ¿Credenciales válidas?              │   │
│  └───────────────┬─────────────────────┘   │
│          Sí ↓    ↓ No                     │
│  ┌──────────┐  ┌──────────────────────┐   │
│  │ Dashboard│  │ Mostrar error        │   │
│  └──────────┘  │ "Credenciales inválidas"│ │
│                └──────────────────────┘   │
│                                             │
│  Nota: Token JWT se cachea 24-48h          │
└─────────────────────────────────────────────┘
```

**Pantallas:**
- Login → Dashboard

---

### 2. 🛒 Flujo de Venta Completo

```
┌──────────────────────────────────────────────────────┐
│           FLUJO NUEVA VENTA                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Dashboard                                           │
│     ↓                                                │
│  [+] Nueva Venta                                     │
│     ↓                                                │
│  ┌──────────────────────────────────────────────┐   │
│  │ 1. SELECCIONAR CLIENTE (Opcional)            │   │
│  │                                               │   │
│  │    ┌──────────────┐ ┌──────────────┐        │   │
│  │    │ Buscar DNI   │ │ + Nuevo      │        │   │
│  │    └──────────────┘ └──────────────┘        │   │
│  │                                               │   │
│  │    o [👤 Vender sin registrar cliente]      │   │
│  └───────────────┬──────────────────────────────┘   │
│                  ↓                                   │
│  ┌──────────────────────────────────────────────┐   │
│  │ 2. AGREGAR PRODUCTOS                         │   │
│  │                                               │   │
│  │    Pollo Entero    S/12.00/kg               │   │
│  │    [-] 7 [+]        = S/84.00               │   │
│  │                                               │   │
│  │    [+ Agregar más productos]                │   │
│  └───────────────┬──────────────────────────────┘   │
│                  ↓                                   │
│  ┌──────────────────────────────────────────────┐   │
│  │ 3. TIPO DE PAGO                              │   │
│  │                                               │   │
│  │    ┌──────────┐  ┌──────────┐               │   │
│  │    │ CONTADO  │  │ CRÉDITO   │               │   │
│  │    │    ✓     │  │           │               │   │
│  │    └──────────┘  └──────────┘               │   │
│  │                                               │   │
│  │    Si CRÉDITO: Monto pagado: [    ]         │   │
│  └───────────────┬──────────────────────────────┘   │
│                  ↓                                   │
│  ┌──────────────────────────────────────────────┐   │
│  │ 4. CONFIRMAR                                 │   │
│  │                                               │   │
│  │    Total: S/84.00                           │   │
│  │                                               │   │
│  │    [   ✅ CONFIRMAR VENTA   ]               │   │
│  │                                               │   │
│  │    📡 Se guardará localmente                │   │
│  └──────────────────────────────────────────────┘   │
│                  ↓                                   │
│           Dashboard (con toast éxito)               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Pantallas:**
1. Dashboard → Nueva Venta
2. Seleccionar cliente (opcional)
3. Agregar productos
4. Seleccionar tipo de pago
5. Confirmar
6. Dashboard (retorno)

---

### 3. 💵 Flujo de Abono (Pago de Deuda)

```
┌──────────────────────────────────────────────────────┐
│           FLUJO REGISTRAR ABONO                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Acceso desde:                                       │
│  • Clientes → Seleccionar cliente con deuda         │
│  • Dashboard → Acceso rápido                        │
│                                                      │
│     ↓                                                │
│  ┌──────────────────────────────────────────────┐   │
│  │ SELECCIONAR CLIENTE                          │   │
│  │                                               │   │
│  │  👤 María González         Debe: S/450      │   │
│  │  👤 Carmen Rodríguez       Debe: S/890      │   │
│  └───────────────┬──────────────────────────────┘   │
│                  ↓                                   │
│  ┌──────────────────────────────────────────────┐   │
│  │ REGISTRAR ABONO                              │   │
│  │                                               │   │
│  │  Cliente: María González                     │   │
│  │  Deuda actual: S/450.00  🔴                  │   │
│  │                                               │   │
│  │  Monto del abono:                            │   │
│  │  S/ [    100.00    ]                         │   │
│  │                                               │   │
│  │  [Todo] [50] [100] [200]                    │   │
│  │                                               │   │
│  │  Método de pago:                             │   │
│  │  [💵 Efectivo] [📱 Yape]                     │   │
│  │  [📱 Plin] [💳 Transferencia]                │   │
│  │                                               │   │
│  │  ─────────────────────────────────          │   │
│  │  Deuda anterior:  S/450.00                  │   │
│  │  Abono:          -S/100.00                  │   │
│  │  ─────────────────────────────────          │   │
│  │  Nueva deuda:     S/350.00  🟠              │   │
│  │                                               │   │
│  │  [   ✅ CONFIRMAR ABONO   ]                 │   │
│  └──────────────────────────────────────────────┘   │
│                  ↓                                   │
│           Clientes (con toast éxito)                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Pantallas:**
1. Clientes / Dashboard → Registrar Abono
2. Confirmar abono
3. Retorno a Clientes

---

### 4. 🧮 Flujo de Calculadora

```
┌──────────────────────────────────────────────────────┐
│           FLUJO CALCULADORA                          │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Acceso: Dashboard → 🧮 Calculadora                 │
│                                                      │
│     ↓                                                │
│  ┌──────────────────────────────────────────────┐   │
│  │ CALCULADORA DE POLLO                         │   │
│  │                                               │   │
│  │  ┌──────────────────────────────────────┐   │   │
│  │  │       S/ 84.00                       │   │   │
│  │  │       Total a Pagar                  │   │   │
│  │  │                                      │   │   │
│  │  │   7.00 kg        S/ 12.00            │   │   │
│  │  │   Kilos Netos    Precio/kg           │   │   │
│  │  └──────────────────────────────────────┘   │   │
│  │                                               │   │
│  │  ┌──────────────────────────────────────┐   │   │
│  │  │ Kilos Brutos (kg)     [   8.50   ] ✓ │   │   │
│  │  │ Tara (kg)             [   1.50   ]   │   │   │
│  │  │ Precio por kg (S/)    [  12.00   ] ✓ │   │   │
│  │  │ Monto Total (S/)      [  84.00   ]   │   │   │
│  │  └──────────────────────────────────────┘   │   │
│  │                                               │   │
│  │  [  Limpiar  ]  [   Usar en Venta   ]       │   │
│  └──────────────────────────────────────────────┘   │
│                  ↓                                   │
│  ┌──────────────────────────────────────────────┐   │
│  │ Si "Usar en Venta":                          │   │
│  │                                               │   │
│  │  → Precarga valores en Nueva Venta          │   │
│  │  → Navega a: Nueva Venta                     │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Fórmulas:**
```
Kilos Netos = Kilos Brutos - Tara

Caso 1: Monto + Precio → Calcula Kilos
Caso 2: Monto + Kilos → Calcula Precio  
Caso 3: Precio + Kilos → Calcula Monto
```

---

### 5. 🔄 Flujo de Sincronización

```
┌──────────────────────────────────────────────────────┐
│           FLUJO SYNC OFFLINE/ONLINE                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ VENDEDOR HACE UNA VENTA (Sin Internet)       │   │
│  │                                               │   │
│  │  1. Completa formulario de venta             │   │
│  │           ↓                                  │   │
│  │  2. Click "Confirmar Venta"                  │   │
│  │           ↓                                  │   │
│  │  3. TanStack DB guarda en memoria           │   │
│  │           ↓                                  │   │
│  │  4. IndexedDB persiste localmente           │   │
│  │           ↓                                  │   │
│  │  5. SyncEngine detecta: NO hay internet     │   │
│  │           ↓                                  │   │
│  │  6. Guarda en cola de operaciones           │   │
│  │           ↓                                  │   │
│  │  7. UI muestra: "✅ Venta guardada.         │   │
│  │               Se sincronizará luego."       │   │
│  │           ↓                                  │   │
│  │  ┌─────────────┐    ┌───────────────────┐   │   │
│  │  │ Status bar  │    │ Estado Sync       │   │   │
│  │  │ shows: 🔴 3 │    │ Pantalla:         │   │   │
│  │  └─────────────┘    │ • 3 pendientes    │   │   │
│  │                     │ • Lista de ops    │   │   │
│  └─────────────────────┴───────────────────┘   │   │
│                                                  │   │
│  ╔══════════════════════════════════════════╗   │   │
│  ║  EVENTO: Vuelve la conexión a internet   ║   │   │
│  ╚══════════════════════╤═══════════════════╝   │   │
│                         ↓                        │   │
│  ┌──────────────────────────────────────────────┐│   │
│  │ SINCRONIZACIÓN AUTOMÁTICA                    ││   │
│  │                                               ││   │
│  │  1. Browser detecta evento 'online'         ││   │
│  │           ↓                                   ││   │
│  │  2. SyncEngine.processQueue() ejecuta       ││   │
│  │           ↓                                   ││   │
│  │  3. Envía operaciones pendientes FIFO       ││   │
│  │           ↓                                   ││   │
│  │  4. Servidor confirma cada operación        ││   │
│  │           ↓                                   ││   │
│  │  5. Actualiza estado a 'synced'             ││   │
│  │           ↓                                   ││   │
│  │  6. UI muestra: "🟢 Sincronizado"           ││   │
│  │                                               ││   │
│  │  Status: 🟢 Online                           ││   │
│  └──────────────────────────────────────────────┘│   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Estrategia de Reintentos:**
```
Intento 1: Inmediato
Intento 2: Después de 2 segundos
Intento 3: Después de 4 segundos
Intento 4: Después de 8 segundos
Máximo: 5 intentos, luego marca error
```

---

## 🖥️ Flujos Desktop

### 1. 📍 Flujo de Distribución

```
┌────────────────────────────────────────────────────────┐
│           FLUJO DISTRIBUCIÓN DEL DÍA                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Admin Dashboard                                       │
│       ↓                                                │
│  📍 Distribución                                       │
│       ↓                                                │
│  ┌────────────────────────────────────────────────┐   │
│  │ 1. VER INVENTARIO DISPONIBLE                   │   │
│  │                                                │   │
│  │    Inventario hoy: 250 kg                     │   │
│  │    Asignado: 200 kg (80%)                     │   │
│  │    [████████████████████░░░░░░░░░░]          │   │
│  └────────────────┬───────────────────────────────┘   │
│                   ↓                                    │
│  ┌────────────────────────────────────────────────┐   │
│  │ 2. CREAR NUEVA ASIGNACIÓN  [+ Nueva]           │   │
│  │                                                │   │
│  │    Vendedor: [María G.    ▼]                  │   │
│  │    Punto:    [Carro A        ]                │   │
│  │    Kilos:    [    50         ]                │   │
│  │                                                │   │
│  │    [Cancelar]  [Guardar Asignación]           │   │
│  └────────────────┬───────────────────────────────┘   │
│                   ↓                                    │
│  ┌────────────────────────────────────────────────┐   │
│  │ 3. MONITOREAR ASIGNACIONES                     │   │
│  │                                                │   │
│  │    Tabla de vendedores activos:               │   │
│  │    • Juan P. - Carro A - 32/50kg - En ruta    │   │
│  │    • María G. - Casa - 40/40kg - Cerrado ✓    │   │
│  │    • Pedro R. - Local - 0/60kg - Pendiente    │   │
│  │                                                │   │
│  │    Acciones: Editar | Cerrar | Ver ventas     │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

### 2. 👥 Flujo de Gestión de Usuarios

```
┌────────────────────────────────────────────────────────┐
│           FLUJO USUARIOS                               │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Sidebar → 👥 Usuarios                                 │
│       ↓                                                │
│  ┌────────────────────────────────────────────────┐   │
│  │ LISTA DE USUARIOS                              │   │
│  │                                                │   │
│  │  [+ Nuevo Usuario]    [🔍 Buscar...]          │   │
│  │                                                │   │
│  │  Nombre    │ Rol       │ Estado  │ Acciones   │   │
│  │  ─────────────────────────────────────────    │   │
│  │  Admin P.  │ 🟧 ADMIN  │ 🟢 Act  │ ✎ ✕       │   │
│  │  Juan V.   │ 🔵 VEND   │ 🟢 Act  │ ✎ ✕       │   │
│  │  María G.  │ 🔵 VEND   │ 🟢 Act  │ ✎ ✕       │   │
│  └────────────────────────────────────────────────┘   │
│       ↓                                                │
│  ┌────────────────────────────────────────────────┐   │
│  │ CREAR NUEVO USUARIO                            │   │
│  │                                                │   │
│  │  Nombre:        [                    ]        │   │
│  │  DNI:           [                    ]        │   │
│  │  Email:         [                    ]        │   │
│  │  Teléfono:      [                    ]        │   │
│  │  Rol:           [Vendedor ▼]                  │   │
│  │  Punto venta:   [                    ]        │   │
│  │                                                │   │
│  │  ℹ️ Contraseña se genera automáticamente      │   │
│  │                                                │   │
│  │         [Crear Usuario]                       │   │
│  └────────────────────────────────────────────────┘   │
│       ↓                                                │
│  • Email enviado con credenciales                     │
│  • Usuario debe cambiar contraseña en primer login    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 🎯 Flujos Especiales

### Flujo Cierre del Día

```
┌─────────────────────────────────────────────────────┐
│          CIERRE DEL DÍA                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Dashboard                                          │
│       ↓                                             │
│  [Cierre del Día]                                   │
│       ↓                                             │
│  ┌─────────────────────────────────────────────┐   │
│  │ RESUMEN DEL DÍA                             │   │
│  │                                             │   │
│  │  ✅ Día Completado                          │   │
│  │                                             │   │
│  │  Kilos asignados:     45 kg                │   │
│  │  Kilos vendidos:      42 kg  🟢            │   │
│  │  Kilos devueltos:      3 kg  🟠            │   │
│  │  ─────────────────────────────────        │   │
│  │  Total ventas:       S/ 1,240             │   │
│  │                                             │   │
│  │  Desglose:                                  │   │
│  │    💵 Efectivo:      S/ 920               │   │
│  │    💳 Crédito:       S/ 320               │   │
│  │                                             │   │
│  │  ⚠️ 2 operaciones pendientes de sync      │   │
│  │                                             │   │
│  │  [      🔄 SINCRONIZAR AHORA      ]       │   │
│  └─────────────────────────────────────────────┘   │
│       ↓                                             │
│  • Si hay internet: Sincroniza inmediatamente      │
│  • Si no: Datos se mantienen en cola               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔗 Navegación Directa

### Deep Links

| Pantalla | URL/Ruta |
|----------|----------|
| Login | `/login` |
| Dashboard | `/dashboard` |
| Calculadora | `/calculadora` |
| Nueva Venta | `/ventas/nueva` |
| Clientes | `/clientes` |
| Historial | `/ventas/historial` |
| Cierre | `/cierre` |
| Sync | `/sync` |

### Atajos (Shortcuts)

| Rol | Atajo | Acción |
|-----|-------|--------|
| Vendedor | `Alt + C` | Abrir Calculadora |
| Vendedor | `Alt + V` | Nueva Venta |
| Vendedor | `Alt + L` | Lista Clientes |
| Admin | `Alt + D` | Distribución |
| Admin | `Alt + U` | Usuarios |
| Admin | `Alt + R` | Reportes |

---

## 📊 Mapa de Estados

### Estados de Pantalla

```
┌─────────────────────────────────────────────────────┐
│                ESTADOS DE SYNC                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│   🟢 Sincronizado                                   │
│      └── Todo en línea, datos actualizados         │
│                                                     │
│   🟡 X operaciones pendientes                       │
│      └── Hay datos locales esperando sync          │
│      └── Sync automático cada 30s                  │
│                                                     │
│   🔴 Sin conexión                                   │
│      └── Funcionando 100% offline                  │
│      └── Datos seguros en IndexedDB                │
│                                                     │
│   ⚠️ Error de sync                                  │
│      └── Falló después de 5 intentos               │
│      └── Requiere acción manual                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

*Documentación de flujos - Avileo v1.0*
