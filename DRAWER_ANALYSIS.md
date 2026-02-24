# shadcn/ui Drawer Component Analysis - Avileo Project

**Date**: Feb 24, 2026  
**Status**: ✅ DRAWER COMPONENTS FULLY AVAILABLE & OPERATIONAL

---

## Executive Summary

The Avileo project **already has both Drawer and Sheet components installed and implemented**. A sophisticated responsive modal system (`createModal`) is in place that automatically switches between Drawer (mobile) and Sheet (desktop) based on viewport size. The infrastructure is production-ready for converting modals to mobile-optimized drawers.

---

## 1. Component Availability Status

### ✅ Installed Components

| Component | Location | Status | Provider |
|-----------|----------|--------|----------|
| **Drawer** | `packages/app/app/components/ui/drawer.tsx` | ✅ Available | `vaul` |
| **Sheet** | `packages/app/app/components/ui/sheet.tsx` | ✅ Available | `@radix-ui/react-dialog` |
| **Dialog** | `packages/app/app/components/ui/dialog.tsx` | ✅ Available | `@radix-ui/react-dialog` |
| **createModal Hook** | `packages/app/app/lib/modal/create-modal.tsx` | ✅ Available | Custom implementation |
| **Modal Components** | `packages/app/app/lib/modal/components.tsx` | ✅ Available | Custom implementation |

### ✅ Required Dependencies

```json
{
  "@radix-ui/react-dialog": "^1.1.15",     // For Sheet & Dialog
  "vaul": "^1.1.2",                        // For Drawer (iOS-optimized)
  "@radix-ui/react-label": "^2.1.8",
  "@radix-ui/react-slot": "^1.2.4"
}
```

All dependencies are **already installed** in `packages/app/package.json`.

---

## 2. Drawer Component Details

### File: `packages/app/app/components/ui/drawer.tsx` (130 lines)

**Built with**: `vaul` library (iOS-optimized drawer library)

**Exported Components**:
```typescript
export {
  Drawer,              // Root component
  DrawerPortal,        // Portal wrapper
  DrawerOverlay,       // Overlay/backdrop
  DrawerTrigger,       // Trigger button
  DrawerClose,         // Close button
  DrawerContent,       // Main content container
  DrawerHeader,        // Header section
  DrawerFooter,        // Footer section
  DrawerTitle,         // Title text
  DrawerDescription,   // Description text
}
```

**Key Features**:
- **Mobile-optimized**: Drawer slides from bottom with `max-h-[85vh]`
- **Responsive**: Includes `rounded-t-[20px]` for rounded top corners
- **Accessible**: Built on `vaul` Drawer primitive
- **Scroll support**: `overflow-y-auto` on content
- **Styling**: Uses CVA (class-variance-authority) for type-safe variants

**Default Behavior**:
```typescript
// Bottom drawer (mobile-first)
side: "bottom"  // Only variant available for Drawer
max-h: "85vh"   // Max height constraint
inset-x: "0"    // Full width
border-t: true  // Top border
```

---

## 3. Sheet Component Details

### File: `packages/app/app/components/ui/sheet.tsx` (141 lines)

**Built with**: `@radix-ui/react-dialog` (Radix Dialog primitive)

**Exported Components**:
```typescript
export {
  Sheet,               // Root component
  SheetPortal,         // Portal wrapper
  SheetOverlay,        // Overlay/backdrop
  SheetTrigger,        // Trigger button
  SheetClose,          // Close button
  SheetContent,        // Main content container
  SheetHeader,         // Header section
  SheetFooter,         // Footer section
  SheetTitle,          // Title text
  SheetDescription,    // Description text
}
```

**Key Features**:
- **Multi-directional**: 4 side variants (top, bottom, left, right)
- **Desktop-optimized**: Full slide-in animation from any edge
- **Responsive**: Width 3/4 on mobile, max-width sm on desktop
- **Animated**: Smooth slide animations with different durations
- **Accessible**: Built on Radix Dialog primitive with keyboard support

**Side Variants**:
```typescript
side: {
  top:    "inset-x-0 top-0 border-b slide-in-from-top",
  bottom: "inset-x-0 bottom-0 border-t slide-in-from-bottom",
  left:   "inset-y-0 left-0 h-full w-3/4 border-r slide-in-from-left sm:max-w-sm",
  right:  "inset-y-0 right-0 h-full w-3/4 border-l slide-in-from-right sm:max-w-sm",
}
// Default: "right"
```

---

## 4. Advanced: Responsive Modal System

### File: `packages/app/app/lib/modal/create-modal.tsx` (130 lines)

This is a **production-ready pattern** that automatically chooses the best modal type based on viewport.

#### API

