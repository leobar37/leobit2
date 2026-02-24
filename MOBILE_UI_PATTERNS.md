# Mobile-Specific UI Patterns & Viewport Handling

**Generated:** 2025-02-24  
**Project:** Avileo (PollosPro)  
**Context:** Conversion of Modals to Drawers for Mobile-First Design

---

## Executive Summary

The Avileo project uses a **mobile-first approach** with responsive Tailwind breakpoints and a custom `useIsMobile()` hook for detecting mobile viewports. Current implementation includes modals (Dialog), sheets (Sheet), and drawers (Drawer) with emerging mobile detection patterns.

---

## 1. Mobile Detection Utilities

### Primary Hook: `useIsMobile()`

**Location:** `packages/app/app/hooks/use-mobile.ts`

```typescript
// Mobile breakpoint constant
const MOBILE_BREAKPOINT = 640; // px (sm breakpoint)

// Hook implementation
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  return isMobile;
}
```

**Key Details:**
- ✅ Detects mobile at `window.innerWidth < 640px`
- ✅ Hydration-safe (initializes after mount)
- ✅ Listens to window resize events
- ✅ Cleans up event listener on unmount

**Usage in Existing Code:**
- `packages/app/app/lib/modal/create-modal.tsx` - Uses `useIsMobile()` for responsive modals

---

## 2. Tailwind Breakpoints

**Configuration:** `packages/app/tailwind.config.js`

Default Tailwind breakpoints used throughout the project:

| Breakpoint | Min Width | Use Case |
|-----------|-----------|----------|
| `sm` | 640px | Mobile-to-tablet transition |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |

**Custom Extensions:** None - uses Tailwind defaults

### Breakpoint Usage Patterns in Codebase

| Pattern | File(s) | Purpose |
|---------|---------|---------|
| `sm:max-w-sm` | `sheet.tsx` | Limit side panel width on desktop |
| `sm:text-left` | `drawer.tsx`, `dialog.tsx` | Center text on mobile, left-align on desktop |
| `sm:flex-row` | `sheet.tsx`, `drawer.tsx` | Column layout on mobile, row on desktop |
| `px-3 sm:px-4` | `app-layout.tsx` | Tighter padding on mobile, relaxed on desktop |
| `pb-24` (mobile bottom nav) | `app-layout.tsx` | Padding for fixed bottom navigation |

---

## 3. Existing Responsive Patterns

### Pattern 1: Bottom Navigation (Mobile-First)

**File:** `packages/app/app/components/layout/app-layout.tsx`

```typescript
// Fixed bottom navigation (mobile-first)
{showBottomNav && (
  <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-orange-100 px-3 sm:px-4 py-2">
    {/* 4-item navigation menu */}
  </nav>
)}

// Main content with padding for nav
<main className={`px-3 py-4 sm:px-4 ${showBottomNav ? "pb-24" : "pb-8"}`}>
  {children}
</main>
```

**Pattern Details:**
- ✅ Fixed positioning with `bottom-0`
- ✅ Full width with `left-0 right-0`
- ✅ Responsive padding: `px-3` (mobile) → `sm:px-4` (desktop)
- ✅ Main content has `pb-24` to avoid overlap
- ✅ Z-index: `z-50` for overlay priority

### Pattern 2: Responsive Sheets (Side Panels)

**File:** `packages/app/app/components/ui/sheet.tsx`

```typescript
// Sheet content variants
const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out",
  {
    variants: {
      side: {
        left: "inset-y-0 left-0 h-full w-3/4 border-r 
               data-[state=closed]:slide-out-to-left 
               data-[state=open]:slide-in-from-left 
               sm:max-w-sm",  // ← Limit width on desktop
        right: "inset-y-0 right-0 h-full w-3/4 border-l 
                data-[state=closed]:slide-out-to-right 
                data-[state=open]:slide-in-from-right 
                sm:max-w-sm",  // ← Limit width on desktop
        top: "inset-x-0 top-0 border-b",
        bottom: "inset-x-0 bottom-0 border-t",
      },
    },
  }
);
```

**Pattern Details:**
- ✅ Mobile: Sheet takes up `w-3/4` (75% of viewport)
- ✅ Desktop: Limited to `sm:max-w-sm` (384px)
- ✅ Side options: left, right, top, bottom
- ✅ Smooth slide animations via `data-[state=...]`

### Pattern 3: Responsive Text Layout

**Files:** `sheet.tsx`, `dialog.tsx`, `drawer.tsx`

```typescript
// Header text centering on mobile, left-align on desktop
<div className="flex flex-col space-y-2 text-center sm:text-left">
  {/* Header content */}
</div>

// Footer button layout
<div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
  {/* Buttons */}
</div>
```

