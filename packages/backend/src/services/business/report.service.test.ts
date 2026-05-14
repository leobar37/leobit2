import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportService } from "./report.service";
import { db } from "../../lib/db";

vi.mock("../../lib/db", () => ({
  db: {
    select: vi.fn(),
    query: {
      sales: {
        findMany: vi.fn(),
      },
    },
  },
}));

describe("ReportService water helpers", () => {
  const selectMock = db.select as ReturnType<typeof vi.fn>;
  const findManyMock = db.query.sales.findMany as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    selectMock.mockReset();
    findManyMock.mockReset();
  });

  it("returns valid sales movements for the requested period", async () => {
    const service = new ReportService();
    findManyMock.mockResolvedValue([
      {
        id: "sale-1",
        businessId: "biz-1",
        customerId: null,
        sellerId: "seller-1",
        distribucionId: null,
        visitaId: null,
        type: "instant_sale",
        saleType: "contado",
        paymentMode: "pago_total",
        paymentMethod: "efectivo",
        totalAmount: "25.50",
        amountPaid: "25.50",
        balanceDue: "0",
        tara: null,
        netWeight: "2.5",
        saleDate: "2026-05-14T10:00:00.000Z",
        deliveryDate: null,
        orderDate: null,
        status: "delivered",
        version: 1,
        allowCustomerEdit: false,
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
        refundAmount: null,
        refundDate: null,
        refundMethod: null,
        refundReference: null,
        refundNotes: null,
        advancePaymentMethod: null,
        advanceReferenceNumber: null,
        advanceProofImageId: null,
        createdAt: "2026-05-14T10:00:00.000Z",
        updatedAt: "2026-05-14T10:00:00.000Z",
        customer: null,
      },
    ]);

    const report = await service.getSalesMovements(
      { businessId: "biz-1" } as never,
      { type: "day" }
    );

    expect(report.summary).toEqual({
      amount: 25.5,
      kilos: 2.5,
      count: 1,
    });
    expect(report.sales).toHaveLength(1);
    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(findManyMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        with: { customer: true },
      })
    );
  });

  it("calculates sales stats kilos from kg sale items when sale net weight is empty", async () => {
    const service = new ReportService();
    const salesStatsBuilder = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        {
          totalAmount: "38.70",
          count: 2,
        },
      ]),
    };
    const kilosStatsBuilder = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        {
          totalKilos: "3.000",
        },
      ]),
    };

    selectMock
      .mockReturnValueOnce(salesStatsBuilder)
      .mockReturnValueOnce(kilosStatsBuilder)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          {
            totalAmount: "0",
            count: 0,
          },
        ]),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          {
            totalKilos: "0",
          },
        ]),
      });

    const stats = await service.getSalesStats(
      { businessId: "biz-1" } as never,
      { type: "day" }
    );

    expect(stats.current).toEqual({
      amount: 38.7,
      kilos: 3,
      count: 2,
    });
    expect(salesStatsBuilder.from).toHaveBeenCalledTimes(1);
    expect(kilosStatsBuilder.innerJoin).toHaveBeenCalledTimes(2);
  });

  it("returns kg item details for valid sales", async () => {
    const service = new ReportService();
    const detailBuilder = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        {
          saleId: "sale-1",
          saleDate: new Date("2026-05-14T10:00:00.000Z"),
          customerId: "customer-1",
          customerName: "Cliente QA",
          productName: "Pollo",
          variantName: "Entero",
          kilos: "2.000",
          unitPrice: "13.70",
          subtotal: "27.40",
          status: "active",
        },
      ]),
    };
    selectMock.mockReturnValueOnce(detailBuilder);

    const report = await service.getSalesKilos(
      { businessId: "biz-1" } as never,
      { type: "day" }
    );

    expect(report.summary).toEqual({
      kilos: 2,
      amount: 27.4,
      count: 1,
    });
    expect(report.items[0]).toEqual({
      saleId: "sale-1",
      saleDate: new Date("2026-05-14T10:00:00.000Z"),
      customer: {
        id: "customer-1",
        name: "Cliente QA",
      },
      productName: "Pollo",
      variantName: "Entero",
      kilos: 2,
      unitPrice: 13.7,
      subtotal: 27.4,
      status: "active",
    });
    expect(detailBuilder.innerJoin).toHaveBeenCalledTimes(2);
    expect(detailBuilder.leftJoin).toHaveBeenCalledTimes(1);
  });

  it("normalizes water payment breakdown values", () => {
    const service = new ReportService() as unknown as {
      paymentBreakdownFromRow: (row: Record<string, string | number | null>) => {
        efectivo: number;
        yape: number;
        plin: number;
        transferencia: number;
        tarjeta: number;
      };
    };

    expect(
      service.paymentBreakdownFromRow({
        efectivo: "10.50",
        yape: 8,
        plin: null,
        transferencia: "4.25",
        tarjeta: undefined,
      })
    ).toEqual({
      efectivo: 10.5,
      yape: 8,
      plin: 0,
      transferencia: 4.25,
      tarjeta: 0,
    });
  });

  it("aggregates water operational sales, stops and routes from persisted rows", async () => {
    const service = new ReportService();
    const aggregateBuilder = (rows: unknown[]) => ({
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(rows),
    });
    const routeBuilder = (rows: unknown[]) => ({
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(rows),
    });

    selectMock
      .mockReturnValueOnce(aggregateBuilder([
        {
          soldContainers: "3",
          totalRevenue: "24.00",
          efectivo: "0",
          yape: "16.00",
          plin: "8.00",
          transferencia: "0",
          tarjeta: "0",
        },
      ]))
      .mockReturnValueOnce(aggregateBuilder([
        {
          stopsTotal: 3,
          stopsPending: 1,
          stopsCompleted: 2,
          deliveredContainers: 3,
        },
      ]))
      .mockReturnValueOnce(routeBuilder([
        {
          distribucionId: "dist-1",
          routeName: "Ruta Norte",
          sellerId: "seller-1",
          sellerPoint: "Movil",
          stopsTotal: 2,
          stopsPending: 0,
          stopsCompleted: 2,
          deliveredContainers: 3,
          salesCount: 2,
          totalRevenue: "24.00",
          efectivo: "0",
          yape: "16.00",
          plin: "8.00",
          transferencia: "0",
          tarjeta: "0",
        },
      ]));

    const report = await service.getWaterOperationalReport(
      { businessId: "biz-agua" } as never,
      {
        type: "range",
        startDate: new Date("2026-05-04T00:00:00.000Z"),
        endDate: new Date("2026-05-05T00:00:00.000Z"),
      }
    );

    expect(report.summary).toEqual({
      soldContainers: 3,
      deliveredContainers: 3,
      stopsTotal: 3,
      stopsPending: 1,
      stopsCompleted: 2,
      totalRevenue: 24,
      paymentBreakdown: {
        efectivo: 0,
        yape: 16,
        plin: 8,
        transferencia: 0,
        tarjeta: 0,
      },
    });
    expect(report.routes).toEqual([
      {
        distribucionId: "dist-1",
        routeName: "Ruta Norte",
        sellerId: "seller-1",
        sellerLabel: "Movil",
        stopsTotal: 2,
        stopsPending: 0,
        stopsCompleted: 2,
        deliveredContainers: 3,
        salesCount: 2,
        totalRevenue: 24,
        paymentBreakdown: {
          efectivo: 0,
          yape: 16,
          plin: 8,
          transferencia: 0,
          tarjeta: 0,
        },
      },
    ]);
    expect(selectMock).toHaveBeenCalledTimes(3);
  });
});