```typescript
const [ModalComponent, useModalHook] = createModal<TData>(
  ContentComponent,
  {
    type?: "dialog" | "sheet" | "drawer" | "responsive",  // Type selection
    side?: "top" | "right" | "bottom" | "left"            // For Sheet
  }
)
```

#### Modal Type Behaviors

| Type | Mobile | Desktop | Use Case |
|------|--------|---------|----------|
| **`"responsive"`** | Drawer (bottom) | Sheet (right) | 🎯 Best for most forms |
| **`"drawer"`** | Drawer only | Drawer only | Bottom slide-up only |
| **`"sheet"`** | Sheet (right) | Sheet (right) | Side panel always |
| **`"dialog"`** | Dialog | Dialog | Modal dialog always |

#### Usage Example

```typescript
// 1. Create modal hook with custom component
function EditCustomerContent({ close, name, phone }: Customer & { close: () => void }) {
  return (
    <>
      <p>Edit {name}</p>
      <button onClick={close}>Done</button>
    </>
  );
}

const [EditModal, useEditCustomer] = createModal<Customer>(
  EditCustomerContent,
  { type: "responsive", side: "bottom" }
);

// 2. Use in component
export function CustomerList() {
  const modal = useEditCustomer();
  
  return (
    <>
      <button onClick={() => modal.open(customer)}>Edit</button>
      <EditModal />
    </>
  );
}
```

#### Features

✅ **Jotai-based**: Uses atoms for state management  
✅ **Responsive**: Auto-detects mobile vs desktop with `useIsMobile()` hook  
✅ **Controlled & Uncontrolled**: Works both ways  
✅ **Type-safe**: Full TypeScript support with generics  
✅ **Auto-close**: Built-in close handler on overlay click  

---

## 5. Current Usage in Codebase

### Dialog Usage (11 files using)

**Routes & Pages**:
- `_protected.team.tsx` - Confirm dialog for team actions
- Other routes with confirmations

**Pattern**:
```typescript
// Controlled state
const [isOpen, setIsOpen] = useState(false);

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Form content */}
  </DialogContent>
</Dialog>
```

### Sheet Usage

**Component**: `packages/app/app/components/layout/app-layout.tsx`
- Used for mobile navigation drawer in app layout
- Imports: Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger

**Pattern**:
```typescript
<Sheet>
  <SheetTrigger asChild>
    <Button>Menu</Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Navigation</SheetTitle>
    </SheetHeader>
    {/* Menu items */}
  </SheetContent>
</Sheet>
```

### Drawer Usage

**Direct drawer usage**: None found currently
**Via createModal**: `create-modal.tsx` uses Drawer for responsive modals

---

## 6. Mobile Responsiveness Support

### useIsMobile Hook

**Location**: `packages/app/app/hooks/use-mobile.ts`

**Usage**: 
- Used by `createModal` to detect viewport width
- Automatically switches between Drawer (mobile) and Sheet (desktop)

**Implementation**: Tailwind CSS media query breakpoint detection

---

## 7. Component File Locations Summary

```
packages/app/app/
├── components/
│   ├── ui/
│   │   ├── drawer.tsx          (130 lines) ✅
│   │   ├── sheet.tsx           (141 lines) ✅
│   │   ├── dialog.tsx          ✅
│   │   └── ...
│   └── layout/
│       └── app-layout.tsx      (Uses Sheet for nav)
│
├── hooks/
│   ├── use-mobile.ts           ✅
│   └── use-confirm-dialog.ts   ✅
│
└── lib/
    └── modal/
        ├── create-modal.tsx    (130 lines) ✅ **RECOMMENDED**
        └── components.tsx      (43 lines)  ✅ Helper components
```

---

## 8. Design System Integration

### Mobile-First Design

**Drawer Specifications**:
- **Height**: `max-h-[85vh]` (leaves 15% viewport for system UI)
- **Width**: Full viewport width
- **Animation**: Smooth slide-up from bottom
- **Corner Radius**: `rounded-t-[20px]` (iOS-style rounded top)
- **Backdrop**: Semi-transparent overlay `bg-black/80`

**Sheet Specifications** (Right side - default):
- **Width**: 75% on mobile, `sm:max-w-sm` (384px) on desktop
- **Height**: Full viewport height
- **Animation**: Slide-in from right with 500ms duration
- **Backdrop**: Semi-transparent overlay with fade animation

### Orange Theme Integration

Both components work with the Avileo orange theme:
```typescript
// Uses semantic colors
bg-background        // White/light
text-foreground      // Dark text
border-border        // Light gray border
shadow-lg            // Subtle shadow
```

---

## 9. Conversion Strategy for Existing Modals

### Current Modal Usage Patterns