**Pattern Details:**
- ✅ Mobile: Column layout, centered text
- ✅ Desktop: Row layout, justified alignment
- ✅ Reverse order on mobile (cancel button at bottom)

### Pattern 4: Drawer Component (Mobile-First)

**File:** `packages/app/app/components/ui/drawer.tsx`

```typescript
// Drawer variants (bottom sheet)
const drawerVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out",
  {
    variants: {
      side: {
        bottom: "inset-x-0 bottom-0 border-t rounded-t-[20px] 
                 max-h-[85vh] overflow-y-auto",  // ← Mobile-optimized
      },
    },
    defaultVariants: {
      side: "bottom",
    },
  }
);
```

**Pattern Details:**
- ✅ Fixed to bottom (optimal for mobile)
- ✅ Max height: `85vh` (leaves space for keyboard/scroll)
- ✅ Rounded top corners: `rounded-t-[20px]`
- ✅ Vertical scroll: `overflow-y-auto`

---

## 4. Modal/Dialog/Drawer Components & Their Usage

### Component Hierarchy

```
UI Components (packages/app/app/components/ui/)
├── dialog.tsx         - Centered modal (Radix UI Dialog)
├── sheet.tsx          - Side panel (Radix UI Dialog)
└── drawer.tsx         - Bottom sheet (vaul package)

Utilities (packages/app/app/lib/)
└── modal/
    ├── create-modal.tsx      - Jotai-based factory pattern
    └── components.tsx        - Modal layout helpers (if used)

Hooks (packages/app/app/hooks/)
└── use-confirm-dialog.tsx    - Confirmation dialog hook
```

### 1. Dialog Component (Current Standard)

**Location:** `packages/app/app/components/ui/dialog.tsx`

```typescript
// Used for confirmations & small forms
<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
  <DialogContent className="rounded-3xl">  // ← 3xl border radius
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
      <DialogDescription>Optional description</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      {/* Buttons */}
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Current Usage:**
- `_protected.team.tsx` - Edit team member dialog
- Various confirmation dialogs throughout app

**Characteristics:**
- ✅ Centered on screen
- ✅ Desktop-first (no mobile optimization)
- ✅ Max width: `max-w-lg` (512px)
- ✅ Overlay: `bg-black/80`

### 2. Sheet Component (Current Large Forms)

**Location:** `packages/app/app/components/ui/sheet.tsx`

```typescript
// Used for large forms & side panels
<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent side="right" className="w-full sm:max-w-md">
    <SheetHeader>
      <SheetTitle>Form Title</SheetTitle>
    </SheetHeader>
    {/* Form content */}
    <SheetFooter>
      {/* Buttons */}
    </SheetFooter>
  </SheetContent>
</Sheet>
```

**Current Usage:**
- `app-layout.tsx` - User profile menu (line 144-177)
- Large forms in routes

**Characteristics:**
- ✅ Side panel (default: right)
- ✅ Mobile: `w-3/4` (75% width)
- ✅ Desktop: `sm:max-w-md` (448px)
- ✅ Smooth slide animations

### 3. Drawer Component (Emerging Pattern)

**Location:** `packages/app/app/components/ui/drawer.tsx`

```typescript
// Used for mobile-first bottom sheets
<Drawer open={isOpen} onOpenChange={(open) => !open && close()}>
  <DrawerContent className="flex flex-col max-h-[85vh]">
    <DrawerHeader>
      <DrawerTitle>Bottom Sheet Title</DrawerTitle>
    </DrawerHeader>
    {/* Content */}
    <DrawerFooter>
      {/* Buttons */}
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```

**Current Usage:**
- **Minimal direct usage** - Primarily exported
- Used in `create-modal.tsx` for mobile detection

**Characteristics:**
- ✅ Bottom-sheet style (mobile-optimized)
- ✅ Fixed to bottom with `rounded-t-[20px]`
- ✅ Max height: `85vh` (keyboard-safe)
- ✅ Overflow auto for scroll

---

## 5. Advanced: Responsive Modal Factory (create-modal.tsx)

**Location:** `packages/app/app/lib/modal/create-modal.tsx`

### Pattern: Type-Safe Responsive Modals

This factory function enables **automatic switching between Dialog, Sheet, and Drawer** based on device size:

```typescript
export function createModal<TProps extends object>(
  ContentComponent: React.ComponentType<TProps & { close: () => void }>,
  config: ModalConfig = {}
) {
  // Returns [ModalComponent, useModalHook]
  return [ModalComponent, useModalHook] as const;
}

