# Landing Page Implementation Tasks - System Design

> Task file for implementing Avileo landing page with full system design.
> Documentation reference: `docs/landing/`

---

## 📋 Task Summary

Implement a marketing landing page for Avileo SaaS product. The landing page will showcase the offline-first sales system for poultry businesses and small businesses.

---

## 🎯 Goal

Create a public landing page at `/landing` (or `/`) that:
- Highlights offline-first capability as main value proposition
- Showcases features: Sales, Customers, Inventory, Distribution, WhatsApp Integration
- Provides clear CTAs for sign-up
- Works on mobile and desktop
- Is visually consistent with existing Avileo brand (orange theme)

---

## 🏗️ System Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AVILEO LANDING PAGE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                        ROUTING LAYER                                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │  │
│  │  │ /landing    │  │ /landing    │  │ /landing/pricing       │   │  │
│  │  │ (main page) │  │ #features   │  │ (future)               │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘   │  │
│  │                                                                      │  │
│  │  Note: Landing routes are PUBLIC (no auth required)                │  │
│  │  Similar to /login and /register                                   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                       │
│                                    ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                     COMPONENT LAYER                                  │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐          │  │
│  │  │   Hero    │ │  Features │ │   Flow    │ │Testimonials│          │  │
│  │  │  Section  │ │   Grid    │ │Animation │ │  Section  │          │  │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘          │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐          │  │
│  │  │  Pricing  │ │   FAQ    │ │    CTA    │ │  Footer   │          │  │
│  │  │  Section  │ │ Accordion│ │  Section  │ │           │          │  │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘          │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                       │
│                                    ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                     DESIGN SYSTEM LAYER                              │  │
│  │  ┌─────────────────────────────────────────────────────────────┐    │  │
│  │  │  Existing shadcn/ui Components (reuse)                     │    │  │
│  │  │  • Button, Card, Badge, Accordion                         │    │  │
│  │  │  • Input, Textarea (for contact forms)                    │    │  │
│  │  └─────────────────────────────────────────────────────────────┘    │  │
│  │  ┌─────────────────────────────────────────────────────────────┐    │  │
│  │  │  Custom Components                                         │    │  │
│  │  │  • FeatureCard, TestimonialCard, PricingCard              │    │  │
│  │  │  • FlowDiagram (animated), CTASection                     │    │  │
│  │  └─────────────────────────────────────────────────────────────┘    │  │
│  │  ┌─────────────────────────────────────────────────────────────┐    │  │
│  │  │  Animations (CSS/Tailwind - no external libs)             │    │  │
│  │  │  • Fade-in on scroll (IntersectionObserver)               │    │  │
│  │  │  • Flow diagram animation                                 │    │  │
│  │  │  • Hover effects, transitions                             │    │  │
│  │  └─────────────────────────────────────────────────────────────┘    │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technical Stack & Skills

### Primary Skills Required

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| **frontend** | Build React UI components, forms, responsive layouts | All component building |
| **avileo** | Project-specific context, brand colors, existing patterns | Maintain consistency |

### Secondary Skills (if needed)

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| **animate** | Add micro-interactions and animations | Polish phase |
| **delight** | Add personality and unexpected touches | Final polish |
| **polish** | Fix alignment, spacing, consistency | Before launch |

### Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Routing** | React Router v7 (flatRoutes) | Already in project |
| **Styling** | Tailwind CSS + existing design system | Already configured |
| **Animations** | CSS + Tailwind + IntersectionObserver | No framer-motion in project |
| **Icons** | lucide-react | Already in dependencies |
| **Forms** | react-hook-form + zod | Already in project |
| **Components** | Extend existing shadcn/ui | Already available |

### Dependencies to Install

```json
{
  "to-install": [
    "framer-motion"  // For animations
  ],
  "existing": [
    "react-router",
    "tailwindcss",
    "lucide-react",
    "react-hook-form",
    "zod",
    "@radix-ui/react-accordion",
    "@radix-ui/react-dialog"
  ]
}
```

