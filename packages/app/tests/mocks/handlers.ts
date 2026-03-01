/**
 * API Mock Handlers for MSW
 * 
 * These handlers mock the backend API endpoints used by the Avileo app.
 * Each handler returns data in the format expected by Eden Treaty:
 * { success: true, data: T }
 */

import { http, HttpResponse } from "msw";

// ============================================================================
// Types
// ============================================================================

export interface Customer {
	id: string;
	name: string;
	phone?: string;
	email?: string;
	businessId: string;
	createdAt: string;
	updatedAt: string;
	syncStatus: "pending" | "synced" | "error";
}

export interface Product {
	id: string;
	name: string;
	description?: string;
	price: number;
	unit: string;
	businessId: string;
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface Sale {
	id: string;
	customerId: string;
	total: number;
	status: "pending" | "completed" | "cancelled";
	paymentMethod: "cash" | "transfer" | "credit";
	businessId: string;
	createdAt: string;
}

export interface Business {
	id: string;
	name: string;
	ownerId: string;
	createdAt: string;
}

// ============================================================================
// In-memory data store (for testing)
// ============================================================================

let customers: Customer[] = [
	{
		id: "cust-1",
		name: "Juan Perez",
		phone: "+51 999 888 777",
		businessId: "biz-1",
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
		syncStatus: "synced",
	},
	{
		id: "cust-2",
		name: "Maria Garcia",
		phone: "+51 999 777 666",
		businessId: "biz-1",
		createdAt: "2024-01-02T00:00:00Z",
		updatedAt: "2024-01-02T00:00:00Z",
		syncStatus: "synced",
	},
];

let products: Product[] = [
	{
		id: "prod-1",
		name: "Pollo Entero",
		description: "Pollo entero de 2kg",
		price: 12.5,
		unit: "kg",
		businessId: "biz-1",
		active: true,
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
	},
	{
		id: "prod-2",
		name: "Pollo Trozado",
		description: "Pollo trozado en piezas",
		price: 10.0,
		unit: "kg",
		businessId: "biz-1",
		active: true,
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
	},
];

let sales: Sale[] = [];

// ============================================================================
// API Handlers
// ============================================================================

export const handlers = [
	// Customers API
	http.get("/api/customers", () => {
		return HttpResponse.json({
			success: true,
			data: customers,
		});
	}),

	http.get("/api/customers/:id", ({ params }) => {
		const customer = customers.find((c) => c.id === params.id);
		if (!customer) {
			return HttpResponse.json(
				{ success: false, error: "Customer not found" },
				{ status: 404 }
			);
		}
		return HttpResponse.json({
			success: true,
			data: customer,
		});
	}),

	http.post("/api/customers", async ({ request }) => {
		const body = await request.json() as Partial<Customer>;
		const newCustomer: Customer = {
			id: `cust-${Date.now()}`,
			name: body.name || "New Customer",
			phone: body.phone,
			businessId: "biz-1",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			syncStatus: "pending",
		};
		customers.push(newCustomer);
		return HttpResponse.json({
			success: true,
			data: newCustomer,
		});
	}),

	// Products API
	http.get("/api/products", () => {
		return HttpResponse.json({
			success: true,
			data: products,
		});
	}),

	http.get("/api/products/:id", ({ params }) => {
		const product = products.find((p) => p.id === params.id);
		if (!product) {
			return HttpResponse.json(
				{ success: false, error: "Product not found" },
				{ status: 404 }
			);
		}
		return HttpResponse.json({
			success: true,
			data: product,
		});
	}),

	// Sales API
	http.get("/api/sales", () => {
		return HttpResponse.json({
			success: true,
			data: sales,
		});
	}),

	http.post("/api/sales", async ({ request }) => {
		const body = await request.json() as Partial<Sale>;
		const newSale: Sale = {
			id: `sale-${Date.now()}`,
			customerId: body.customerId || "cust-1",
			total: body.total || 0,
			status: "completed",
			paymentMethod: body.paymentMethod || "cash",
			businessId: "biz-1",
			createdAt: new Date().toISOString(),
		};
		sales.push(newSale);
		return HttpResponse.json({
			success: true,
			data: newSale,
		});
	}),

	// Business API
	http.get("/api/business", () => {
		const business: Business = {
			id: "biz-1",
			name: "Mi Negocio",
			ownerId: "user-1",
			createdAt: "2024-01-01T00:00:00Z",
		};
		return HttpResponse.json({
			success: true,
			data: business,
		});
	}),

	// Health check
	http.get("/api/health", () => {
		return HttpResponse.json({
			success: true,
			data: { status: "ok" },
		});
	}),
];

// ============================================================================
// Utility functions for tests
// ============================================================================

export function resetData() {
	customers = [
		{
			id: "cust-1",
			name: "Juan Perez",
			phone: "+51 999 888 777",
			businessId: "biz-1",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:00Z",
			syncStatus: "synced",
		},
	];
	products = [
		{
			id: "prod-1",
			name: "Pollo Entero",
			price: 12.5,
			unit: "kg",
			businessId: "biz-1",
			active: true,
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:00Z",
		},
	];
	sales = [];
}

export function addCustomer(customer: Customer) {
	customers.push(customer);
}

export function addProduct(product: Product) {
	products.push(product);
}

export function addSale(sale: Sale) {
	sales.push(sale);
}
