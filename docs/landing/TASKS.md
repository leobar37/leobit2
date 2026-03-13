# Landing Page Implementation Tasks

> Task file for implementing Avileo landing page.
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

## 📂 File Index

### 🔄 Existing Files to Modify

| File | Purpose |
|------|---------|
| `packages/app/app/routes/_index.tsx` | Current root - redirects to login/dashboard |
| `packages/app/app/routes/login.tsx` | Existing login page for reference |
| `packages/app/tailwind.config.js` | Brand colors reference |
| `packages/app/app/components/ui/` | Existing shadcn/ui components to reuse |

### 🆕 Files to Create

| File | Purpose |
|------|---------|
| `packages/app/app/routes/landing.tsx` | Main landing page route |
| `packages/app/app/components/landing/hero.tsx` | Hero section |
| `packages/app/app/components/landing/features-grid.tsx` | Features showcase |
| `packages/app/app/components/landing/flow-animation.tsx` | Distribution workflow animation |
| `packages/app/app/components/landing/testimonials.tsx` | Testimonials section |
| `packages/app/app/components/landing/pricing.tsx` | Pricing section |
| `packages/app/app/components/landing/faq.tsx` | FAQ accordion |
| `packages/app/app/components/landing/cta.tsx` | Final call-to-action |
| `packages/app/app/components/landing/footer.tsx` | Landing footer |

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

## 🔧 Implementation Steps

### Phase 1: Route Setup

- [ ] **Step 1:** Create new route `app/routes/landing.tsx`
- [ ] **Step 2:** Configure route to be public (no auth required)
- [ ] **Step 3:** Set up SEO meta tags (title, description, OG tags)

**File:** `packages/app/app/routes/landing.tsx`

### Phase 2: Hero Section

- [ ] **Step 4:** Create Hero component with:
  - Logo and tagline ("Vende sin internet. Trabaja sin límites.")
  - Primary CTA: "Comenzar prueba gratis"
  - Secondary CTA: "Ver demo"
  - Trust badges: "100% Offline", "Sin servidores", "Sync automático"

**Reference:** `docs/landing/README.md` - Hero Section

**File:** `packages/app/app/components/landing/hero.tsx`

### Phase 3: Features Grid

- [ ] **Step 5:** Create Features Grid with 6 main features:
  - 🧮 Smart Calculator
  - 🛒 Sales (with/without customer)
  - 👥 Customers & Debts
  - 📦 Inventory & Distribution
  - 📊 Reports & Analytics
  - 💬 WhatsApp Integration
  - 📱 100% Offline Mobile App

**Reference:** `docs/landing/FEATURES.md` - Feature list

**File:** `packages/app/app/components/landing/features-grid.tsx`

### Phase 4: Distribution Workflow Animation

- [ ] **Step 6:** Create animated flow showing:
  - Admin assigns inventory (morning)
  - Vendor sells offline (day)
  - Sync when online (evening)
  - Dashboard updates

**Reference:** `docs/landing/ANIMATION.md` - Animation concepts

**File:** `packages/app/app/components/landing/flow-animation.tsx`

### Phase 5: Value Propositions

- [ ] **Step 7:** Add section highlighting key value propositions:
  - "Vende sin internet. Siempre."
  - "No pierdes ventas por falta de conexión"
  - "Tu cliente tiene su comprobante al instante" (WhatsApp)
  - "Controla lo que le das a cada vendedor" (Distribution)

**Reference:** `docs/landing/VALUE-PROPOSITION.md`

### Phase 6: Testimonials

- [ ] **Step 8:** Add testimonials section with 3 testimonials:
  - Juan (market vendor) - offline focus
  - María (owner) - control focus
  - Carlos (distributor) - rural focus

**Reference:** `docs/landing/VALUE-PROPOSITION.md` - Testimonials

**File:** `packages/app/app/components/landing/testimonials.tsx`

### Phase 7: Pricing

- [ ] **Step 9:** Create pricing section with 3 tiers:
  - 🆓 Free: 1 user, basic features
  - 💼 Pro: 5 users, full features, S/99/month
  - 🏢 Enterprise: Custom pricing

**Reference:** `docs/landing/README.md` - Pricing Section

**File:** `packages/app/app/components/landing/pricing.tsx`

### Phase 8: FAQ

- [ ] **Step 10:** Create FAQ accordion with common questions:
  - "Does it really work offline?"
  - "Do I need servers?"
  - "How does sync work?"
  - "What about conflicts?"

**Reference:** `docs/landing/README.md` - FAQ Section

**File:** `packages/app/app/components/landing/faq.tsx`

### Phase 9: Final CTA

- [ ] **Step 11:** Create final CTA section:
  - "Listo para transformar tu negocio?"
  - Primary button: "Comenzar prueba gratis"
  - Trust: "No se requiere tarjeta de crédito"
  - Contact info: email, phone

**File:** `packages/app/app/components/landing/cta.tsx`

### Phase 10: Footer

- [ ] **Step 12:** Create landing-specific footer:
  - Logo
  - Links: Features, Pricing, Contact
  - Social/contact info
  - Copyright

**File:** `packages/app/app/components/landing/footer.tsx`

### Phase 11: Polish

- [ ] **Step 13:** Add scroll animations (fade-in)
- [ ] **Step 14:** Ensure mobile responsiveness
- [ ] **Step 15:** Add Open Graph meta tags
- [ ] **Step 16:** Test all CTAs

---

## 📑 Step-File Mapping

| Step | Files |
|------|-------|
| 1-3 | `app/routes/landing.tsx` |
| 4 | `app/components/landing/hero.tsx` |
| 5 | `app/components/landing/features-grid.tsx` |
| 6 | `app/components/landing/flow-animation.tsx` |
| 7 | `app/components/landing/hero.tsx` or new |
| 8 | `app/components/landing/testimonials.tsx` |
| 9 | `app/components/landing/pricing.tsx` |
| 10 | `app/components/landing/faq.tsx` |
| 11 | `app/components/landing/cta.tsx` |
| 12 | `app/components/landing/footer.tsx` |
| 13-16 | Multiple |

---

## 🎨 Design Reference

### Colors (from existing brand)

```css
/* Primary */
--color-primary: #f97316;        /* orange-500 */
--color-primary-dark: #ea580c;   /* orange-600 */
--color-primary-light: #ffedd5; /* orange-100 */

/* Background */
--color-bg: #020617;             /* slate-950 */
--color-surface: #0f172a;        /* slate-900 */
--color-surface-light: #1e293b;  /* slate-800 */
```

### Components to Reuse

- `Button` - Primary CTAs
- `Card` - Feature cards, pricing
- `Accordion` - FAQ
- `Badge` - Status indicators

---

## ✅ Ready to Proceed?

This task file is ready. To start implementation:

1. Review the documentation in `docs/landing/`
2. Approve the plan
3. Execute Phase 1 (Route Setup)

---

*Created: 2026-03-13*
*Reference: docs/landing/*
