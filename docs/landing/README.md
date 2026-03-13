# Avileo - Landing Page Proposal

> Landing page content proposal for Avileo SaaS. Adaptable for poultry businesses and small businesses.

---

## 🚀 Quick Summary

**Product Name:** Avileo (PollosPro)
**Tagline:** "Vende sin internet - Sistema de gestión offline-first para negocios locales"
**Primary Value:** 100% offline sales operations with automatic sync

**Target Markets:**
1. Poultry businesses (avícolas) - current focus
2. Small businesses with mobile vendors - expansion opportunity
3. Any local business with field sales teams

---

## 📄 Landing Page Structure

### 1. Hero Section

```
┌─────────────────────────────────────────────────────────────┐
│                     🐔 AVILEO                                │
│                                                             │
│         Vende sin internet.                                  │
│         Trabaja sin límites.                                │
│                                                             │
│   ╔═══════════════════════════════════════════════════╗   │
│   ║  [Comenzar Prueba Gratis]  [Ver Demo]            ║   │
│   ╚═══════════════════════════════════════════════════╝   │
│                                                             │
│   ✓ 100% Offline    ✓ Sin configurar servidores          │
│   ✓ Sincronización automática    ✓ Interfaz intuitiva    │
└─────────────────────────────────────────────────────────────┘
```

**Copy Options:**
- "El sistema de ventas que funciona donde otros no"
- "Tu negocio nunca se detiene - ni siquiera sin internet"
- "Vende, cobra y gestiona desde cualquier lugar"

---

### 2. Problem/Solution Section

**The Problem:**
- Vendors work in areas with poor/no internet (markets, streets, rural zones)
- Traditional systems require constant connectivity
- Lost sales, frustrated customers, inefficient operations

**Our Solution:**
- Offline-first architecture
- Full functionality without internet
- Automatic sync when connection returns

---

### 3. Key Benefits Grid

| Benefit | Description | Icon |
|---------|-------------|------|
| **100% Offline** | Todas las operaciones funcionan sin internet | 📡 |
| **Sync Automático** | Sincroniza datos cuando hay conexión | 🔄 |
| **Sin Servidores** | No necesitas infraestructura IT | ☁️ |
| **Multi-Vendedor** | Gestiona tu equipo desde un solo lugar | 👥 |
| **Control de Stock** | Controla inventario y asignaciones | 📦 |
| **Cuentas por Cobrar** | Seguimiento de deudas de clientes | 💰 |

---

### 4. Features Section

