# AGENTS.md - Components Directory

> **Context file for AI agents working on this components directory**

## Overview

This directory contains the React component library for Avileo - an online-first chicken sales management system. Components are organized by category: reusable UI primitives, form components, and domain-specific business components for customers, products, sales, inventory, and distribution management.

## Project Type & Stack

- **Type**: React 19 Frontend with React Router v7
- **Main Language**: TypeScript
- **Framework**: React Router v7
- **Styling**: Tailwind CSS + shadcn/ui patterns
- **Key Dependencies**:
  - `react-hook-form` + `@hookform/resolvers` - Form management
  - `zod` - Schema validation
  - `lucide-react` - Icon library
  - `class-variance-authority` - Variant handling
  - `@radix-ui/*` - Headless UI primitives
  - `clsx` + `tailwind-merge` - Class name utilities
  - `@tanstack/react-query` - Data fetching
  - `jotai` - State management

## Architecture

### Directory Structure

```
components/
├── ui/                    # shadcn/ui style primitives
│   ├── button.tsx         # Button with variants (default, destructive, outline, ghost, etc.)
│   ├── input.tsx          # Basic input component
│   ├── card.tsx           # Card with subcomponents (Header, Title, Content, Footer)
│   ├── label.tsx          # Form label
│   ├── badge.tsx          # Status/category badges
│   ├── table.tsx          # Table components
│   ├── dialog.tsx         # Modal dialog (Content, Header, Footer, Title, Description)
│   ├── sheet.tsx          # Side panel with side variants (left, right, top, bottom)
│   ├── dropdown-menu.tsx  # Dropdown menus
│   └── progress.tsx       # Progress bars
│
├── forms/                 # Form-specific compound components
│   ├── form-input.tsx     # Input with label and error display
│   └── form-password.tsx  # Password input with visibility toggle
│
├── customers/             # Customer management components
│   ├── customer-card.tsx  # Customer list item display
│   └── customer-form.tsx  # Customer creation/edit form
│
├── products/              # Product management components
│   └── product-card.tsx   # Product list item display
│
├── sales/                 # Sales/POS components
│   ├── sale-card.tsx      # Sale record display
│   ├── sale-cart-item.tsx # Cart item in POS
│   └── customer-search.tsx# Customer search/selection
│
├── inventory/             # Inventory management
│   └── inventory-card.tsx # Daily assignment display with progress
│
├── distribucion/          # Distribution management
│   └── distribucion-table.tsx # Distribution table with actions
│
```

## Coding Patterns & Conventions

### Import Aliases

Two alias patterns are used interchangeably:
- `@/` - For component-to-component imports within app directory
- `~/` - For lib, hooks, and schema imports

```typescript
// Examples from the codebase:
import { cn } from "@/lib/utils";           // @ alias
import { cn } from "~/lib/utils";           // ~ alias
import type { Customer } from "@avileo/shared";
import { useCustomers } from "~/hooks/use-customers";
```

### Naming Conventions

- **Files**: kebab-case.tsx (e.g., `customer-card.tsx`, `form-input.tsx`)
- **Components**: PascalCase (e.g., `CustomerCard`, `FormInput`)
- **Props Interfaces**: `ComponentNameProps` (e.g., `CustomerCardProps`)
- **Subcomponents**: Compound pattern with dot notation (e.g., `Card.Header`)
- **Display Names**: Always set `Component.displayName = "Name"`

### Component Patterns

### Mobile Core Layout (Preferred)

Use the mobile shell primitives from `~/components/mobile` for protected/form pages.

Recommended base composition:

```tsx
import { MobileSlot, MobileFixedFooter } from "~/components/mobile";
import { MobileShell, MobilePage } from "~/components/mobile";
import { ThemeToggle } from "~/components/theme";

export default function Page() {
  return (
    <MobileShell.Root variant="protected">
      <MobileSlot name="header:left" priority={10}>
        <MobileShell.BackButton />
      </MobileSlot>

      <MobileSlot name="header:center" priority={10}>
        <h1>Título</h1>
      </MobileSlot>

      <MobileSlot name="header:right" priority={10}>
        <ThemeToggle />
      </MobileSlot>

      <MobileShell.Header />

      <MobileShell.Content>
        <MobilePage.Root maxWidth="md">
          {/* page content */}
        </MobilePage.Root>
      </MobileShell.Content>

      <MobileShell.Footer />
    </MobileShell.Root>
  );
}
```

#### Slot vocabulary

- `header:left`: back button / secondary actions
- `header:center`: page title / key status text
- `header:right`: menu, filter toggles, profile / theme actions
- `footer`: route-level action bar (if supported by layout)
- `floating`: floating CTA (FAB)

#### Footer patterns

For route-level action rows under a shared shell:

```tsx
<MobileSlot name="footer" priority={10}>
  <MobilePage.Card variant="flat">...</MobilePage.Card>
</MobileSlot>
```

For standalone fixed bars (for example, pages not using shared shell footer host):

```tsx
<MobileFixedFooter aboveNav>
  <MobilePage.Root maxWidth="md">
    <Button type="button" className="w-full">
      Guardar
    </Button>
  </MobilePage.Root>
</MobileFixedFooter>
```

#### Card and form entry points

```tsx
<MobilePage.Card variant="flat">Contenido principal</MobilePage.Card>
<MobilePage.Card variant="soft">Resumen</MobilePage.Card>
<MobilePage.Card variant="muted">Tarjeta de estado</MobilePage.Card>
```

### Legacy migration rules

- Avoid route-local shell wrappers such as:
  - manual fixed footers (`fixed bottom-*`)
  - manual sticky headers (`sticky top-0`)
  - gradient/fullscreen wrappers (`min-h-screen app-shell` with local header/main sections)
  - ad-hoc bottom padding (`pb-24`, `pb-32`) for shell compensation
- Prefer slot writers over local wrappers; keep layout ownership in the nearest
  shared shell (`MobileShell.Root`, `MobileShell.Header`, `MobileShell.Content`,
  `MobileShell.Footer`) to avoid nested shell conflicts.
- Keep legacy wrappers (`useSetLayout`, `FormPage`, `ToolbarActions`) only
  for backward compatibility while routes migrate to direct route-level shell slots.

#### UI Primitive Pattern (shadcn/ui style)

```typescript
// 1. Use forwardRef for DOM access
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    // ...
  }
)

// 2. Always set displayName
Button.displayName = "Button"

// 3. Use cn() for class merging
className={cn(baseClasses, className)}

// 4. Export both component and variants when applicable
export { Button, buttonVariants }
```

#### Domain Card Pattern

All domain card components follow a consistent structure:

```typescript
interface EntityCardProps {
  entity: EntityType;       // The data object
  onClick?: () => void;     // Optional click handler
  showExtra?: boolean;      // Optional display flags
}

// Structure:
// 1. Card wrapper with hover effects
// 2. Icon container (w-12 h-12, orange-100 background)
// 3. Content area with icon + details
// 4. lucide-react icons for visual elements
```

#### Form Pattern (react-hook-form + zod)

```typescript
// 1. Define schema
const entitySchema = z.object({
  field: z.string().min(2, "Error message"),
  optional: z.string().nullable(),
});

// 2. Infer type
type EntityFormData = z.infer<typeof entitySchema>;

// 3. Use with useForm
const { register, handleSubmit, formState: { errors } } = useForm<EntityFormData>({
  resolver: zodResolver(entitySchema),
  defaultValues: { ... }
});

// 4. Export type for parent components
export type { EntityFormData };
```

### Styling Patterns

#### Design System (Orange Theme)

The app uses an orange-centric color palette:

```typescript
// Icon containers
"w-12 h-12 bg-orange-100 rounded-xl"  // Standard
"w-10 h-10 bg-orange-100 rounded-lg"  // Compact

// Gradient backgrounds
"bg-gradient-to-br from-orange-100 to-orange-200"
"bg-gradient-to-br from-orange-500/10 to-orange-600/5"

// Primary buttons
"bg-orange-500 hover:bg-orange-600"

// Badge colors for product types
typeColors = {
  pollo: "bg-orange-100 text-orange-700",
  huevo: "bg-yellow-100 text-yellow-700",
  otro: "bg-gray-100 text-gray-700",
}
```

#### Border Radius Hierarchy

- `rounded-xl` - Small elements (inputs, compact cards)
- `rounded-2xl` - Standard cards
- `rounded-3xl` - Large/featured cards
- `rounded-full` - Status badges

#### Shadow Hierarchy

- `shadow-sm` - Minimal elevation
- `shadow-md` - Standard cards
- `shadow-lg` - Featured elements

### Error Handling Pattern

```typescript
// Form error display
{errors.field && (
  <p className="text-sm text-red-500">{errors.field.message}</p>
)}

// Conditional error styling
className={cn(
  "base-classes",
  error && "border-destructive focus-visible:ring-destructive"
)}
```

### Modal & Drawer Patterns

#### What Exists

| Component | Location | Status |
|-----------|----------|--------|
| `Dialog` | `ui/dialog.tsx` | ✅ Available - Modal dialog with subcomponents |
| `Sheet` | `ui/sheet.tsx` | ✅ Available - Side panel with variants |
| `createModal` | `~/hooks/use-modal.ts` | ✅ Available - Simple Jotai atom hook |

#### Pattern 1: Controlled Dialog (most common)

Used in routes like `_protected.distribuciones.tsx`:

```typescript
const [isOpen, setIsOpen] = useState(false);
const [editingItem, setEditingItem] = useState<Item | null>(null);

// Create dialog
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Nuevo</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
    </DialogHeader>
    {/* Form content */}
  </DialogContent>
</Dialog>

// Edit dialog (controlled by state)
<Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Editar</DialogTitle>
    </DialogHeader>
    {editingItem && <EditForm item={editingItem} onSubmit={handleSubmit} />}
  </DialogContent>
</Dialog>
```

#### Pattern 2: createModal Hook (Jotai)

Simple atom-based modal state. Only returns hook, must render Dialog manually:

```typescript
// 1. Create modal hook with typed data
const useCustomerModal = createModal<Customer>();

// 2. Use in component
const modal = useCustomerModal();
modal.open(customer);  // Open with data
modal.close();         // Close
const { isOpen, data } = modal;  // Access state

// 3. Render Dialog manually (hook only manages state)
<Dialog open={modal.isOpen} onOpenChange={(open) => !open && modal.close()}>
  <DialogContent>
    {modal.data && <CustomerForm customer={modal.data} onClose={modal.close} />}
  </DialogContent>
</Dialog>
```

#### What's Missing (Reference Only)

The `/frontend` skill has a more complete pattern in `patterns/create-modal.md` that includes:
- `lib/modal/create-modal.tsx` - Returns `[ModalComponent, useModalHook]` tuple
- `lib/modal/components.tsx` - `ModalLayoutProvider`, `ModalHeader`, `ModalBody`, `ModalFooter`
- Type variants: `dialog`, `sheet`, `drawer`, `responsive`
- Auto-responsive (Drawer on mobile, Sheet on desktop)

> ⚠️ **These do NOT exist in the project yet.** If you need this pattern, implement it from the skill's `patterns/create-modal.md` reference.

#### When to Use Each

| Scenario | Component |
|----------|-----------|
| Confirmation dialogs | `Dialog` |
| Quick actions | `Dialog` |
| Large forms | `Sheet` (side: right) |
| Mobile-first forms | `Sheet` (side: bottom) |
| Details/edit panels | `Sheet` (side: right) |

## Key Files

| File | Purpose |
|------|---------|
| `ui/button.tsx` | Primary button with variants (default, destructive, outline, ghost, link) and sizes |
| `ui/card.tsx` | Card container with Header, Title, Description, Content, Footer subcomponents |
| `ui/input.tsx` | Base input with focus states and disabled styling |
| `ui/dialog.tsx` | Modal dialog with Content, Header, Footer, Title, Description subcomponents |
| `ui/sheet.tsx` | Side panel with side variants (left, right, top, bottom) |
| `forms/form-input.tsx` | Compound input with label and error display |
| `forms/form-password.tsx` | Password input with visibility toggle button |
| `customers/customer-form.tsx` | Customer creation form with react-hook-form + zod validation |

### Related Files (outside components/)

| File | Purpose |
|------|---------|
| `~/hooks/use-modal.ts` | Jotai-based modal state hook (`createModal<T>()`) |

## Important Notes for Agents

### DO:
- Use `cn()` utility for all class merging: `cn("base-classes", conditional && "conditional-class", className)`
- Set `displayName` on all forwardRef components
- Use lucide-react icons (already in dependencies)
- Follow the orange color scheme for brand consistency
- Use Spanish for user-facing text (es-PE locale: "es-PE")
- Import types from `@avileo/shared` for domain entities
- Use `Dialog` for confirmations and small forms
- Use `Sheet` for large forms and detail views

### DON'T:
- Don't use inline styles - use Tailwind classes
- Don't create new UI primitives unless truly needed - extend existing ones
- Don't forget to handle loading and empty states in list components
- Don't use English for user-facing text
- Don't create modals inline in routes - consider extracting to feature modals folder

### Online-First Considerations

The app is online-first. Components should:
- Handle loading states gracefully
- Use optimistic updates where appropriate
- Reference the network state hook for connectivity status

## Dependencies

### Internal
- `~/lib/utils` - `cn()` utility function
- `@avileo/shared` - Database types (Customer, Product, Sale, etc.)
- `~/hooks/*` - Custom hooks for data fetching (useCustomers, useDistribuciones, etc.)
- `~/hooks/use-modal` - Jotai-based modal state (`createModal<T>()`)

### External
- `lucide-react` - All icons (User, Phone, Package, ShoppingCart, etc.)
- `react-hook-form` + `@hookform/resolvers` - Form state management
- `zod` - Runtime type validation
- `@radix-ui/*` - Headless UI primitives for complex components
- `class-variance-authority` - Type-safe variant definitions
- `clsx` + `tailwind-merge` - Class composition utilities
