import { api } from "~/lib/api-client";
import type { Customer, Product, Payment, Sale } from "./schema";

export async function loadCustomers(): Promise<Customer[]> {
  const { data, error } = await api.customers.get();
  if (error) throw new Error(String(error.value));
  return (data as unknown as Customer[]) || [];
}

export async function loadProducts(): Promise<Product[]> {
  const { data, error } = await api.products.get();
  if (error) throw new Error(String(error.value));
  return (data as unknown as Product[]) || [];
}

export async function loadPayments(): Promise<Payment[]> {
  const { data, error } = await api.payments.get();
  if (error) throw new Error(String(error.value));
  return (data as unknown as Payment[]) || [];
}

export async function createCustomer(data: { name: string; dni?: string; phone?: string; address?: string; notes?: string }): Promise<Customer> {
  const response = await api.customers.post(data);
  if (response.error) throw new Error(String(response.error.value));
  return (response.data as unknown as Customer);
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
  const response = await api.customers({ id }).put(data);
  if (response.error) throw new Error(String(response.error.value));
  return (response.data as unknown as Customer);
}

export async function deleteCustomer(id: string): Promise<void> {
  const response = await api.customers({ id }).delete();
  if (response.error) throw new Error(String(response.error.value));
}

export async function createPayment(data: { clientId: string; amount: string; paymentMethod: string; notes?: string }): Promise<Payment> {
  const response = await api.payments.post(data);
  if (response.error) throw new Error(String(response.error.value));
  return (response.data as unknown as Payment);
}

export async function deletePayment(id: string): Promise<void> {
  const response = await api.payments({ id }).delete();
  if (response.error) throw new Error(String(response.error.value));
}
