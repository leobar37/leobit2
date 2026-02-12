# 🎨 Componentes UI

> Sistema de diseño y componentes reutilizables de PollosPro

---

## 🎯 Fundamentos de Diseño

### Mobile-First
- Diseño optimizado para pantallas pequeñas
- Escalado progresivo hacia desktop
- Touch targets mínimos de 44x44px

### Paleta de Colores

| Nombre | Hex | Uso |
|--------|-----|-----|
| **Primary** | `#f97316` | Botones principales, acentos |
| **Primary Dark** | `#ea580c` | Hover states |
| **Primary Light** | `#fdba74` | Backgrounds sutiles |
| **Success** | `#22c55e` | Estados positivos, pagos |
| **Warning** | `#eab308` | Alertas, pendientes |
| **Error** | `#ef4444` | Errores, deudas |
| **Info** | `#3b82f6` | Información, links |

### Grises

| Nombre | Hex | Uso |
|--------|-----|-----|
| **Gray 50** | `#f9fafb` | Backgrounds claros |
| **Gray 100** | `#f3f4f6` | Cards, secciones |
| **Gray 200** | `#e5e7eb` | Borders |
| **Gray 400** | `#9ca3af` | Texto secundario |
| **Gray 600** | `#4b5563` | Texto primario |
| **Gray 800** | `#1f2937` | Texto oscuro |
| **Gray 900** | `#111827` | Headers, fondos oscuros |

### Tipografía

| Elemento | Tamaño | Peso | Línea |
|----------|--------|------|-------|
| **H1** | 24px | 700 | 32px |
| **H2** | 20px | 600 | 28px |
| **H3** | 18px | 600 | 24px |
| **Body** | 14px | 400 | 20px |
| **Small** | 12px | 400 | 16px |
| **Label** | 12px | 500 | 16px |

---

## 🧩 Componentes

### 1. Buttons

#### Primary Button
```
┌─────────────────────┐
│  [  Button Text   ] │
└─────────────────────┘
```
- **Background**: `#f97316` (orange-500)
- **Text**: White
- **Padding**: 12px 24px
- **Border Radius**: 8px
- **Hover**: `#ea580c` (orange-600)
- **Disabled**: Opacity 50%

#### Secondary Button
```
┌─────────────────────┐
│  [  Button Text   ] │  ← Border + transparent bg
└─────────────────────┘
```
- **Background**: Transparent
- **Border**: 1px solid `#f97316`
- **Text**: `#f97316`
- **Hover**: Background `#fff7ed`

#### Danger Button
```
┌─────────────────────┐
│  [  Delete   ]      │  ← Red background
└─────────────────────┘
```
- **Background**: `#ef4444` (red-500)
- **Text**: White
- **Hover**: `#dc2626` (red-600)

### 2. Inputs

#### Text Input
```
Label
┌─────────────────────┐
│ Placeholder text    │
└─────────────────────┘
```
- **Border**: 1px solid `#e5e7eb`
- **Border Radius**: 8px
- **Padding**: 12px 16px
- **Focus**: Border `#f97316`, ring 4px `#fed7aa`

#### Input with Icon
```
Label
┌─────────────────────┐
│ 🔍 │ Search...     │
└─────────────────────┘
```
- Icono a la izquierda
- Padding-left aumentado

#### Input Error State
```
Label
┌─────────────────────┐
│ Invalid value    ⚠️ │  ← Red border
└─────────────────────┘
Error message here
```
- **Border**: `#ef4444`
- **Message**: Red text debajo

### 3. Cards

#### Basic Card
```
┌─────────────────────────────┐
│                             │
│   Card Content              │
│                             │
└─────────────────────────────┘
```
- **Background**: White
- **Border Radius**: 12px
- **Shadow**: 0 1px 3px rgba(0,0,0,0.1)
- **Padding**: 16px

#### Stats Card
```
┌─────────────────────────────┐
│ Label              🎨 Icon  │
│                             │
│   S/ 1,240                  │  ← Large number
└─────────────────────────────┘
```
- **Number**: 24px, bold
- **Color del número**: Según tipo (green/orange/blue)

#### Highlight Card (Asignación)
```
┌─────────────────────────────┐
│ ┌─────────────────────────┐ │
│ │ 🏷️ Hoy                  │ │  ← Badge
│ │                         │ │
│ │   45 kg                 │ │  ← Big number
│ │                         │ │
│ │ [██████████░░] 71%      │ │  ← Progress
│ └─────────────────────────┘ │
```
- **Background**: `rgba(249, 115, 22, 0.1)`
- **Border**: `rgba(249, 115, 22, 0.3)`
- **Text**: White/Orange

### 4. Badges

| Tipo | Color | Ejemplo |
|------|-------|---------|
| **Default** | Gray | `Badge` |
| **Primary** | Orange | `Nuevo` |
| **Success** | Green | `Activo` |
| **Warning** | Yellow | `Pendiente` |
| **Error** | Red | `Debe` |
| **Info** | Blue | `En ruta` |

### 5. Navigation

#### Mobile Bottom Nav
```
┌─────────────────────────────────┐
│  🏠  │  🧮  │  👥  │  📋       │
│ Home  Calc Client Hist        │
└─────────────────────────────────┘
```
- **Height**: 64px
- **Background**: Gray-900
- **Active**: Orange icon + text
- **Inactive**: Gray icon + text

