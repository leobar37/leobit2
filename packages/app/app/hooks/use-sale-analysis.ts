import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api-client";
import { useSales } from "./use-sales";
import { useSync } from "~/components/sync/sync-status";

interface CustomerHistory {
  totalPurchases: number;
  totalSpent: number;
  averageSaleAmount: number;
  lastPurchaseDate: Date | null;
}

interface ProfitItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
}

interface ProfitSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalMarginPercent: number;
}

interface PaymentStatus {
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentPercentage: number;
  isFullyPaid: boolean;
  status: "paid" | "partial" | "pending";
}

interface SaleAnalysis {
  sale: {
    id: string;
    totalAmount: string;
    balanceDue: string;
    saleDate: Date;
    status: string;
    saleType: string;
  };
  customerHistory: CustomerHistory | null;
  profitAnalysis: {
    items: ProfitItem[];
    summary: ProfitSummary;
  } | null;
  paymentStatus: PaymentStatus;
}

const QUERY_KEYS = {
  saleAnalysis: (saleId: string) => ["sale-analysis", saleId],
} as const;

export function useSaleAnalysis(saleId: string | null) {
  const { isOnline } = useSync();
  const { data: allSales = [] } = useSales();

  return useQuery({
    queryKey: QUERY_KEYS.saleAnalysis(saleId ?? ""),
    queryFn: async (): Promise<SaleAnalysis | null> => {
      if (!saleId) return null;

      // Find sale in local data to check sync status
      const sale = allSales.find((s) => s.id === saleId);

      // Only call API if sale is synced to backend
      if (isOnline && sale?.syncStatus === "synced") {
        try {
          // Cast to any to handle the dynamic route - the endpoint exists in backend
          const reportsApi = api.reports as any;
          const { data, error } = await reportsApi["sale/:id/analysis"].get({
            params: { id: saleId },
          });
          if (!error && data?.success && data?.data) {
            return data.data as SaleAnalysis;
          }
        } catch {
          // Fall back to local calculation
        }
      }

      // Offline fallback: calculate from local sales data
      if (!sale) return null;

      // Calculate customer history (always available offline)
      const customerSales = allSales.filter(
        (s) =>
          s.customerId === sale.customerId &&
          s.status !== "cancelled" &&
          s.status !== "draft"
      );

      const totalSpent = customerSales.reduce(
        (sum, s) => sum + parseFloat(s.totalAmount ?? "0"),
        0
      );

      const customerHistory: CustomerHistory = {
        totalPurchases: customerSales.length,
        totalSpent,
        averageSaleAmount:
          customerSales.length > 0 ? totalSpent / customerSales.length : 0,
        lastPurchaseDate:
          customerSales.length > 0
            ? new Date(
                Math.max(
                  ...customerSales.map((s) => new Date(s.saleDate).getTime())
                )
              )
            : null,
      };

      // Calculate payment status (always available offline)
      const totalAmount = parseFloat(sale.totalAmount ?? "0");
      const amountPaid = parseFloat(sale.amountPaid ?? "0");
      const balanceDue = parseFloat(sale.balanceDue ?? "0");
      const paymentPercentage = totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 0;

      const paymentStatus: PaymentStatus = {
        totalAmount,
        amountPaid,
        balanceDue,
        paymentPercentage: Math.round(paymentPercentage * 100) / 100,
        isFullyPaid: balanceDue <= 0,
        status:
          balanceDue <= 0 ? "paid" : amountPaid > 0 ? "partial" : "pending",
      };

      // Profit analysis not available offline (no costPriceSnapshot)
      return {
        sale: {
          id: sale.id,
          totalAmount: sale.totalAmount,
          balanceDue: sale.balanceDue,
          saleDate: new Date(sale.saleDate),
          status: sale.status,
          saleType: sale.saleType,
        },
        customerHistory,
        profitAnalysis: null,
        paymentStatus,
      };
    },
    enabled: !!saleId,
  });
}