// ModalConfig options
interface ModalConfig {
  type?: "dialog" | "sheet" | "drawer" | "responsive";
  side?: "top" | "right" | "bottom" | "left";
}
```

### Usage Example

```typescript
// 1. Create modal with configuration
const [EditCustomerModal, useEditCustomerModal] = createModal(
  CustomerEditForm,
  { type: "responsive", side: "right" }
);

// 2. Use in component
export function CustomerList() {
  const modal = useEditCustomerModal();
  
  return (
    <>
      <Button onClick={() => modal.open(customer)}>Edit</Button>
      <EditCustomerModal />
    </>
  );
}
```

### Auto-Responsive Behavior

```typescript
// In create-modal.tsx line 75-95
if (config.type === "responsive") {
  if (isMobile) {
    // Mobile: Use Drawer (bottom sheet)
    return <Drawer>
      <DrawerContent className="flex flex-col max-h-[85vh]">
        {content}
      </DrawerContent>
    </Drawer>;
  }
  // Desktop: Use Sheet (side panel)
  return <Sheet>
    <SheetContent side={config.side || "right"}>
      {content}
    </SheetContent>
  </Sheet>;
}
```

**Key Insight:** 
- ✅ Mobile: Bottom Drawer (85% height, scrollable)
- ✅ Desktop: Side Sheet (max 448px width)
- ✅ Automatic switching at 640px breakpoint

---

## 6. Viewport Configuration

### Meta Tags

**Location:** `packages/app/app/root.tsx`

```typescript
// HTML viewport meta tag
<meta 
  name="viewport" 
  content="width=device-width, initial-scale=1.0, viewport-fit=cover" 
/>
```

**Configuration Details:**
- ✅ `width=device-width` - Responsive viewport
- ✅ `initial-scale=1.0` - No zoom on load
- ✅ `viewport-fit=cover` - Notch support (safe areas)

### CSS Variables (Root Styles)

**Location:** `packages/app/app/styles/globals.css`

Defines design system:
```css
--primary: 37 99% 54%;           /* Orange */
--border: 0 0% 89.8%;
--radius: 0.5rem;
/* ... more CSS vars ... */
```

---

## 7. Touch Event Handling

**Current Status:** ⚠️ **No explicit touch event handlers found**

The project relies on:
- ✅ **Radix UI primitives** - Handle touch events internally
- ✅ **Tailwind utilities** - Touch-friendly sizes (`h-12`, `w-12` = 48px minimum)
- ✅ **Bottom nav spacing** - Ensures touch targets are reachable

**Recommendation:** Touch targets are adequate (48px min), no custom handlers needed yet.

---

## 8. How Components Currently Handle Mobile vs Desktop

### Mobile-First (328px-640px)

```
┌─────────────────────┐
│  Header (sticky)    │  ← z-50
├─────────────────────┤
│                     │
│  Main Content       │  ← px-3 py-4
│  (no scroll issues) │
│                     │
├─────────────────────┤
│  Bottom Nav (4-item)│  ← fixed, pb-24 gap
└─────────────────────┘
```

**Characteristics:**
- ✅ Full-width content with `px-3` padding
- ✅ Bottom navigation always visible
- ✅ Centered text in dialogs
- ✅ Drawers slide from bottom
- ✅ Sheets take 75% width
- ✅ Main nav bar uses truncation/compact

### Desktop (641px+)

```
┌──────────────────────────────────────────┐
│  Header (sticky)                         │  ← z-50
├──────────────────────────────────────────┤
│                                          │
│  Main Content (px-4)                     │
│  (can have wider layout)                 │
│                                          │
├──────────────────────────────────────────┤
│  Bottom Nav (same)                       │  ← fixed
└──────────────────────────────────────────┘
```

**Characteristics:**
- ✅ Relaxed padding `px-4`
- ✅ Same bottom nav
- ✅ Left-aligned text in dialogs
- ✅ Sheets slide from right with 448px max-width
- ✅ Dialogs stay centered

---

## 9. Design System: Orange-Centric Color Palette

### Mobile-Optimized Colors

| Element | Mobile | Desktop | Purpose |
|---------|--------|---------|---------|
| Primary Buttons | `bg-orange-500` | Same | Call-to-action |
| Icon Containers | `bg-orange-100` | Same | Visual hierarchy |
| Bottom Nav Active | `bg-orange-100` | Same | Current location |
| Text on Active | `text-orange-600` | Same | Emphasis |

### Border Radius Hierarchy (Mobile-First)

| Size | Example | Mobile | Desktop |
|------|---------|--------|---------|
| **sm** | Buttons | `rounded-xl` | Same |
| **md** | Cards | `rounded-2xl` | Same |
| **lg** | Modal content | `rounded-3xl` | Same |
| **full** | Badges | `rounded-full` | Same |

---

## 10. Layout Spacing Patterns

### Standard Mobile Gaps

```typescript
// Padding
px-3         // Mobile horizontal
sm:px-4      // Desktop horizontal
py-4         // Mobile vertical
gap-4        // Between items
space-y-2    // Vertical stacking
space-x-2    // Horizontal stacking

