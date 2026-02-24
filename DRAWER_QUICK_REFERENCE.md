# Drawer Component Quick Reference

## ✅ Status: READY TO USE

All components are installed and operational in the Avileo project.

### Files to Import

```typescript
// Individual components (for basic usage)
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Advanced: Responsive modal factory (RECOMMENDED)
import { createModal } from "~/lib/modal/create-modal";
import { ModalHeader, ModalBody, ModalFooter } from "~/lib/modal/components";
```

---

## Component Comparison

| Feature | Drawer | Sheet | Dialog |
|---------|--------|-------|--------|
| **Position** | Bottom (mobile) | Sides + top/bottom | Center |
| **Mobile Feel** | ✅ Native iOS style | ✅ Flexible | ❌ Desktop-like |
| **Best for** | Forms, data entry | Navigation, panels | Confirmations |
| **Width** | Full viewport | 75% / max-w-sm | Centered, constrained |
| **Animation** | Slide up | Slide from side | Fade + scale |
| **Provider** | `vaul` | `@radix-ui/react-dialog` | `@radix-ui/react-dialog` |

---

## Quick Usage Examples

### Basic Drawer
```typescript
import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

export function MyDrawer() {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setOpen(true)}>Open Drawer</button>
      
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit Profile</DrawerTitle>
          </DrawerHeader>
          <div className="p-6">
            {/* Your form here */}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
```

### Responsive Modal (BEST PRACTICE)
```typescript
import { createModal } from "~/lib/modal/create-modal";
import { ModalHeader, ModalBody, ModalFooter } from "~/lib/modal/components";

// 1. Create content component
function EditCustomerContent({ 
  close, 
  name, 
  phone 
}: Customer & { close: () => void }) {
  return (
    <>
      <ModalHeader>
        <h2>Edit Customer</h2>
      </ModalHeader>
      <ModalBody>
        <input type="text" defaultValue={name} />
        <input type="tel" defaultValue={phone} />
      </ModalBody>
      <ModalFooter>
        <button onClick={close}>Save</button>
      </ModalFooter>
    </>
  );
}

// 2. Create modal hook
const [EditCustomerModal, useEditCustomer] = createModal<Customer>(
  EditCustomerContent,
  { type: "responsive" }  // Auto-switches: Drawer on mobile, Sheet on desktop
);

// 3. Use in component
export function CustomerList() {
  const modal = useEditCustomer();
  
  return (
    <>
      <button onClick={() => modal.open(customer)}>Edit</button>
      <EditCustomerModal />
    </>
  );
}
```

---

## Component Variants

### Drawer
- **Side**: `bottom` (only variant)
- **Height**: `max-h-[85vh]`
- **Top Radius**: `rounded-t-[20px]`

### Sheet
- **Sides**: `top`, `bottom`, `left`, `right`
- **Default**: `right`
- **Width**: `w-3/4 sm:max-w-sm`

### createModal Responsive Types
- `"responsive"` - Drawer (mobile), Sheet (desktop) ⭐
- `"drawer"` - Always Drawer
- `"sheet"` - Always Sheet
- `"dialog"` - Always Dialog (centered)

---

## Dependencies

✅ All installed in `packages/app/package.json`:
- `vaul` ^1.1.2 (Drawer)
- `@radix-ui/react-dialog` ^1.1.15 (Sheet, Dialog)
- `@radix-ui/react-label` ^2.1.8
- `@radix-ui/react-slot` ^1.2.4

---

## File Locations

```
packages/app/app/
├── components/ui/
│   ├── drawer.tsx          ← Raw Drawer component
│   ├── sheet.tsx           ← Raw Sheet component  
│   ├── dialog.tsx          ← Raw Dialog component
│
├── lib/modal/
│   ├── create-modal.tsx    ← Smart responsive factory ⭐
│   └── components.tsx      ← ModalHeader, ModalBody, ModalFooter
│
└── hooks/
    └── use-mobile.ts       ← Mobile detection for responsive
```

---

## Next Steps

1. **For New Features**: Use `createModal` with `type="responsive"`
2. **For Migration**: Gradually convert Dialog → Drawer in large forms
3. **For Navigation**: Use Sheet with `side="left"` or `side="right"`

See full analysis: `DRAWER_ANALYSIS.md`
