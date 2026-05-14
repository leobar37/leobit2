import { Link, useNavigate } from "react-router";
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
  Droplets,
  Route,
  CarFront,
  Banknote,
  Plus,
  Clock,
  CalendarDays,
  Loader2,
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
  useSalesMovements,
  useSalesKilos,
  useDebtorsSummary,
  useSalesChart,
  useWaterOperationalReport,
} from "~/hooks/use-dashboard";
import { formatCurrency, formatKilos } from "~/lib/utils";
import { formatRecentDateTime, getToday } from "~/lib/date-utils";
import { PeriodSelector, type PeriodValue } from "~/components/dashboard/period-selector";
import { OnboardingChecklist } from "~/components/dashboard/onboarding-checklist";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateSaleTypeSheet } from "~/components/sales/create-sale-type-sheet";
import { useCocheraDashboard } from "~/hooks/use-cochera-dashboard";
import { AppDrawer } from "~/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { getSaleDetailPathWithReturn } from "~/lib/sales/navigation";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: business, isLoading: isLoadingBusiness } = useBusiness();
  const { data: distribucion, isLoading: isLoadingDistribucion } = useMiDistribucion();

  const [period, setPeriod] = useState<PeriodValue>({
    type: "day",
    startDate: undefined,
    endDate: undefined,
  });

  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [movementsDrawerOpen, setMovementsDrawerOpen] = useState(false);
  const [kilosDrawerOpen, setKilosDrawerOpen] = useState(false);

  const { data: salesStats, isLoading: isLoadingSales } = useSalesStats(period);
  const {
    data: salesMovements,
    isLoading: isLoadingMovements,
    isError: isMovementsError,
    refetch: refetchMovements,
  } = useSalesMovements(period, {
    enabled: movementsDrawerOpen && business?.businessMode === "polleria",
  });
  const {
    data: salesKilos,
    isLoading: isLoadingKilos,
    isError: isKilosError,
    refetch: refetchKilos,
  } = useSalesKilos(period, {
    enabled: kilosDrawerOpen && business?.businessMode === "polleria",
  });
  const { data: debtorsSummary, isLoading: isLoadingDebtors } = useDebtorsSummary();
  const { data: chartData, isLoading: isLoadingChart } = useSalesChart(period);

  const { data: products = [] } = useProducts();
  const { data: sales = [] } = useSales();
  const { data: expenses = [] } = useExpenses();

  const hasProducts = products.length > 0;
  const hasSales = sales.length > 0;

  // Calculate today's expenses
  const today = getToday();
  const todayExpenses = expenses.filter(e => e.expenseDate === today);
  const totalExpensesToday = todayExpenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);

  const usarDistribucion = business?.usarDistribucion ?? true;
  const tieneDistribucion = !!distribucion && distribucion.estado === "activo";
  const isAdmin = business?.role === BusinessUserRole.ADMIN_NEGOCIO;
  const isWaterMode = business?.businessMode === "agua";
  const isCocheraMode = business?.businessMode === "cochera";
  const isPolleriaMode = business?.businessMode === "polleria";
  const { data: waterReport, isLoading: isLoadingWaterReport } = useWaterOperationalReport(period, {
    enabled: isWaterMode,
  });

  const { data: cocheraDashboard, isLoading: isLoadingCocheraDashboard } = useCocheraDashboard({
    enabled: isCocheraMode,
  });

  const debtorsCount = debtorsSummary?.debtorsCount ?? 0;
  const currentPeriodLabel =
    period.type === "day"
      ? "Hoy"
      : period.type === "week"
        ? "Esta semana"
        : period.type === "month"
          ? "Este mes"
          : "Rango personalizado";
  const movementsTitle =
    period.type === "day"
      ? "Movimientos de hoy"
      : period.type === "week"
        ? "Movimientos de la semana"
        : period.type === "month"
          ? "Movimientos del mes"
          : "Movimientos del rango";
  const kilosTitle =
    period.type === "day"
      ? "Kilos de hoy"
      : period.type === "week"
        ? "Kilos de la semana"
        : period.type === "month"
          ? "Kilos del mes"
          : "Kilos del rango";

  if (isLoadingBusiness || !business) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
          <p className="text-sm font-medium">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Cochera mode: simplified dashboard with parking-focused quick actions
  if (isCocheraMode) {
    const formatChartDate = (value: string) => {
      const [year, month, day] = value.split("-").map(Number);
      const date =
        year && month && day
          ? new Date(year, month - 1, day)
          : new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }

      return date
        .toLocaleDateString("es-PE", { weekday: "short" })
        .replace(".", "");
    };

    const chartLabels = cocheraDashboard?.chartData.map((d) => {
      return formatChartDate(String(d.date));
    }) ?? [];
    const chartValues = cocheraDashboard?.chartData.map((d) => Number(d.income)) ?? [];

    const quickActions = [
      {
        to: "/cochera/entrada",
        label: "Nueva entrada",
        testId: "cochera-dashboard-action-entry",
        icon: Plus,
      },
      {
        to: "/cochera",
        label: "Vehículos dentro",
        testId: "cochera-dashboard-action-active",
        icon: CarFront,
      },
      {
        to: "/reportes",
        label: "Reportes",
        testId: "cochera-dashboard-action-reports",
        icon: FileText,
      },
      ...(isAdmin
        ? [
            {
              to: "/config/cochera",
              label: "Configuración",
              testId: "cochera-dashboard-action-config",
              icon: Settings,
            },
          ]
        : []),
    ];

    return (
      <div className="space-y-5">
        <div className="rounded-[28px] bg-white/80 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:bg-[#151821] dark:shadow-[0_22px_52px_rgba(0,0,0,0.22)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[2rem] font-bold leading-none tracking-tight text-foreground">
                Hola, {user?.name?.split(" ")[0]}!
              </h1>
              <p className="mt-2 max-w-[24rem] text-sm leading-6 text-muted-foreground">
                Control de vehículos y cobros del día.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.to} to={action.to} data-testid={action.testId} className="block">
                <div className="flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-[20px] bg-white/55 px-2 py-3 text-center shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition-all active:scale-95 hover:bg-white/80 dark:bg-[#151821] dark:shadow-[0_12px_28px_rgba(0,0,0,0.2)] dark:hover:bg-[#1a1d26]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                    <Icon className="h-4.5 w-4.5 text-foreground/75" />
                  </div>
                  <span className="text-xs font-medium leading-4 text-foreground/85">{action.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Métricas Cochera */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            title="Entradas Hoy"
            dataTestId="cochera-dashboard-entries-today"
            value={isLoadingCocheraDashboard ? "-" : String(cocheraDashboard?.todayEntries ?? 0)}
            icon={CarFront}
            iconColor="text-blue-600"
          />
          <MetricCard
            title="Dentro Ahora"
            value={isLoadingCocheraDashboard ? "-" : String(cocheraDashboard?.activeInside ?? 0)}
            icon={Clock}
            iconColor="text-orange-600"
          />
          <MetricCard
            title="Ingresos Hoy"
            value={isLoadingCocheraDashboard ? "S/ -" : `S/ ${formatCurrency(Number(cocheraDashboard?.todayIncome ?? 0))}`}
            icon={Banknote}
            iconColor="text-green-600"
          />
          <MetricCard
            title="Ingresos Mes"
            value={isLoadingCocheraDashboard ? "S/ -" : `S/ ${formatCurrency(Number(cocheraDashboard?.monthIncome ?? 0))}`}
            icon={CalendarDays}
            iconColor="text-emerald-600"
          />
        </div>

        {/* Gráfico 7 días */}
        {!isLoadingCocheraDashboard && chartLabels.length > 0 && (
          <WeeklySalesChart
            labels={chartLabels}
            data={chartValues}
            periodType="week"
          />
        )}

        {/* Actividad Reciente */}
        {cocheraDashboard && cocheraDashboard.recentActivity.length > 0 && (
          <div className="shell-card-flat rounded-[24px] bg-white/70 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)] dark:bg-[#151821] dark:shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Cobros Recientes
            </h3>
            <div className="space-y-2">
              {cocheraDashboard.recentActivity.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-[14px] bg-black/[0.02] px-3 py-2.5 dark:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100/80 dark:bg-orange-500/12">
                      <CarFront className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{session.plate}</p>
                      <p className="text-xs text-muted-foreground capitalize">{session.vehicleType}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      S/ {formatCurrency(Number(session.totalAmount ?? 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.checkoutAt
                        ? new Date(session.checkoutAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
                        : "-"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="border-b border-border/70 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[2rem] font-bold leading-none tracking-tight text-foreground">
              Hola, {user?.name?.split(" ")[0]}!
            </h1>
            <p className="mt-2 max-w-[24rem] text-sm leading-6 text-muted-foreground">
              Un vistazo simple a lo más importante del día.
            </p>
          </div>

          <div className="min-w-[74px] border-l border-border/70 pl-3 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Periodo
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {currentPeriodLabel}
            </p>
          </div>
        </div>
      </section>

      <OnboardingChecklist
        hasProducts={hasProducts}
        hasSales={hasSales}
        userName={user?.name?.split(" ")[0]}
        businessMode={business?.businessMode}
        onCreateSale={() => setCreateSheetOpen(true)}
      />

      {/* Selector de Período */}
      <PeriodSelector value={period} onChange={setPeriod} />

      {/* Accesos Rápidos - Siempre visibles */}
      <div className="grid grid-cols-4 gap-2">
        <Link to={isWaterMode ? "/distribuciones/nueva" : "/ventas"} className="block">
          <div className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-muted/15 px-2 py-2 transition-colors active:scale-[0.98] hover:bg-muted/30">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/45">
              <ShoppingCart className="h-4 w-4 text-foreground/75" />
            </div>
            <span className="text-xs font-medium leading-4 text-foreground/85">{isWaterMode ? "Ruta" : "Venta"}</span>
          </div>
        </Link>

        <Link to="/clientes" className="block">
          <div className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-muted/15 px-2 py-2 transition-colors active:scale-[0.98] hover:bg-muted/30">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/45">
              <Users className="h-4 w-4 text-foreground/75" />
            </div>
            <span className="text-xs font-medium leading-4 text-foreground/85">Clientes</span>
          </div>
        </Link>

        <Link to="/cobros" className="block relative">
          <div className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-muted/15 px-2 py-2 transition-colors active:scale-[0.98] hover:bg-muted/30">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-muted/45">
              <Wallet className="h-4 w-4 text-foreground/75" />
              {debtorsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {debtorsCount > 9 ? '9+' : debtorsCount}
                </span>
              )}
            </div>
            <span className="text-xs font-medium leading-4 text-foreground/85">Cobros</span>
          </div>
        </Link>

        <Link to="/gastos" className="block">
          <div className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-muted/15 px-2 py-2 transition-colors active:scale-[0.98] hover:bg-muted/30">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/45">
              <Receipt className="h-4 w-4 text-foreground/75" />
            </div>
            <span className="text-xs font-medium leading-4 text-foreground/85">Gastos</span>
          </div>
        </Link>

      </div>

      {/* Tabs para organizar el contenido */}
      <Tabs defaultValue="resumen" className="w-full border-t border-border/70 pt-4">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-lg border border-border bg-muted/25 p-1">
          <TabsTrigger value="resumen" className="flex min-h-[42px] items-center gap-2 rounded-md text-sm">
            <TrendingUp className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="distribucion" className="flex min-h-[42px] items-center gap-2 rounded-md text-sm">
            <Package className="h-4 w-4" />
            Distribución
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resumen - Métricas y Gráfico */}
        <TabsContent value="resumen" className="space-y-6 mt-4">
          {/* Métricas del Dashboard */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              dataTestId={isWaterMode ? "water-dashboard-revenue" : undefined}
              title={period.type === "day" ? "Movimiento Hoy" : period.type === "week" ? "Movimiento Semana" : period.type === "month" ? "Movimiento Mes" : "Movimiento"}
              value={
                isWaterMode
                  ? isLoadingWaterReport
                    ? "S/ -"
                    : `S/ ${formatCurrency(waterReport?.summary.totalRevenue ?? 0)}`
                  : isLoadingSales
                    ? "S/ -"
                    : `S/ ${formatCurrency(salesStats?.current.amount ?? 0)}`
              }
              change={isWaterMode ? undefined : salesStats?.change.amount}
              icon={FileText}
              iconColor="text-orange-600"
              onClick={isPolleriaMode ? () => setMovementsDrawerOpen(true) : undefined}
              ariaLabel={isPolleriaMode ? `Ver ${movementsTitle.toLowerCase()}` : undefined}
            />
            <MetricCard
              dataTestId={isWaterMode ? "water-dashboard-containers" : undefined}
              title={isWaterMode ? "Bidones" : "Kilos"}
              value={
                isWaterMode
                  ? isLoadingWaterReport
                    ? "-"
                    : String(Math.round(waterReport?.summary.soldContainers ?? 0))
                  : isLoadingSales
                    ? "-"
                    : `${formatKilos(salesStats?.current.kilos ?? 0)} kg`
              }
              change={isWaterMode ? undefined : salesStats?.change.kilos}
              icon={isWaterMode ? Droplets : Weight}
              iconColor="text-blue-600"
              onClick={isPolleriaMode ? () => setKilosDrawerOpen(true) : undefined}
              ariaLabel={isPolleriaMode ? `Ver ${kilosTitle.toLowerCase()}` : undefined}
            />
            <MetricCard
              dataTestId={isWaterMode ? "water-dashboard-stops-completed" : undefined}
              title={isWaterMode ? "Paradas completadas" : "Deudores"}
              value={
                isWaterMode
                  ? isLoadingWaterReport
                    ? "-"
                    : `${waterReport?.summary.stopsCompleted ?? 0}/${waterReport?.summary.stopsTotal ?? 0}`
                  : isLoadingDebtors
                    ? "-"
                    : String(debtorsCount)
              }
              subtitle={isWaterMode ? "ruta operativa" : "clientes con deuda"}
              icon={isWaterMode ? Route : Users}
              iconColor={isWaterMode ? "text-sky-600" : "text-red-600"}
            />
            <MetricCard
              dataTestId={isWaterMode ? "water-dashboard-stops-pending" : undefined}
              title={isWaterMode ? "Pendientes" : "Gastos Hoy"}
              value={
                isWaterMode
                  ? isLoadingWaterReport
                    ? "-"
                    : String(waterReport?.summary.stopsPending ?? 0)
                  : `S/ ${formatCurrency(totalExpensesToday)}`
              }
              icon={isWaterMode ? Clock : Receipt}
              iconColor={isWaterMode ? "text-amber-600" : "text-amber-600"}
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
              {isWaterMode ? (
                <div className="border-b border-border/60 pb-4 dark:border-white/[0.07]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-sky-600 dark:text-sky-300">
                        <Route className="h-4 w-4" />
                        Ruta de hoy
                      </div>
                      <p className="mt-1 truncate text-lg font-semibold text-foreground">
                        {distribucion.puntoVenta}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {waterReport?.summary.stopsPending ?? 0} pendientes
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      S/ {formatCurrency(waterReport?.summary.totalRevenue ?? 0)}
                    </span>
                  </div>
                </div>
              ) : (
                <InventoryCard
                  puntoVenta={distribucion.puntoVenta}
                  modo={"libre" as const}
                  estado={distribucion.estado as "activo" | "cerrado" | "en_ruta"}
                  cantidadItems={0}
                />
              )}
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
                        ? isWaterMode
                          ? "Crea una ruta para hoy"
                          : "Asigna tu distribución para hoy"
                        : "Contacta a tu administrador"}
                    </p>
                  </div>
                  {isAdmin && (isWaterMode
                    ? <Route className="h-4 w-4 text-amber-500 ml-auto" />
                    : <Settings className="h-4 w-4 text-amber-500 ml-auto" />
                  )}
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

      <AppDrawer
        open={movementsDrawerOpen}
        onOpenChange={setMovementsDrawerOpen}
        size="large"
        description="Detalle de ventas que componen el movimiento del periodo"
        data-testid="dashboard-movements-drawer"
      >
        <AppDrawer.Header
          title={movementsTitle}
          icon={<FileText className="h-5 w-5" />}
          onClose={() => setMovementsDrawerOpen(false)}
        />
        <AppDrawer.Body className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/70 bg-muted/20 p-3">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Total</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                S/ {formatCurrency(salesMovements?.summary.amount ?? salesStats?.current.amount ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Ventas</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {salesMovements?.summary.count ?? salesStats?.current.count ?? 0}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Kilos</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {formatKilos(salesStats?.current.kilos ?? salesMovements?.summary.kilos ?? 0)} kg
              </p>
            </div>
          </div>

          {isLoadingMovements ? (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-2xl bg-muted/35"
                />
              ))}
            </div>
          ) : isMovementsError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-500/20 dark:bg-red-500/10">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                No se pudieron cargar los movimientos.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 rounded-xl"
                onClick={() => refetchMovements()}
              >
                Reintentar
              </Button>
            </div>
          ) : salesMovements?.sales.length ? (
            <div className="space-y-2">
              {salesMovements.sales.map((sale) => {
                const customerName = sale.customer?.name || "Cliente general";
                const isCreditSale = sale.saleType === "credito";

                return (
                  <button
                    key={sale.id}
                    type="button"
                    className="w-full rounded-2xl border border-border/70 bg-background p-3 text-left transition-colors active:scale-[0.99] hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70"
                    onClick={() => navigate(getSaleDetailPathWithReturn(sale.id, { pathname: "/dashboard", search: "" }))}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {customerName}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {isCreditSale ? "Crédito" : "Contado"} · {formatRecentDateTime(sale.saleDate)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-foreground">
                        S/ {formatCurrency(sale.totalAmount)}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{sale.status === "delivered" ? "Entregada" : sale.status === "confirmed" ? "Confirmada" : "Activa"}</span>
                      <span>{formatKilos(Number(sale.netWeight ?? 0))} kg</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-muted/15 p-6 text-center">
              <p className="text-sm font-medium text-foreground">
                No hay movimientos en este periodo
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Las ventas confirmadas aparecerán aquí.
              </p>
            </div>
          )}
        </AppDrawer.Body>
      </AppDrawer>

      <AppDrawer
        open={kilosDrawerOpen}
        onOpenChange={setKilosDrawerOpen}
        size="large"
        description="Detalle de productos vendidos por kilo en el periodo"
        data-testid="dashboard-kilos-drawer"
      >
        <AppDrawer.Header
          title={kilosTitle}
          icon={<Weight className="h-5 w-5" />}
          onClose={() => setKilosDrawerOpen(false)}
        />
        <AppDrawer.Body className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/70 bg-muted/20 p-3">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Kilos</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {formatKilos(salesKilos?.summary.kilos ?? salesStats?.current.kilos ?? 0)} kg
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Ventas</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {salesKilos?.summary.count ?? salesStats?.current.count ?? 0}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Total</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                S/ {formatCurrency(salesKilos?.summary.amount ?? 0)}
              </p>
            </div>
          </div>

          {isLoadingKilos ? (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-2xl bg-muted/35"
                />
              ))}
            </div>
          ) : isKilosError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-500/20 dark:bg-red-500/10">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                No se pudo cargar el detalle de kilos.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 rounded-xl"
                onClick={() => refetchKilos()}
              >
                Reintentar
              </Button>
            </div>
          ) : salesKilos?.items.length ? (
            <div className="space-y-2">
              {salesKilos.items.map((item, index) => {
                const customerName = item.customer?.name || "Cliente general";

                return (
                  <button
                    key={`${item.saleId}-${index}`}
                    type="button"
                    className="w-full rounded-2xl border border-border/70 bg-background p-3 text-left transition-colors active:scale-[0.99] hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70"
                    onClick={() => navigate(getSaleDetailPathWithReturn(item.saleId, { pathname: "/dashboard", search: "" }))}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {item.productName}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {item.variantName} · {customerName}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-foreground">
                        {formatKilos(item.kilos)} kg
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{formatRecentDateTime(item.saleDate)}</span>
                      <span>S/ {formatCurrency(item.subtotal)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-muted/15 p-6 text-center">
              <p className="text-sm font-medium text-foreground">
                No hay kilos vendidos en este periodo
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Las ventas válidas con productos por kilo aparecerán aquí.
              </p>
            </div>
          )}
        </AppDrawer.Body>
      </AppDrawer>

      <CreateSaleTypeSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
      />
    </div>
  );
}