**Installation:**
```bash
cd packages/app && bun add framer-motion
```

---

## 📂 File Index

### 🔄 Existing Files to Modify

| File | Purpose | Changes |
|------|---------|---------|
| `packages/app/app/routes/_index.tsx` | Current root | May redirect to landing |
| `packages/app/app/routes/login.tsx` | Reference | Pattern for public route |
| `packages/app/tailwind.config.js` | Brand colors | Verify orange theme |
| `packages/app/app/components/ui/` | Reuse | Button, Card, Badge, etc. |

### 🆕 Files to Create

| File | Purpose | Component Type |
|------|---------|----------------|
| `packages/app/app/routes/landing.tsx` | Main landing page | Route |
| `packages/app/app/components/landing/hero.tsx` | Hero section | Feature |
| `packages/app/app/components/landing/features-grid.tsx` | Features showcase | Feature |
| `packages/app/app/components/landing/flow-animation.tsx` | Distribution workflow | Feature |
| `packages/app/app/components/landing/testimonials.tsx` | Testimonials section | Feature |
| `packages/app/app/components/landing/pricing.tsx` | Pricing section | Feature |
| `packages/app/app/components/landing/faq.tsx` | FAQ accordion | Feature |
| `packages/app/app/components/landing/cta.tsx` | Final call-to-action | Feature |
| `packages/app/app/components/landing/footer.tsx` | Landing footer | Feature |
| `packages/app/app/components/landing/feature-card.tsx` | Reusable card | UI |
| `packages/app/app/components/landing/testimonial-card.tsx` | Testimonial card | UI |
| `packages/app/app/components/landing/pricing-card.tsx` | Pricing card | UI |

---

## 📚 Reference Documentation

All implementation should follow the documentation in `docs/landing/`:

| Document | Content |
|----------|---------|
| `docs/landing/README.md` | Main landing structure, sections, CTAs |
| `docs/landing/FEATURES.md` | Detailed feature list for showcase |
| `docs/landing/VALUE-PROPOSITION.md` | Value propositions per business type |
| `docs/landing/TECHNICAL.md` | Design system, colors, implementation guide |
| `docs/landing/ANIMATION.md` | Animation concepts for distribution flow |

---

## 🎯 Implementation Phases

### Phase 1: Route & Layout Setup
**Skills: frontend, avileo**

- [ ] **Step 0 (Prerrequisite):** Install framer-motion
  ```bash
  cd packages/app && bun add framer-motion
  ```

- [ ] **Step 1:** Create `app/routes/landing.tsx` (public route, no auth)
- [ ] **Step 2:** Set up basic layout with gradient background
- [ ] **Step 3:** Configure SEO meta tags (title, description, OG)
- [ ] **Step 4:** Add to navigation (decide: replace root or add /landing)

**Files:**
- `app/routes/landing.tsx` (NEW)

### Phase 2: Hero Section
**Skills: frontend, avileo**

- [ ] **Step 5:** Create Hero component with:
  - Logo and tagline ("Vende sin internet. Trabaja sin límites.")
  - Primary CTA: "Comenzar prueba gratis"
  - Secondary CTA: "Ver demo"
  - Trust badges: "100% Offline", "Sin servidores", "Sync automático"
- [ ] **Step 6:** Implement responsive design (mobile-first)
- [ ] **Step 7:** Add subtle entrance animation

**Files:**
- `app/components/landing/hero.tsx` (NEW)
- `app/components/ui/button.tsx` (reuse)

### Phase 3: Features Grid
**Skills: frontend, avileo**

- [ ] **Step 8:** Create FeatureCard reusable component
- [ ] **Step 9:** Build Features Grid with 6 main features:
  - 🧮 Smart Calculator
  - 🛒 Sales (with/without customer)
  - 👥 Customers & Debts
  - 📦 Inventory & Distribution
  - 📊 Reports & Analytics
  - 💬 WhatsApp Integration
- [ ] **Step 10:** Add hover effects and micro-interactions

