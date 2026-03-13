# Animation: Distribución Diaria

> Gráfico animado que muestra el flujo de trabajo de distribución y ventas.

---

## 🎬 Animación 1: El Ciclo Diario

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         🐔 AVILEO - FLUJO DIARIO                        │
└─────────────────────────────────────────────────────────────────────────┘

ESCENA 1: ☀️ MAÑANA - ASIGNACIÓN
══════════════════════════════════════════════════════════════════════════

    ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
    │  ADMIN     │         │   SERVER   │         │  VENDEDOR  │
    │  (Oficina) │         │  (Cloud)   │         │  (Campo)   │
    └──────┬──────┘         └──────┬──────┘         └──────┬──────┘
           │                       │                       │
           │  1. Asigna 50kg       │                       │
           │───────────────────────>│                       │
           │                       │                       │
           │                       │  2. Sync inventario   │
           │                       │───────────────────────>│
           │                       │                       │
           │                       │    "Tienes: 50kg"     │
           │                       │       📦 50kg        │
           │                       │                       │
           │                       │                       │
           ▼                       ▼                       ▼

ESCENA 2: 🏪 DÍA - VENTAS (OFFLINE)
══════════════════════════════════════════════════════════════════════════

    ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
    │  ADMIN     │         │   SERVER   │         │  VENDEDOR  │
    │             │         │             │         │             │
    │  👀 Watching│         │  💤 Idle   │         │  🛒 Vendiendo│
    └──────┬──────┘         └──────┬──────┘         └──────┬──────┘
           │                       │                       │
           │                       │    ┌─────────────┐    │
           │                       │    │ 💰 Venta 1  │    │
           │                       │    │ 7kg x S/12  │    │
           │                       │    │ = S/84      │    │
           │                       │    │ 💾 Guardado │    │
           │                       │    │   LOCAL ✓   │    │
           │                       │    └─────────────┘    │
           │                       │           │            │
           │                       │    ┌─────────────┐    │
           │                       │    │ 💰 Venta 2  │    │
           │                       │    │ 5kg x S/12  │    │
           │                       │    │ = S/60      │    │
           │                       │    │ 💾 Guardado │    │
           │                       │    │   LOCAL ✓   │    │
           │                       │    └─────────────┘    │
           │                       │                       │
           │                       │   [📡 OFFLINE MODE]   │
           │                       │                       │
           ▼                       ▼                       ▼

ESCENA 3: 🌙 CIERRE DEL DÍA
══════════════════════════════════════════════════════════════════════════

    ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
    │  ADMIN     │         │   SERVER   │         │  VENDEDOR  │
    │             │         │             │         │             │
    │             │         │             │         │  📊 Resumen │
    │             │         │             │         │  ┌────────┐│
    │             │         │             │         │  │Ventas 2││
    │             │         │             │         │  │12kg    ││
    │             │         │             │         │  │S/144   ││
    │             │         │             │         │  │38kg dev│
    │             │         │             │         │  └────────┘│
    │             │         │             │         │             │
    │             │         │             │         │ 🔄 Sync    │
    │             │         │             │         │ ──────────>│
    │             │         │             │         │             │
    │   ⏳ Pending│         │ <───────────│         │  ✅ Sync   │
    │   ⏳ Pending│<────────│   S/144     │         │  Complete  │
    └──────┬──────┘         └─────────────┘         └─────────────┘
           │
           │  📊 Dashboard Actualizado
           │  ┌─────────────────────┐
           │  │ Juan: S/144 (2 vts) │
           │  │ Deuda: S/0          │
           │  └─────────────────────┘
           ▼

═══════════════════════════════════════════════════════════════════════════
                         REPETIR CADA DÍA 🔄
═══════════════════════════════════════════════════════════════════════════
```

---

## 🎬 Animación 2: Escenario con Deudas

```
ESCENA: COBRO DE DEUDA
══════════════════════════════════════════════════════════════════════════

    ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
    │  CLIENTE    │         │  VENDEDOR  │         │   SERVER   │
    │             │         │             │         │             │
    │ 💵 Deuda:   │         │             │         │             │
    │  S/450     │         │             │         │             │
    │    │       │         │             │         │             │
    │    │ Paga  │         │             │         │             │
    │    ▼ S/200 │         │             │         │             │
    │  💳        │─────────>│             │         │             │
    │             │  S/200  │ 💾 Guardado │         │             │
    │             │         │   LOCAL ✓   │         │             │
    │             │         │             │         │             │
    │             │         │             │  Sync   │             │
    │             │         │─────────────>│─────────>│         │
    │             │         │             │   S/200  │         │
    │             │         │             │   Abono  │         │
    │             │         │             │         │  ✅ Updated│
    │             │         │             │         │  S/250    │
    │             │         │             │         │   deuda   │
    └─────────────┘         └─────────────┘         └─────────────┘

RESULTADO:
┌─────────────────────────────────────────────────────────────────────────┐
│  Cliente: María G.                                                     │
│  Antes: S/450 (🔴 Debe)          Después: S/250 (🟡 Pendiente)        │
│  Vendedor: Registró abono offline, sync automático cuando hay conexión │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎬 Animación 3: Vendedor Sin Internet Todo el Día

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ESCENARIO: Vendedor en zona rural SIN internet durante 8 horas        │
└─────────────────────────────────────────────────────────────────────────┘

