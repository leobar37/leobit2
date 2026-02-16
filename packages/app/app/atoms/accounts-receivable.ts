import { atom } from "jotai";

export const searchAtom = atom("");
export const minBalanceAtom = atom("");

export const filtersAtom = atom((get) => ({
  search: get(searchAtom) || undefined,
  minBalance: get(minBalanceAtom) ? parseFloat(get(minBalanceAtom)) : undefined,
  limit: 50,
}));