**Files:**
- `app/components/landing/feature-card.tsx` (NEW)
- `app/components/landing/features-grid.tsx` (NEW)

### Phase 4: Flow Animation
**Skills: frontend, avileo, animate**

- [ ] **Step 11:** Create animated flow diagram showing:
  - Admin assigns inventory (morning) → Sync
  - Vendor sells offline (day)
  - Sync when online (evening)
  - Dashboard updates
- [ ] **Step 12:** Implement CSS keyframe animations
- [ ] **Step 13:** Add IntersectionObserver for scroll-triggered animations

**Files:**
- `app/components/landing/flow-animation.tsx` (NEW)

### Phase 5: Value Propositions
**Skills: frontend, avileo**

- [ ] **Step 14:** Add section highlighting key value propositions
- [ ] **Step 15:** Create visual hierarchy with icons and colors

**Files:**
- `app/components/landing/hero.tsx` or new section

### Phase 6: Testimonials
**Skills: frontend, avileo**

- [ ] **Step 16:** Create TestimonialCard component
- [ ] **Step 17:** Build Testimonials section with 3 testimonials:
  - Juan (market vendor) - offline focus
  - María (owner) - control focus
  - Carlos (distributor) - rural focus

**Files:**
- `app/components/landing/testimonial-card.tsx` (NEW)
- `app/components/landing/testimonials.tsx` (NEW)

### Phase 7: Pricing
**Skills: frontend, avileo**

- [ ] **Step 18:** Create PricingCard component
- [ ] **Step 19:** Build Pricing section with 3 tiers:
  - 🆓 Free: 1 user, basic features
  - 💼 Pro: 5 users, full features, S/99/month
  - 🏢 Enterprise: Custom pricing

**Files:**
- `app/components/landing/pricing-card.tsx` (NEW)
- `app/components/landing/pricing.tsx` (NEW)

### Phase 8: FAQ
**Skills: frontend, avileo**

- [ ] **Step 20:** Use existing `@radix-ui/react-accordion`
- [ ] **Step 21:** Build FAQ accordion with common questions

**Files:**
- `app/components/landing/faq.tsx` (NEW)
- `app/components/ui/accordion.tsx` (reuse or extend)

### Phase 9: CTA & Footer
**Skills: frontend, avileo**

- [ ] **Step 22:** Create CTA section:
  - "Listo para transformar tu negocio?"
  - Primary button: "Comenzar prueba gratis"
  - Trust: "No se requiere tarjeta de crédito"
  - Contact info
- [ ] **Step 23:** Create landing-specific footer

**Files:**
- `app/components/landing/cta.tsx` (NEW)
- `app/components/landing/footer.tsx` (NEW)

### Phase 10: Polish & Testing
**Skills: animate, polish, delight**

- [ ] **Step 24:** Add scroll animations (fade-in)
- [ ] **Step 25:** Mobile responsiveness verification
- [ ] **Step 26:** Open Graph meta tags
- [ ] **Step 27:** Lighthouse performance check
- [ ] **Step 28:** Cross-browser testing
- [ ] **Step 29:** Final copy review

---

## 📑 Step-Skill Mapping

| Phase | Steps | Primary Skills | Notes |
|-------|-------|----------------|-------|
| 1 | 1-4 | frontend, avileo | Route setup |
| 2 | 5-7 | frontend, avileo | Hero with Framer Motion |
| 3 | 8-10 | frontend, avileo | Features grid with animations |
| 4 | 11-13 | frontend, avileo | Flow animation with Framer Motion |
| 5 | 14-15 | frontend, avileo | Value propositions |
| 6 | 16-17 | frontend, avileo | Testimonials |
| 7 | 18-19 | frontend, avileo | Pricing |
| 8 | 20-21 | frontend, avileo | FAQ |
| 9 | 22-23 | frontend, avileo | CTA & Footer |
| 10 | 24-29 | polish, delight | Final refinement |

**Note:** Framer Motion is used directly via `motion` component from `framer-motion` package.

---

## 🔧 Technical Considerations

### Routing Strategy