// Specific to bottom nav
pb-24        // Main content (avoid 6rem nav)
py-2         // Nav padding
```

### Container Widths

| Context | Class | Width | Notes |
|---------|-------|-------|-------|
| Content | default | 100% | Full width |
| Sheet (side) | `w-3/4 sm:max-w-md` | 75% → 448px | Responsive |
| Drawer (bottom) | default | 100% | Full width |
| Dialog | `max-w-lg` | 512px | Centered |

---

## 11. Summary: Patterns for Modal-to-Drawer Conversion

### When to Use Each Component

| Use Case | Mobile | Desktop | Component |
|----------|--------|---------|-----------|
| Confirm action | Bottom Drawer | Centered Dialog | Drawer/Dialog |
| Small form (<3 fields) | Bottom Drawer | Centered Dialog | Dialog (with `responsive` config) |
| Large form (>3 fields) | Bottom Drawer | Right Sheet | Sheet or Drawer (with `responsive`) |
| Details panel | Bottom Drawer | Right Sheet | Sheet |
| Quick menu | Bottom Drawer | Side Sheet | Drawer/Sheet |
| Alert/Warning | Full-screen overlay | Centered modal | Dialog |

### Recommended Pattern for Modal-to-Drawer

```typescript
// Use the create-modal factory with responsive config
const [EditModal, useEditModal] = createModal(
  EditContent,
  { type: "responsive", side: "right" }  // ← Auto-switches
);

// Renders:
// - Mobile (< 640px): Drawer (bottom sheet)
// - Desktop (≥ 640px): Sheet (side panel)
// - Height cap: 85vh (keyboard-safe on mobile)
```

---

## 12. Critical Files Reference

| File | Purpose | Key Constants/Patterns |
|------|---------|----------------------|
| `hooks/use-mobile.ts` | Mobile detection | `MOBILE_BREAKPOINT = 640` |
| `components/ui/dialog.tsx` | Centered modals | `max-w-lg`, centered positioning |
| `components/ui/sheet.tsx` | Side panels | `w-3/4 sm:max-w-sm`, slide animations |
| `components/ui/drawer.tsx` | Bottom sheets | `max-h-[85vh]`, rounded-t-[20px] |
| `lib/modal/create-modal.tsx` | Factory pattern | Responsive, type-safe modals |
| `components/layout/app-layout.tsx` | Main layout | Bottom nav, 4-item menu, `pb-24` |
| `tailwind.config.js` | Breakpoints | Default Tailwind (sm: 640px) |

---

## 13. Key Insights for Converting Modals to Drawers

✅ **Available Now:**
- Mobile detection hook (`useIsMobile()`)
- Drawer component with proper mobile styling
- Responsive factory pattern (already exists but underused)
- Bottom nav with proper z-index stacking

⚠️ **Considerations:**
- Current Dialogs are centered (desktop-first) - consider `responsive` config
- Sheet component is feature-complete
- Drawer has proper keyboard-safe max-height (`85vh`)
- Mobile breakpoint: `640px` (Tailwind `sm`)

💡 **Best Practice for Conversion:**
Use `createModal(..., { type: "responsive" })` to automatically render:
- **Mobile**: Drawer from bottom (85% height)
- **Desktop**: Sheet from right (448px max width)

---

## 14. No Custom Media Queries Found

The project uses **Tailwind classes exclusively** - no custom `@media` queries were found in component code. This is intentional:
- ✅ Cleaner code
- ✅ Consistent breakpoints
- ✅ No CSS specificity issues
- ✅ Mobile-first by default

---

## Appendix: Breakpoint Reference

**Tailwind Default Breakpoints (used in Avileo):**

```javascript
{
  sm: '640px',   // Mobile → Tablet
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large Desktop
  2xl: '1536px'  // Extra Large
}
```

**Application in Avileo:**
- `sm:` prefix used throughout for responsive adjustments
- Primarily mobile (< 640px) vs desktop (≥ 640px) split
- Rarely uses `md:`, `lg:` prefixes

---

**Last Updated:** 2025-02-24  
**Verified Against:** `packages/app` v2025-02-24
