---
description: Reset database and seed demo account with products
---

Reset the database to a clean state with the demo account and demo products.

## Workflow

1. **Check current state** - Verify demo account exists
2. **Run reset** - Execute `bun run db:reset` in `packages/backend/`
3. **Run seed** - Execute `bun run db:seed:demo` in `packages/backend/`

## Steps

1. Run database reset:
```bash
cd packages/backend && bun run db:reset
```

2. Run demo seed:
```bash
cd packages/backend && bun run db:seed:demo
```

## Expected Output

- Demo user preserved: `demo@avileo.com`
- Demo products seeded: Pollo Entero, Huevos, Menudencias
- Customers: 4 demo customers
- Suppliers: 2 demo suppliers

## Notes

- The reset script deletes all operational data (sales, customers, products, etc.) but preserves the demo user and business
- The seed script creates demo products, variants, inventory, customers, and suppliers
- Sales are NOT seeded (clean demo state)