**Option A: Replace Root (`/`)**
- Landing becomes the new home page
- Login moves to `/login`
- Requires redirect logic for existing users

**Option B: Separate Route (`/landing`)**
- Keep existing `/` behavior
- Add `/landing` as new public page
- Safer for existing users

**Recommended:** Option B (separate route) for safer rollout

### Authentication Handling

The landing page must be PUBLIC (no auth required):
- Follow pattern from `login.tsx` - no auth check
- Don't wrap in `_protected.tsx` layout
- Use simple layout or create new `landing.tsx` layout

### Animation Strategy

Using **Framer Motion** for animations:

```typescript
// Framer Motion imports
import { motion } from "framer-motion";

// Fade-in on scroll
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.5 }}
>
  {children}
</motion.div>

// Staggered animations for lists
<motion.div
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true }}
  variants={{
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }}
>
  {items.map(item => (
    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
      {item}
    </motion.div>
  ))}
</motion.div>
```

**Common animations to use:**
- `fadeInUp` - For section entrances
- `staggerChildren` - For lists (features, pricing items)
- `whileHover` - For card hover effects
- `whileTap` - For button interactions

### SEO & Meta Tags

```typescript
// app/routes/landing.tsx
export function meta() {
  return [
    { title: "Avileo - Sistema de Ventas Offline para Avícolas" },
    { name: "description", content: "Sistema de gestión de ventas 100% offline. Vende sin internet, controla inventario y clientes. Ideal para avícolas y negocios locales." },
    { name: "keywords", content: "sistema de ventas, offline, avícola, inventario, control de clientes" },
    { property: "og:title", content: "Avileo - Vende sin internet" },
    { property: "og:description", content: "El sistema de ventas que funciona donde otros no. 100% offline." },
    { property: "og:image", content: "/og-image.png" },
    { property: "og:url", content: "https://avileo.com" },
  ];
}
```

---

## 📋 Component API Design

### FeatureCard Props

```typescript
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number; // Animation delay in ms
}
```

### TestimonialCard Props

```typescript
interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  avatar?: string;
}
```

### PricingCard Props

```typescript
interface PricingCardProps {
  title: string;
  price: string;
  period?: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}
```

---

## 🚨 Potential Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Landing vs app routing | Create separate public route |
| Reusing existing components | Extend shadcn/ui patterns |
| Performance on mobile | Use `motion.div` sparingly, lazy load sections |
| SEO for landing | Use React Router meta function |

---

## 📑 Step-File Mapping

| Phase | Step | Files |
|-------|------|-------|
| 1 | 1-4 | `app/routes/landing.tsx` |
| 2 | 5-7 | `app/components/landing/hero.tsx` |
| 3 | 8-10 | `app/components/landing/feature-card.tsx`, `features-grid.tsx` |
| 4 | 11-13 | `app/components/landing/flow-animation.tsx` |
| 5 | 14-15 | TBD based on design |
| 6 | 16-17 | `app/components/landing/testimonial-card.tsx`, `testimonials.tsx` |
| 7 | 18-19 | `app/components/landing/pricing-card.tsx`, `pricing.tsx` |
| 8 | 20-21 | `app/components/landing/faq.tsx` |
| 9 | 22-23 | `app/components/landing/cta.tsx`, `footer.tsx` |
| 10 | 24-29 | Multiple - polish |

---

## ✅ Ready to Proceed?

This system design is complete. To start implementation:

1. Review the documentation in `docs/landing/`
2. Review this system design
3. Approve the plan
4. Execute Phase 1 (Route Setup)

### Key Decisions Made:

| Decision | Choice |
|----------|--------|
| **Route** | Separate `/landing` (not replace `/`) |
| **Animations** | Framer Motion (to be installed) |
| **Components** | Extend existing shadcn/ui |
| **Primary Skills** | frontend + avileo |
| **Secondary Skills** | polish, delight |

---

*Created: 2026-03-13*
*Reference: docs/landing/*
*Skills: frontend, avileo, animate, polish, delight*