⏰ 6:00 AM
┌─────────────────────────────────────────────────────────────────────────┐
│ 📡 CONEXIÓN: ❌ OFFLINE                                                │
│                                                                         │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│ │ Cliente │  │ Venta   │  │ Venta   │  │ Cliente │  │ Venta   │  ...  │
│ │ Nuevo   │  │ S/84    │  │ S/96    │  │ Deuda   │  │ S/72    │       │
│ │ Juan    │  │ Contado │  │ Crédito │  │ S/200   │  │ Contado │       │
│ └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│                                                                         │
│ 💾 12 operaciones guardadas LOCALMENTE                                 │
│ 📊 Vendido: 25kg | Total: S/252 | Pendiente: S/200                    │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
⏰ 2:00 PM - Llega a zona con internet
┌─────────────────────────────────────────────────────────────────────────┐
│ 📡 CONEXIÓN: ✅ ONLINE                                                 │
│                                                                         │
│ 🔄 Sync automático...                                                   │
│                                                                         │
│ ✅ 12/12 operaciones sincronizadas                                     │
│                                                                         │
│ 📊 El admin ve en tiempo real:                                         │
│ • Juan: 5 ventas, S/252                                                │
│ • Cliente Juan: 新 cliente synced                                       │
│ • Cliente Ana: S/200 deuda registrada                                  │
└─────────────────────────────────────────────────────────────────────────┘

MENSAJE:
"Nunca perdí una venta por falta de internet.
Todo se registró y sync cuando volví a tener señal."
— Juan, vendedor
```

---

## 📱 Representación Visual para Landing

### Diagrama de Flujo (Static)

```
┌──────────────┐
│   ADMIN      │
│  ASIGNA     │
│  50kg       │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                      📡 SYNC                                 │
│                  (cuando hay conexión)                       │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  VENDEDOR 1  │     │  VENDEDOR 2  │     │  VENDEDOR 3  │
│  50kg        │     │  40kg        │     │  60kg        │
│  💰💰💰     │     │  💰💰        │     │  💰💰💰💰    │
│  35kg vend  │     │  38kg vend   │     │  42kg vend   │
│  15kg rest  │     │  2kg rest    │     │  18kg rest   │
└──────────────┘     └──────────────┘     └──────────────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │    💾 OFFLINE STORAGE  │
              │  (IndexedDB local)    │
              └───────────┬────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │      📡 SYNC          │
              │  (auto when online)   │
              └───────────┬────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │   🖥️  DASHBOARD ADMIN │
              │   📊 Tiempo real       │
              └────────────────────────┘
```

---

## 🎨 Para Implementar en Landing (CSS/Framer Motion)

### Concepto Visual

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   ☀️ Mañana                    🌞 Día                       🌙 Noche  │
│                                                                         │
│   ┌───────┐                   ┌───────┐                    ┌───────┐  │
│   │ 📦 50kg│                   │ 🛒 🛒 🛒│                   │ 📊 📋  │  │
│   │ Asignado                   │ Vendiendo                 │ Cierre  │  │
│   └───┬───┘                   └───┬───┘                    └───┬───┘  │
│       │   ──────────────────────────│   ───────────────────────│      │
│       │   Sync ↓                   │   Offline ↓              │ Sync ↓│
│       ▼                            ▼                          ▼      │
│   ┌─────────────────────────────────────────────────────────────────┐│
│   │              📱 PANTALLA VENDEDOR (MOBILE)                     ││
│   │                                                                 ││
│   │    ┌──────────────────────────────────────────────────────┐    ││
│   │    │ 📡 OFFLINE MODE    │ 2 operaciones pendientes       │    ││
│   │    └──────────────────────────────────────────────────────┘    ││
│   │                                                                 ││
│   │    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          ││
│   │    │    🛒   │ │    👥   │ │    📋   │ │    ⚙️   │          ││
│   │    │  Venta  │ │Cliente  │ │ Hist.   │ │  Sync   │          ││
│   │    └─────────┘ └─────────┘ └─────────┘ └─────────┘          ││
│   │                                                                 ││
│   └─────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Animación Sugerida

1. **Secuencia 1:** Admin arrastra "50kg" al vendedor → Sync flash
2. **Secuencia 2:** Vendedor hace "tap tap tap" = ventas aparecen
3. **Secuencia 3:** Indicador offline parpadea mientras trabaja
4. **Secuencia 4:** Llega internet → "Whoosh" - todo sync

---

## 📺 GIF/Mación

Para crear un GIF real, puedes usar:

| Herramienta | Uso |
|-------------|-----|
| **Excalidraw** | Diagramas animados a mano |
| **Figma** | Mockups animados |
| **After Effects** | Animación profesional |
| **Lottie** | Animaciones web ligeras |
| **Remotion** | Videos desde código |

---

## 🔗 Relacionado

- Landing: [README.md](./README.md)
- Features: [FEATURES.md](./FEATURES.md)
- Valores: [VALUE-PROPOSITION.md](./VALUE-PROPOSITION.md)

---

*Este documento muestra el flujo visual para la landing page.*
