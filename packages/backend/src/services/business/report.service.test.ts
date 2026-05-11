import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportService } from "./report.service";
import { db } from "../../lib/db";

vi.mock("../../lib/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

describe("ReportService water helpers", () => {
  const selectMock = db.select as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    selectMock.mockReset();
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