#### For Poultry Businesses (Avícolas)

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   🧮            │  │   🛒            │  │   👥            │
│  Calculadora    │  │   Ventas        │  │  Clientes       │
│  Inteligente    │  │  con/sin        │  │  y Deudas       │
│                 │  │  cliente        │  │                 │
│  Peso + precio  │  │                 │  │  Seguimiento    │
│  = monto total  │  │  Contado/Crédito│  │  completo       │
└──────────────────┘  └──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   📦            │  │   📊            │  │   🔄            │
│  Inventario     │  │  Reportes        │  │  Distribu-       │
│  y Asignación   │  │  y Métricas      │  │  ción Diaria    │
│                 │  │                 │  │                 │
│  Control de kg  │  │  Exportar Excel │  │  Asigna a        │
│  por vendedor   │  │  Ventas por día │  │  tu equipo      │
└──────────────────┘  └──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐
│   💬            │  │   📱            │
│  WhatsApp       │  │  App Móvil      │
│  Integration    │  │  Offline        │
│                 │  │                 │
│  Comparte       │  │  100% sin      │
│  comprobantes   │  │  internet      │
└──────────────────┘  └──────────────────┘
```

#### For Small Businesses (Generic)

The same system adapts to:
- Delivery businesses
- Food trucks
- Market vendors
- Small retail with sales reps

---

### 5. How It Works (3 Steps)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    1️⃣      │     │    2️⃣      │     │    3️⃣      │
│  REGISTRA   │ ──► │   VENDE    │ ──► │  SINCRONIZA │
│             │     │             │     │             │
│  Crea tus   │     │  Trabaja    │     │  Los datos  │
│  clientes,   │     │  sin internet│    │  se syncan  │
│  productos  │     │  en cualquier│    │  automática-│
│  y precios  │     │  momento     │     │  mente      │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

### 6. Technical Stack Section

| Component | Technology |
|-----------|------------|
| Frontend | React + TypeScript |
| Local Database | PGlite (SQLite in WASM) |
| Backend | ElysiaJS + Bun |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Better Auth (JWT) |
| Sync | Custom offline-first engine |

*"Tecnología moderna que simplemente funciona"*

---

### 7. Testimonials / Use Cases

**Scenario 1: El vendedor en el mercado**
> "Trabajo en el mercado de Caquetá todo el día. Antes no podía registrar ventas cuando fallaba el internet. Ahora todo funciona y cuando tengo señal se synca solo." - Juan, vendedor de pollo

**Scenario 2: El administrador**
> "Desde que usamos Avileo, puedo ver las ventas de todos mis vendedores en tiempo real. Sé cuánto vendió cada uno y quién debe." - María, propietaria de avícola

**Scenario 3: Zona rural**
> "Mis vendedores van a distritos donde no hay internet. Ahora pueden trabajar todo el día sin problemas." - Carlos, distribuidor de pollo

---

### 8. Pricing Section

```
┌─────────────────────────────────────────────────────────┐
│                    PLANES                                │
├─────────────────┬─────────────────┬───────────────────┤
│   🆓 BÁSICO    │   💼 PRO        │   🏢 EMPRESA      │
│                 │                 │                   │
│   S/0/mes       │   S/99/mes     │   Custom          │
│                 │                 │                   │
│  • 1 usuario    │  • 5 usuarios  │  • Usuarios       │
│  • Ventas basic │  • full offline │    ilimitados     │
│  • Sync manual │  • reportes     │  • API access     │
│                 │  • inventario   │  • Soporte 24/7  │
│                 │                 │                   │
│  [Comenzar]    │  [Comenzar]     │  [Contactar]     │
└─────────────────┴─────────────────┴───────────────────┘
```

---

### 9. FAQ Section

**¿Realmente funciona sin internet?**
> Sí. Todas las pantallas del vendedor funcionan 100% sin conexión. Las ventas, clientes y cálculos se guardan localmente y se sincronizan cuando hay conexión.

**¿Qué pasa si hay conflicto de datos?**
> El sistema detecta conflictos automáticamente. La mayoría se resuelven con reglas de "último gana", pero en casos complejos se notifica al administrador.

**¿Necesito instalar servidores?**
> No. Avileo es SaaS. Solo necesitas los dispositivos de tus vendedores (celulares/tablets) y conexión a internet para el administrador.

**¿Cómo se sincronizan los datos?**
> Automáticamente cada 30 segundos cuando hay conexión. También puedes forzar sync manual en cualquier momento.

---

### 10. CTA Section

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   ¿Listo para transformar tu negocio?                   │
│                                                         │
│   ╔═════════════════════════════════════════════════╗  │
│   ║  [Comenzar Prueba Gratis de 14 días]           ║  │
│   ║         No se requiere tarjeta de crédito        ║  │
│   ╚═════════════════════════════════════════════════╝  │
│                                                         │
│   📧 contacto@avileo.com                               │
│   📱 +51 999 999 999                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Value Propositions by Business Type

### For Avícolas (Poultry)

| Pain Point | Solution |
|------------|----------|
| No control de inventario | Asignación diaria de kilos por vendedor |
| No saben quién debe | Seguimiento de cuentas por cobrar |
| Ventas perdidas sin internet | 100% offline |
| No hay reportes | Dashboard con métricas y export Excel |

### For Small Businesses (Generic)

| Pain Point | Solution |
|------------|----------|
| Vendedores en campo sin control | Registro de ventas móvil offline |
| No hay visibilidad de operaciones | Dashboard en tiempo real |
| Proceso manual de cobros | Seguimiento de abonos y deudas |
| Dependencia de internet | Offline-first architecture |

---

## 📱 Screens to Showcase

Consider showing these mockups on the landing page:

1. **Mobile - Dashboard** (with inventory status)
2. **Mobile - New Sale** (calculator + customer selection)
3. **Mobile - Sales History** (with sync status)
4. **Desktop - Admin Dashboard** (metrics + charts)
5. **Desktop - Distribution** (assignments by vendor)

---

## 🔍 SEO Keywords

Spanish (Peru):

- "sistema de ventas offline"
- "gestión de avícola"
- "control de inventario polyg"
- "software para vendedores"
- "sistema de ventas sin internet"
- "control de clientes y deudas"
- "distribución de inventario"
- "reportes de ventas"

---

## 📝 Next Steps

1. **Design Mockups** - Create visual mockups for hero, features, pricing
2. **Screenshots** - Capture real screenshots from the app
3. **Domain** - Register avileo.com (or similar)
4. **Hosting** - Deploy in Vercel/Netlify
5. **Analytics** - Set up tracking

---

## 📂 Related Documentation

- Mobile screens: `docs/screens/mobile-vendedor.md`
- Desktop screens: `docs/screens/desktop-admin.md`
- Technical plan: `docs/technical/offline-plan.md`
- Architecture: `docs/ARCHITECTURE.md`

---

*This is a living document. Update as the product evolves.*
