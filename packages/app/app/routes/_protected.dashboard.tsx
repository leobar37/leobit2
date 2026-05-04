import { Link } from "react-router";
import {
  ShoppingCart,
  Users,
  FileText,
  Wallet,
  AlertCircle,
  Settings,
  Weight,
  CreditCard,
  TrendingUp,
  Package,
  Receipt,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";
import { useMiDistribucion } from "~/hooks/use-distribuciones";
import { useProducts } from "~/hooks/use-products";
import { useSales } from "~/hooks/use-sales";
import { useExpenses } from "~/hooks/use-expenses";
import { BusinessUserRole } from "@avileo/shared";
import { InventoryCard } from "~/components/inventory/inventory-card";
import { MetricCard } from "~/components/dashboard/metric-card";
import { WeeklySalesChart } from "~/components/dashboard/weekly-sales-chart";
import {
  useSalesStats,
  useDebtorsSummary,
  useSalesChart,
} from "~/hooks/use-dashboard";
import { formatCurrency, formatKilos } from "~/lib/utils";
import { PeriodSelector, type PeriodValue } from "~/components/dashboard/period-selector";
import { OnboardingChecklist } from "~/components/dashboard/onboarding-checklist";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateSaleTypeSheet } from "~/components/sales/create-sale-type-sheet";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const { data: distribucion, isLoading: isLoadingDistribucion } = useMiDistribucion();

  const [period, setPeriod] = useState<PeriodValue>({
    type: "day",
    startDate: undefined,
    endDate: undefined,
  });

  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const { data: salesStats, isLoading: isLoadingSales } = useSalesStats(period);
  const { data: debtorsSummary, isLoading: isLoadingDebtors } = useDebtorsSummary();
  const { data: chartData, isLoading: isLoadingChart } = useSalesChart(period);

  const { data: products = [] } = useProducts();
  const { data: sales = [] } = useSales();
  const { data: expenses = [] } = useExpenses();

  const hasProducts = products.length > 0;
  const hasSales = sales.length > 0;

  // Calculate today's expenses
  const today = new Date().toISOString().split('T')[0];
  const todayExpenses = expenses.filter(e => e.expenseDate === today);
  const totalExpensesToday = todayExpenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);

  const usarDistribucion = business?.usarDistribucion ?? true;
  const tieneDistribucion = !!distribucion && distribucion.estado === "activo";
  const isAdmin = business?.role === BusinessUserRole.ADMIN_NEGOCIO;

  const debtorsCount = debtorsSummary?.debtorsCount ?? 0;
  const currentPeriodLabel =
    period.type === "day"
      ? "Hoy"
      : period.type === "week"
        ? "Esta semana"
        : period.type === "month"
          ? "Este mes"
          : "Rango personalizado";

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] bg-white/80 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:bg-[#151821] dark:shadow-[0_22px_52px_rgba(0,0,0,0.22)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[2rem] font-bold leading-none tracking-tight text-foreground">
              Hola, {user?.name?.split(" ")[0]}!
            </h1>
            <p className="mt-2 max-w-[24rem] text-sm leading-6 text-muted-foreground">
              Un vistazo simple a lo más importante del día.
            </p>
          </div>

          <div className="rounded-[18px] bg-black/[0.03] px-3 py-2 text-right dark:bg-white/[0.05]">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Periodo
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{currentPeriodLabel}</p>
          </div>
        </div>
      </div>

      <OnboardingChecklist
        hasProducts={hasProducts}
        hasSales={hasSales}
        userName={user?.name?.split(" ")[0]}
        onCreateSale={() => setCreateSheetOpen(true)}
      />

      {/* Selector de Período */}
      <PeriodSelector value={period} onChange={setPeriod} />

      {/* Accesos Rápidos - Siempre visibles */}
      <div className="grid grid-cols-3 gap-3">
        <Link to="/ventas" className="block">
          <div className="flex flex-col items-center gap-2 rounded-[20px] bg-white/55 px-2 py-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition-all active:scale-95 hover:bg-white/80 dark:bg-[#151821] dark:shadow-[0_12px_28px_rgba(0,0,0,0.2)] dark:hover:bg-[#1a1d26]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
              <ShoppingCart className="h-4.5 w-4.5 text-foreground/75" />
            </div>
            <span className="text-xs font-medium text-foreground/85">Venta</span>
          </div>
        </Link>

        <Link to="/clientes" className="block">
          <div className="flex flex-col items-center gap-2 rounded-[20px] bg-white/55 px-2 py-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition-all active:scale-95 hover:bg-white/80 dark:bg-[#151821] dark:shadow-[0_12px_28px_rgba(0,0,0,0.2)] dark:hover:bg-[#1a1d26]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
              <Users className="h-4.5 w-4.5 text-foreground/75" />
            </div>
            <span className="text-xs font-medium text-foreground/85">Clientes</span>
          </div>
        </Link>

        <Link to="/cobros" className="block relative">
          <div className="flex flex-col items-center gap-2 rounded-[20px] bg-white/55 px-2 py-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition-all active:scale-95 hover:bg-white/80 dark:bg-[#151821] dark:shadow-[0_12px_28px_rgba(0,0,0,0.2)] dark:hover:bg-[#1a1d26]">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
              <Wallet className="h-4.5 w-4.5 text-foreground/75" />
              {debtorsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {debtorsCount > 9 ? '9+' : debtorsCount}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-foreground/85">Cobros</span>
          </div>
        </Link>

        <Link to="/gastos" className="block">
          <div className="flex flex-col items-center gap-2 rounded-[20px] bg-white/55 px-2 py-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition-all active:scale-95 hover:bg-white/80 dark:bg-[#151821] dark:shadow-[0_12px_28px_rgba(0,0,0,0.2)] dark:hover:bg-[#1a1d26]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
              <Receipt className="h-4.5 w-4.5 text-foreground/75" />
            </div>
            <span className="text-xs font-medium text-foreground/85">Gastos</span>
          </div>
        </Link>

      </div>

      {/* Tabs para organizar el contenido */}
      <Tabs defaultValue="resumen" className="w-full border-t border-border/30 pt-4">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-[22px] bg-black/[0.04] p-1.5 dark:bg-white/[0.05]">
          <TabsTrigger value="resumen" className="flex min-h-[46px] items-center gap-2 rounded-[16px] text-base">
            <TrendingUp className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="distribucion" className="flex min-h-[46px] items-center gap-2 rounded-[16px] text-base">
            <Package className="h-4 w-4" />
            Distribución
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resumen - Métricas y Gráfico */}
        <TabsContent value="resumen" className="space-y-6 mt-4">
          {/* Métricas del Dashboard */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              title={period.type === "day" ? "Movimiento Hoy" : period.type === "week" ? "Movimiento Semana" : period.type === "month" ? "Movimiento Mes" : "Movimiento"}
              value={isLoadingSales ? "S/ -" : `S/ ${formatCurrency(salesStats?.current.amount ?? 0)}`}
              change={salesStats?.change.amount}
              icon={FileText}
              iconColor="text-orange-600"
            />
            <MetricCard
              title="Kilos"
              value={isLoadingSales ? "-" : `${formatKilos(salesStats?.current.kilos ?? 0)} kg`}
              change={salesStats?.change.kilos}
              icon={Weight}
              iconColor="text-blue-600"
            />
            <MetricCard
              title="Deudores"
              value={isLoadingDebtors ? "-" : String(debtorsCount)}
              subtitle="clientes con deuda"
              icon={Users}
              iconColor="text-red-600"
            />
            <MetricCard
              title="Gastos Hoy"
              value={`S/ ${formatCurrency(totalExpensesToday)}`}
              icon={Receipt}
              iconColor="text-amber-600"
            />
          </div>

          {/* Gráfico de Ventas */}
          {!isLoadingChart && chartData && (
            <WeeklySalesChart
              labels={chartData.labels}
              data={chartData.data}
              periodType={period.type}
            />
          )}
        </TabsContent>

        {/* Tab: Distribución */}
        <TabsContent value="distribucion" className="space-y-4 mt-4">
          {usarDistribucion && !isLoadingDistribucion && tieneDistribucion && (
            <Link to="/mi-distribucion" className="block">
              <InventoryCard
                puntoVenta={distribucion.puntoVenta}
                modo={"libre" as const}
                estado={distribucion.estado as "activo" | "cerrado" | "en_ruta"}
                cantidadItems={0}
              />
            </Link>
          )}

          {/* Alerta - Card blanca con borde lateral ámbar */}
          {usarDistribucion && !isLoadingDistribucion && !tieneDistribucion && (
            <Link to="/distribuciones" className="block">
              <div className="rounded-r-2xl border-l-4 border-amber-400 bg-white/70 py-3 pl-4 pr-3 dark:bg-white/[0.04]">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Sin distribución asignada</p>
                    <p className="text-sm text-muted-foreground">
                      {isAdmin
                        ? "Asigna tu distribución para hoy"
                        : "Contacta a tu administrador"}
                    </p>
                  </div>
                  {isAdmin && <Settings className="h-4 w-4 text-amber-500 ml-auto" />}
                </div>
              </div>
            </Link>
          )}

          {!usarDistribucion && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-white/20" />
              <p>El sistema de distribución está desactivado</p>
              <p className="text-sm">Contacta al administrador si necesitas activarlo</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateSaleTypeSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
      />
    </div>
  );
}