#### Desktop Sidebar
```
┌────────────────┐
│ 🟧 PollosPro   │
├────────────────┤
│ 🏠 Dashboard   │  ← Active
│ 📍 Distribución│
│ 👥 Usuarios    │
│ 👤 Clientes    │
│ 📊 Reportes    │
│ ⚙️ Config      │
│                │
├────────────────┤
│ 🚪 Logout      │
└────────────────┘
```
- **Width**: 224px
- **Active**: Orange bg/20, orange text, border

### 6. Status Indicators

#### Online/Offline Badge
| Estado | Icono | Texto |
|--------|-------|-------|
| Online | 🟢 | "Online" |
| Offline | 🔴 | "Offline" |
| Syncing | 🟡 | "Sincronizando..." |
| Pending | ⏳ | "3 pendientes" |

#### Progress Bar
```
[████████████████████░░░░] 80%
```
- **Height**: 8px
- **Background**: Gray-700
- **Fill**: Orange-500
- **Border Radius**: Full

### 7. Lists

#### Client List Item
```
┌─────────────────────────────────────┐
│ 👤 │ María González        │ S/450 │
│    │ DNI: 45678912         │ 🔴    │
└─────────────────────────────────────┘
```
- Avatar inicial
- Nombre destacado
- Deuda alineada derecha

#### Transaction Item
```
┌─────────────────────────────────────┐
│ 🟠 │ Venta - 5kg pollo            │
│    │ 10:30 AM              -S/84  │
└─────────────────────────────────────┘
```
- Icono tipo transacción
- Descripción
- Monto alineado derecha

### 8. Modals

#### Confirm Modal
```
┌─────────────────────────────┐
│ ✕  Título del Modal         │
├─────────────────────────────┤
│                             │
│   Contenido del modal       │
│                             │
├─────────────────────────────┤
│ [Cancelar]  [Confirmar]     │
└─────────────────────────────┘
```
- **Width**: 400px (mobile) / 500px (desktop)
- **Overlay**: Black 50% opacity
- **Border Radius**: 12px

#### Form Modal
```
┌─────────────────────────────┐
│ ✕  Nuevo Cliente            │
├─────────────────────────────┤
│ Nombre                      │
│ [                         ] │
│                             │
│ Email                       │
│ [                         ] │
│                             │
│ [Cancelar]  [Guardar]       │
└─────────────────────────────┘
```

### 9. Tables

#### Data Table
```
┌──────────────────────────────────────────────────┐
│ Nombre   │ Rol      │ Estado   │ Acciones       │
├──────────────────────────────────────────────────┤
│ Juan P.  │ 🟧ADMIN  │ 🟢Activo │ ✎ ✕           │
│ María G. │ 🔵VEND   │ 🟢Activo │ ✎ ✕           │
│ Pedro R. │ 🔵VEND   │ ⚫Inact  │ ✎ ✕           │
└──────────────────────────────────────────────────┘
```
- **Header**: Gray-700 background
- **Rows**: Alternating white/gray-50
- **Hover**: Gray-100

### 10. Calculator Display

```
┌─────────────────────────────────────┐
│         S/ 84.00                    │  ← Resultado grande
│         Total a Pagar               │
├─────────────────────────────────────┤
│ 7.00 kg           S/ 12.00          │  ← Detalles
│ Kilos Netos       Precio/kg         │
└─────────────────────────────────────┘
```
- **Background**: Gradiente naranja
- **Texto**: Blanco
- **Número principal**: 36px bold

---

## 🎭 Estados de Componentes

### Button States
| Estado | Apariencia |
|--------|------------|
| Default | Fondo naranja, texto blanco |
| Hover | Fondo naranja oscuro |
| Active | Scale 0.95 |
| Disabled | Opacity 0.5, cursor not-allowed |
| Loading | Spinner + texto |

### Input States
| Estado | Apariencia |
|--------|------------|
| Default | Border gris |
| Focus | Border naranja, ring naranja claro |
| Error | Border rojo, icono error |
| Disabled | Background gris claro |
| Filled | Border naranja (en calculadora) |

---

## 📱 Responsive Patterns

### Mobile (<768px)
- Single column layout
- Bottom navigation
- Full-width buttons
- Cards apilados verticalmente

### Tablet (768px-1024px)
- 2-column grids
- Sidebar colapsable
- Cards más compactos

### Desktop (>1024px)
- Multi-column layouts
- Sidebar fijo
- Tablas completas
- Gráficos expandidos

---

## 🎨 Tokens de Diseño

### Espaciado
```
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
```

### Border Radius
```
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
--radius-full: 9999px
```

### Sombras
```
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
--shadow-md: 0 4px 6px rgba(0,0,0,0.1)
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1)
```

---

## 🔧 Uso en Código

### React + Tailwind

```tsx
// Button Primary
<button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
  Guardar
</button>

// Input
<input 
  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:border-orange-500 focus:ring-4 focus:ring-orange-200"
  placeholder="Ingrese valor"
/>

// Card
<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
  Content
</div>

// Badge
<span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
  Nuevo
</span>
```

---

*Sistema de componentes UI - PollosPro v1.0*
