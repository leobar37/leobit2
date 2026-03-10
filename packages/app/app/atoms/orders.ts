import { atom } from "jotai";

export type OrderStatus = "draft" | "confirmed" | "cancelled" | "delivered" | null;

export const searchTermAtom = atom("");

export const statusFilterAtom = atom<OrderStatus>(null);
