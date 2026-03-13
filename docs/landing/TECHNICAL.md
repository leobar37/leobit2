# Landing Page - Technical Implementation

> Implementation guide for building the landing page within the Avileo React app.

---

## 📁 Project Structure

```
packages/app/
├── app/
│   ├── routes/
│   │   ├── _index.tsx          # Landing page
│   │   ├── pricing.tsx         # Pricing page
│   │   ├── features.tsx        # Features page
│   │   ├── demo.tsx            # Demo request
│   │   └── contact.tsx         # Contact form
│   └── components/
│       └── landing/            # Landing components
│           ├── hero.tsx
│           ├── features-grid.tsx
│           ├── how-it-works.tsx
│           ├── testimonials.tsx
│           ├── pricing-table.tsx
│           ├── faq.tsx
│           └── cta.tsx
└── docs/
    └── landing/                # This documentation
```

---

## 🎨 Design System

### Colors

| Purpose | Color | Hex |
|---------|-------|-----|
| Primary | Orange | `#f97316` |
| Primary Dark | Orange 600 | `#ea580c` |
| Primary Light | Orange 100 | `#ffedd5` |
| Background | Slate 950 | `#020617` |
| Surface | Slate 900 | `#0f172a` |
| Surface Light | Slate 800 | `#1e293b` |
| Text Primary | White | `#ffffff` |
| Text Secondary | Slate 400 | `#94a3b8` |
| Success | Green | `#22c55e` |
| Warning | Yellow | `#eab308` |
| Error | Red | `#ef4444` |

### Typography

- **Headings:** Inter (Bold)
- **Body:** Inter (Regular)
- **Monospace:** JetBrains Mono (for code/numbers)

### Components

Use existing shadcn/ui components:
- `Button` - Primary CTAs
- `Card` - Feature cards, pricing
- `Accordion` - FAQ
- `Badge` - Status indicators
- `Input` - Contact form
- `Textarea` - Contact form

---

## 📱 Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, stacked |
| Tablet | 640px - 1024px | Two columns |
| Desktop | > 1024px | Full layout, max-width 1280px |

---

## 🔧 Implementation Checklist

### Phase 1: Landing Page Structure

- [ ] Create landing route (`app/routes/_index.tsx`)
- [ ] Hero section with logo and CTAs
- [ ] Navigation header (minimal, for landing)
- [ ] Footer with links

### Phase 2: Content Sections

- [ ] Problem/Solution section
- [ ] Features grid (3x2 on desktop)
- [ ] How It Works (3 steps)
- [ ] Screenshots/Mockups carousel

### Phase 3: Trust Building

- [ ] Testimonials section
- [ ] Technical stack badges
- [ ] Security/trust badges

### Phase 4: Conversion

- [ ] Pricing section
- [ ] FAQ accordion
- [ ] Final CTA section
- [ ] Contact form

### Phase 5: Polish

- [ ] Animations (fade-in on scroll)
- [ ] Mobile menu
- [ ] SEO meta tags
- [ ] Open Graph images

---

## 🎯 SEO Checklist

### Meta Tags

```tsx
<title>Avileo - Sistema de Ventas Offline para Avícolas</title>
<meta name="description" content="Sistema de gestión de ventas 100% offline. Vende sin internet, controla inventario y clientes. Ideal para avícolas y negocios locales." />
<meta name="keywords" content="sistema de ventas, offline, avícola, inventario, control de clientes" />
```

### Open Graph

```tsx
<meta property="og:title" content="Avileo - Vende sin internet" />
<meta property="og:description" content="El sistema de ventas que funciona donde otros no. 100% offline." />
<meta property="og:image" content="/og-image.png" />
<meta property="og:url" content="https://avileo.com" />
```

### Structured Data

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Avileo",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, iOS, Android",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "PEN"
  }
}
```

---

## 📊 Analytics Setup

### Events to Track

| Event | Description | Trigger |
|-------|-------------|---------|
| `landing_view` | Page view | On load |
| `cta_click` | CTA button click | On click |
| `pricing_view` | Pricing section view | On scroll into view |
| `demo_request` | Demo requested | Form submit |
| `contact_submit` | Contact form submit | Form submit |

### Tools

- **Analytics:** Plausible or Google Analytics 4
- **Heatmaps:** Hotjar or Microsoft Clarity
- **Form:** Built-in or Formspree

---

## 🚀 Deployment

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Option 2: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

### Option 3: Self-Hosted

```bash
# Build
bun run build

# Output in packages/app/dist/
```

---

## 🔒 Security Considerations

- No sensitive data on landing page
- Contact form should have CAPTCHA
- Rate limit form submissions
- Use HTTPS only

---

## 📝 Content Guidelines

### Tone

- Professional but approachable
- Spanish (Peru locale: "es-PE")
- Focus on benefits, not features
- Use social proof

### Writing Tips

- Short sentences
- Active voice
- Benefits > features
- Use "tú" for informal
- Avoid technical jargon

---

## 🔄 Landing vs App Routes

| Route | Layout | Auth | Purpose |
|-------|--------|------|---------|
| `/` | Landing | No | Marketing |
| `/pricing` | Landing | No | Conversion |
| `/features` | Landing | No | Education |
| `/demo` | Landing | No | Lead gen |
| `/login` | Auth | No | User login |
| `/_protected/*` | App | Yes | User dashboard |

---

## 📋 Copy Quick Reference

### Hero Headlines

```
Vende sin internet. Trabaja sin límites.

El sistema de ventas que funciona donde otros no.

Tu negocio nunca se detiene - ni siquiera sin internet.

100% offline. 100% tu negocio.
```

### CTA Buttons

```
Primary: "Comenzar prueba gratis"
Secondary: "Ver demo"
Tertiary: "Hablamos"
```

### Section Titles

```
- El problema
- Nuestra solución
- Cómo funciona
- Características
- Testimonios
- Precios
- Preguntas frecuentes
- ¿Listo para empezar?
```

---

*Last updated: 2026-03-13*
