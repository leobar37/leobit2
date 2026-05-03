import { faker } from "@faker-js/faker/locale/es";

// ============================================================================
// Types - Match the actual API schema
// ============================================================================

export interface Customer {
  id: string;
  name: string;
  dni: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOverrides {
  businessId?: string;
}

// ============================================================================
// Factory Functions
// ============================================================================

const BUSINESS_ID = "biz-demo";

export function generateCustomer(index: number, overrides?: CustomerOverrides): Customer {
  const now = new Date().toISOString();
  const pastDate = faker.date.past({ years: 2 });

  return {
    id: `cust-vol-${String(index).padStart(6, "0")}`,
    name: faker.person.fullName(),
    dni: faker.string.numeric(8),
    phone: `+51 9${faker.string.numeric(8)}`,
    address: faker.location.streetAddress(),
    notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }) ?? null,
    businessId: overrides?.businessId ?? BUSINESS_ID,
    createdAt: pastDate.toISOString(),
    updatedAt: faker.date.between({ from: pastDate, to: new Date() }).toISOString(),
  };
}

export function generateCustomers(count: number, overrides?: CustomerOverrides): Customer[] {
  return Array.from({ length: count }, (_, i) => generateCustomer(i, overrides));
}

// ============================================================================
// Bulk Generation Helpers
// ============================================================================

/**
 * Generate a large batch of customers efficiently
 * Uses chunking to avoid memory issues with 1000+ records
 */
export function generateCustomersBatch(
  count: number,
  batchSize: number = 100,
  overrides?: CustomerOverrides
): Customer[] {
  const customers: Customer[] = [];
  for (let i = 0; i < count; i += batchSize) {
    const remaining = Math.min(batchSize, count - i);
    const batch = generateCustomers(remaining, { ...overrides, businessId: overrides?.businessId ?? BUSINESS_ID });
    customers.push(...batch);
  }
  return customers;
}