#### Pattern 1: Controlled Dialog (most common)
```typescript
const [isOpen, setIsOpen] = useState(false);

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  {/* Form content */}
</Dialog>
```

**Convert to Drawer**:
```typescript
// For mobile-optimized experience
import { Drawer, DrawerContent } from "@/components/ui/drawer";

<Drawer open={isOpen} onOpenChange={setIsOpen}>
  <DrawerContent>
    {/* Form content */}
  </DrawerContent>
</Drawer>
```

#### Pattern 2: Responsive Modal (RECOMMENDED)
```typescript
// Use createModal for auto mobile/desktop switching
const [EditModal, useEditItem] = createModal<Item>(
  EditItemContent,
  { type: "responsive", side: "bottom" }
);

// In component:
const modal = useEditItem();
<button onClick={() => modal.open(item)}>Edit</button>
<EditModal />
```

---

## 10. Recommendations

### ✅ Immediate Actions

1. **Keep Current Setup**: Drawer, Sheet, and Dialog are properly installed and working
2. **Use createModal for New Features**: Provides automatic mobile responsiveness
3. **Audit Existing Dialogs**: Identify large forms that would benefit from drawer layout

### 🎯 For Modal-to-Drawer Conversion

1. **Large Forms**: Convert Dialog to Drawer for mobile users
   - Customer creation/editing
   - Sales entry forms
   - Inventory distribution

2. **Use Cases**:
   - ✅ Drawer for: Forms, data entry, step-by-step processes
   - ✅ Sheet for: Navigation, side panels, detailed views
   - ✅ Dialog for: Confirmations, quick actions, alerts

3. **Implementation Path**:
   ```typescript
   // Step 1: Identify form size (> 3 fields → Drawer candidate)
   // Step 2: Extract form into ContentComponent
   // Step 3: Use createModal with type="responsive"
   // Step 4: Test on mobile and desktop
   ```

### 📊 Component Recommendation Matrix

| Scenario | Component | Reason |
|----------|-----------|--------|
| Quick yes/no confirmation | Dialog | Small, centered |
| Large data entry form | Drawer (mobile) / Sheet (desktop) | Mobile-optimized |
| Navigation menu | Sheet (right/left) | Side panel standard |
| Step-by-step wizard | Drawer (mobile) | Full-height scrollable |
| Details panel | Sheet (right) | Non-intrusive side view |

---

## 11. Key Files Reference

### Core Components
- **Drawer**: `packages/app/app/components/ui/drawer.tsx`
- **Sheet**: `packages/app/app/components/ui/sheet.tsx`
- **Dialog**: `packages/app/app/components/ui/dialog.tsx`

### Advanced Modal System
- **createModal Factory**: `packages/app/app/lib/modal/create-modal.tsx` ⭐
- **Modal Helpers**: `packages/app/app/lib/modal/components.tsx`
- **Mobile Detection**: `packages/app/app/hooks/use-mobile.ts`

### Current Usage Examples
- **Navigation Drawer**: `packages/app/app/components/layout/app-layout.tsx`
- **Confirm Dialog**: `packages/app/app/routes/_protected.team.tsx`

---

## 12. Technical Specifications

### Drawer (vaul library)
- **Provider**: `vaul` v1.1.2
- **Primitive**: `Drawer` from `vaul`
- **Positioning**: Fixed bottom with inset-x-0
- **Scroll**: Handled with `overflow-y-auto`
- **Animation**: Native CSS transitions
- **Accessibility**: ARIA compliant

### Sheet (Radix Dialog)
- **Provider**: `@radix-ui/react-dialog` v1.1.15
- **Primitive**: Dialog compound components
- **Positioning**: Fixed with side variants
- **Scroll**: Handled with `overflow-y-auto`
- **Animation**: Data-attribute driven slide animations
- **Accessibility**: Full keyboard support (Esc to close)

### Dialog (Radix Dialog)
- **Provider**: `@radix-ui/react-dialog` v1.1.15
- **Primitive**: Dialog compound components
- **Positioning**: Centered modal
- **Animation**: Fade in/out with scale
- **Accessibility**: Focus trap, keyboard navigation

---

## Conclusion

✅ **All drawer components are installed and ready to use**

The Avileo project has:
1. ✅ Drawer component (via `vaul` library)
2. ✅ Sheet component (via `@radix-ui/react-dialog`)
3. ✅ Responsive modal system (`createModal` hook)
4. ✅ Mobile detection (`useIsMobile` hook)
5. ✅ Example implementations in production

**Recommendation**: Use the `createModal` hook from `packages/app/app/lib/modal/create-modal.tsx` for all new modal/drawer features. It provides automatic mobile/desktop responsiveness with minimal effort.
