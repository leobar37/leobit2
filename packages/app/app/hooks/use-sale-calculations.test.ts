import { describe, expect, it } from "vitest";
import { getSaleFinancialState } from "./use-sale-calculations";

describe("getSaleFinancialState", () => {
  it("keeps balance due at zero for cash sales", () => {
    expect(
      getSaleFinancialState({
        saleType: "contado",
        totalAmount: 18,
        amountPaid: 0,
      }),
    ).toEqual({
      amountPaidValue: 0,
      balanceDue: 0,
    });
  });

  it("calculates pending balance for credit sales", () => {
    expect(
      getSaleFinancialState({
        saleType: "credito",
        totalAmount: 18,
        amountPaid: 5,
      }),
    ).toEqual({
      amountPaidValue: 5,
      balanceDue: 13,
    });
  });

  it("never returns a negative balance", () => {
    expect(
      getSaleFinancialState({
        saleType: "credito",
        totalAmount: 18,
        amountPaid: 24,
      }),
    ).toEqual({
      amountPaidValue: 24,
      balanceDue: 0,
    });
  });
});
