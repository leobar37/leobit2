import type { CartItem, PaymentMode } from "./types";
import type { Customers as Customer } from "~/lib/sync/generated/schema";

type EventMap = {
  "cart:add": { item: CartItem };
  "cart:remove": { index: number };
  "cart:clear": void;
  "cart:update": { index: number; item: CartItem };
  "selection:set": { productId: string | null; variantId: string | null };
  "selection:clear": void;
  "payment:setMode": { mode: PaymentMode };
  "payment:setAmount": { amount: string };
  "customer:set": { customer: Customer | null };
  "sale:submit": void;
  "sale:submitSuccess": { saleId: string };
  "sale:submitError": { error: string };
  "ocr:bruto": { value: string };
  "ocr:tara": { value: string };
  "ocr:precio": { value: string };
};

type EventName = keyof EventMap;
type EventPayload<T extends EventName> = EventMap[T];

class EventBus {
  private listeners: Map<EventName, Set<Function>> = new Map();

  on<T extends EventName>(event: T, handler: (payload: EventPayload<T>) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  emit<T extends EventName>(event: T, payload: EventPayload<T>) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(payload));
    }
  }
}

export const saleEvents = new EventBus();

export const emitCartAdd = (item: CartItem) => saleEvents.emit("cart:add", { item });
export const emitCartRemove = (index: number) => saleEvents.emit("cart:remove", { index });
export const emitCartClear = () => saleEvents.emit("cart:clear", undefined);
export const emitCartUpdate = (index: number, item: CartItem) =>
  saleEvents.emit("cart:update", { index, item });

export const emitSelectionSet = (productId: string | null, variantId: string | null) =>
  saleEvents.emit("selection:set", { productId, variantId });
export const emitSelectionClear = () => saleEvents.emit("selection:clear", undefined);

export const emitPaymentSetMode = (mode: PaymentMode) =>
  saleEvents.emit("payment:setMode", { mode });
export const emitPaymentSetAmount = (amount: string) =>
  saleEvents.emit("payment:setAmount", { amount });

export const emitCustomerSet = (customer: Customer | null) =>
  saleEvents.emit("customer:set", { customer });

export const emitSaleSubmit = () => saleEvents.emit("sale:submit", undefined);
export const emitSaleSubmitSuccess = (saleId: string) =>
  saleEvents.emit("sale:submitSuccess", { saleId });
export const emitSaleSubmitError = (error: string) =>
  saleEvents.emit("sale:submitError", { error });
