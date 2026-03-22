import type { RequestContext } from "../../context/request-context";
import { createMachine, StateMachineRegistry } from "../../lib/state-machine";
import type { Distribucion, DistribucionItem } from "../../db/schema";
import type { Purchase, PurchaseItem } from "../../db/schema";
import type { Sale, SaleItem, StaffInvitation } from "../../db/schema";
import type { ProductVariantRepository } from "../repository/product-variant.repository";
import type { PaymentRepository } from "../repository/payment.repository";
import type { DistribucionItemRepository } from "../repository/distribucion-item.repository";
import type { SaleRepository } from "../repository/sale.repository";
import { setupDistribucionTransitions } from "./distribucion";
import { setupPurchaseTransitions } from "./purchase";
import { setupSaleTransitions, type SaleWithItems } from "./sale";
import { setupStaffInvitationTransitions } from "./staff-invitation";

export type DistribucionState = "activo" | "en_ruta" | "cerrado";
export type PurchaseState = "draft" | "pending" | "received" | "cancelled";
export type SaleState = "draft" | "confirmed" | "active" | "delivered" | "cancelled";
export type InvitationState = "pending" | "accepted" | "rejected" | "cancelled" | "expired";

export interface DistribucionWithItems extends Distribucion {
  items: DistribucionItem[];
}

export interface PurchaseWithItems extends Purchase {
  items: PurchaseItem[];
}

export const distribucionMachine = createMachine<DistribucionWithItems, DistribucionState>({
  name: "distribucion",
  initialState: "activo",
  states: ["activo", "en_ruta", "cerrado"],
  allowedTransitions: [
    { from: null, to: "activo" },
    { from: "activo", to: "cerrado" },
    { from: "activo", to: "en_ruta" },
    { from: "en_ruta", to: "cerrado" },
  ],
});

export const purchaseMachine = createMachine<PurchaseWithItems, PurchaseState>({
  name: "purchase",
  initialState: "draft",
  states: ["draft", "pending", "received", "cancelled"],
  allowedTransitions: [
    { from: "draft", to: "pending" },
    { from: "pending", to: "received" },
    { from: "pending", to: "cancelled" },
    { from: "received", to: "cancelled" },
  ],
});

export const saleMachine = createMachine<SaleWithItems, SaleState>({
  name: "sale",
  initialState: "draft",
  states: ["draft", "confirmed", "active", "delivered", "cancelled"],
  allowedTransitions: [
    { from: "draft", to: "active" },
    { from: "draft", to: "confirmed" },
    { from: "draft", to: "cancelled" },
    { from: "confirmed", to: "delivered" },
    { from: "confirmed", to: "cancelled" },
    { from: "active", to: "cancelled" },
  ],
});

export const staffInvitationMachine = createMachine<StaffInvitation, InvitationState>({
  name: "staffInvitation",
  initialState: "pending",
  states: ["pending", "accepted", "rejected", "cancelled", "expired"],
  allowedTransitions: [
    { from: "pending", to: "accepted" },
    { from: "pending", to: "rejected" },
    { from: "pending", to: "cancelled" },
    { from: "pending", to: "expired" },
  ],
});

export interface StateMachineDependencies {
  variantRepo: ProductVariantRepository;
  saleDeps?: {
    paymentRepository: PaymentRepository;
    distribucionItemRepository: DistribucionItemRepository;
    saleRepository: SaleRepository;
  };
  staffInvitationDeps?: {
    businessRepo: {
      findByUserIdAndBusinessId: (userId: string, businessId: string) => Promise<unknown>;
    };
    db: {
      insert: (table: unknown, values: unknown) => Promise<unknown>;
    };
    businessUsersTable: unknown;
  };
}

export function initializeStateMachines(deps: StateMachineDependencies): void {
  setupDistribucionTransitions(distribucionMachine, deps.variantRepo);
  setupPurchaseTransitions(purchaseMachine, deps.variantRepo);
  
  if (deps.saleDeps) {
    setupSaleTransitions(saleMachine, deps.saleDeps);
  }
  
  if (deps.staffInvitationDeps) {
    setupStaffInvitationTransitions(staffInvitationMachine, deps.staffInvitationDeps);
  }

  StateMachineRegistry.register("distribucion", distribucionMachine);
  StateMachineRegistry.register("purchase", purchaseMachine);
  StateMachineRegistry.register("sale", saleMachine);
  StateMachineRegistry.register("staffInvitation", staffInvitationMachine);
}