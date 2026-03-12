import { describe, expect, it } from "vitest";
import { buildSalePatchPayload } from "./sale-mutation-utils";

describe("buildSalePatchPayload", () => {
  it("keeps only persisted draft patch fields", () => {
    const payload = buildSalePatchPayload({
      customerId: "customer-1",
      saleType: "credito",
      paymentMode: "a_cuenta",
      totalAmount: "24.50",
      amountPaid: "10.00",
      customer: {
        id: "customer-1",
        name: "Juan Perez",
        phone: "999999999",
      },
    });

    expect(payload).toEqual({
      customerId: "customer-1",
      saleType: "credito",
      paymentMode: "a_cuenta",
      totalAmount: 24.5,
      amountPaid: 10,
    });
  });

  it("preserves explicit null customer and null delivery date", () => {
    const payload = buildSalePatchPayload({
      customerId: null,
      deliveryDate: null,
    });

    expect(payload).toEqual({
      customerId: null,
      deliveryDate: null,
    });
  });
});
