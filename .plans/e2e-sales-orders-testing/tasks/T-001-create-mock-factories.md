# T-001: Create Mock Factories

## Objective

Create factory functions for generating mock data (customers, products, sales, orders) to support 1000+ records in MSW handlers.

## Requirements

- FR-015: Volume Testing (mock generation)

## Implementation

### Files to Create

1. `e2e/mocks/factories/customer.factory.ts`
2. `e2e/mocks/factories/product.factory.ts`
3. `e2e/mocks/factories/sale.factory.ts`
4. `e2e/mocks/factories/order.factory.ts`

### customer.factory.ts

```typescript
import { faker } from '@faker-js/faker/locale/es';
import type { Customer } from '../../types';

export interface CustomerOverrides {
  businessId?: string;
  syncStatus?: 'pending' | 'synced' | 'error';
}

export function generateCustomer(index: number, overrides?: CustomerOverrides): Customer {
  return {
    id: `cust-vol-${index}`,
    name: faker.person.fullName(),
    dni: faker.string.numeric(8),
    phone: `+51 9${faker.string.numeric(8)}`,
    address: faker.location.streetAddress(),
    businessId: overrides?.businessId || 'biz-1',
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    syncStatus: overrides?.syncStatus || 'synced',
  };
}

export function generateCustomers(count: number, overrides?: CustomerOverrides): Customer[] {
  return Array.from({ length: count }, (_, i) => generateCustomer(i, overrides));
}
```

### product.factory.ts

```typescript
import { faker } from '@faker-js/faker/locale/es';
import type { Product, ProductVariant } from '../../types';

export interface ProductOverrides {
  businessId?: string;
}

export function generateProduct(index: number, overrides?: ProductOverrides): Product {
  return {
    id: `prod-vol-${index}`,
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    businessId: overrides?.businessId || 'biz-1',
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
  };
}

export function generateProducts(count: number, overrides?: ProductOverrides): Product[] {
  return Array.from({ length: count }, (_, i) => generateProduct(i, overrides));
}

export function generateVariants(products: Product[]): ProductVariant[] {
  const variants: ProductVariant[] = [];
  
  products.forEach((product, i) => {
    // Generate 2 variants per product
    variants.push(
      {
        id: `var-${product.id}-1`,
        productId: product.id,
        name: 'Unidad',
        price: parseFloat(faker.commerce.price({ min: 10, max: 100 })),
      },
      {
        id: `var-${product.id}-2`,
        productId: product.id,
        name: 'Pack x6',
        price: parseFloat(faker.commerce.price({ min: 50, max: 500 })),
      }
    );
  });
  
  return variants;
}
```

### sale.factory.ts

```typescript
import { faker } from '@faker-js/faker/locale/es';
import type { Sale, SaleItem, Customer } from '../../types';

export interface SaleOverrides {
  businessId?: string;
  sellerId?: string;
  withItems?: boolean;
  dateRange?: { start: Date; end: Date };
}

export function generateSaleItem(variantId: string): SaleItem {
  const quantity = 1 + Math.floor(Math.random() * 5);
  const unitPrice = parseFloat(faker.commerce.price({ min: 10, max: 100 }));
  
  return {
    id: `item-${faker.string.uuid()}`,
    saleId: '', // Will be set when attached to sale
    productId: `prod-vol-${Math.floor(Math.random() * 100)}`,
    productName: faker.commerce.productName(),
    variantId,
    variantName: 'Unidad',
    quantity: quantity.toString(),
    unitPrice: unitPrice.toFixed(2),
    subtotal: (quantity * unitPrice).toFixed(2),
    syncStatus: 'synced',
    createdAt: faker.date.recent().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
  };
}

export function generateSale(
  index: number,
  customers: Customer[],
  overrides?: SaleOverrides
): Sale {
  const customer = customers[index % customers.length];
  const isCredit = Math.random() > 0.5;
  const total = parseFloat(faker.commerce.price({ min: 50, max: 500 }));
  const amountPaid = isCredit ? 0 : total;
  
  const sale: Sale = {
    id: `sale-vol-${index}`,
    businessId: overrides?.businessId || 'biz-1',
    customerId: customer.id,
    sellerId: overrides?.sellerId || 'biz-user-1',
    type: 'instant_sale',
    saleType: isCredit ? 'credito' : 'contado',
    paymentMode: isCredit ? 'debe_todo' : 'pago_total',
    totalAmount: total.toFixed(2),
    amountPaid: amountPaid.toFixed(2),
    balanceDue: isCredit ? total.toFixed(2) : '0',
    status: 'active',
    syncStatus: 'synced',
    saleDate: faker.date.recent({ days: 30 }).toISOString(),
    createdAt: faker.date.recent().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    version: 1,
  };
  
  if (overrides?.withItems) {
    const itemCount = 1 + Math.floor(Math.random() * 3);
    // Items will be stored separately and linked
  }
  
  return sale;
}

export function generateSales(
  count: number,
  customers: Customer[],
  overrides?: SaleOverrides
): Sale[] {
  return Array.from({ length: count }, (_, i) => generateSale(i, customers, overrides));
}
```

### order.factory.ts

```typescript
import { faker } from '@faker-js/faker/locale/es';
import type { Sale, SaleItem, Customer } from '../../types';

export interface OrderOverrides {
  businessId?: string;
  sellerId?: string;
  status?: 'draft' | 'confirmed' | 'delivered' | 'cancelled';
}

export function generateOrder(
  index: number,
  customers: Customer[],
  overrides?: OrderOverrides
): Sale {
  const customer = customers[index % customers.length];
  const isCredit = Math.random() > 0.3;
  const total = parseFloat(faker.commerce.price({ min: 50, max: 500 }));
  
  // Random delivery date between today and 30 days future
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + Math.floor(Math.random() * 30));
  
  const statuses: Array<'draft' | 'confirmed' | 'delivered' | 'cancelled'> = [
    'draft', 'confirmed', 'delivered', 'cancelled'
  ];
  
  return {
    id: `order-vol-${index}`,
    businessId: overrides?.businessId || 'biz-1',
    customerId: customer.id,
    sellerId: overrides?.sellerId || 'biz-user-1',
    type: 'pre_order',
    saleType: isCredit ? 'credito' : 'contado',
    totalAmount: total.toFixed(2),
    amountPaid: '0',
    balanceDue: isCredit ? total.toFixed(2) : '0',
    status: overrides?.status || statuses[Math.floor(Math.random() * statuses.length)],
    deliveryDate: deliveryDate.toISOString().split('T')[0],
    orderDate: faker.date.recent().toISOString().split('T')[0],
    syncStatus: 'synced',
    saleDate: faker.date.recent().toISOString(),
    createdAt: faker.date.recent().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    version: 1,
    allowCustomerEdit: true,
  };
}

export function generateOrders(
  count: number,
  customers: Customer[],
  overrides?: OrderOverrides
): Sale[] {
  return Array.from({ length: count }, (_, i) => generateOrder(i, customers, overrides));
}
```

## Dependencies

- @faker-js/faker package (already installed)
- Type definitions from existing types

## Validation

- [ ] Factories compile without errors
- [ ] Can generate 1000 customers in < 1s
- [ ] Can generate 500 sales in < 1s
- [ ] Generated data has valid structure

## Estimated Effort

4 hours
