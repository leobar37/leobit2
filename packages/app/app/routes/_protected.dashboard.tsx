import { Link } from "react-router";
import {
  ShoppingCart,
  Users,
  FileText,
  Wallet,
  AlertCircle,
  Settings,
  DollarSign,
  Weight,
  CreditCard,
  WifiOff,
  CloudOff,
  TrendingUp,
  Package,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";
import { useMiDistribucion } from "~/hooks/use-distribuciones";
import { useProducts } from "~/hooks/use-products";
import { useSales } from "~/hooks/use-sales";
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

  const isOnline = navigator.onLine;
  const hasProducts = products.length > 0;
  const hasSales = sales.length > 0;

  const usarDistribucion = business?.usarDistribucion ?? true;
  const tieneDistribucion = !!distribucion && distribucion.estado === "activo";
  const isAdmin = business?.role === BusinessUserRole.ADMIN_NEGOCIO;

  const debtorsCount = debtorsSummary?.debtorsCount ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome - Sin fondo, solo texto */}
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-foreground">
          Hola, {user?.name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-base text-muted-foreground mt-1">
          Bienvenido de vuelta a tu sistema de ventas
        </p>
      </div>

      <OnboardingChecklist
        hasProducts={hasProducts}
        hasSales={hasSales}
        userName={user?.name?.split(" ")[0]}
        onCreateSale={() => setCreateSheetOpen(true)}
      />

      {/* Offline Status Indicators */}
      {!isOnline && (
        <div className="bg-amber-100 text-amber-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <WifiOff className="h-4 w-4" />
          Sin conexión - mostrando datos locales
        </div>
      )}

      {/* Selector de Período */}
      <PeriodSelector value={period} onChange={setPeriod} />

      {/* Accesos Rápidos - Siempre visibles */}
      <div className="grid grid-cols-3 gap-2">
        <Link to="/ventas" className="block">
          <div className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl hover:bg-gray-50 active:scale-95 transition-all">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-gray-700">Venta</span>
          </div>
        </Link>

        <Link to="/clientes" className="block">
          <div className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl hover:bg-gray-50 active:scale-95 transition-all">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-700">Clientes</span>
          </div>
        </Link>

        <Link to="/cobros" className="block relative">
          <div className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl hover:bg-gray-50 active:scale-95 transition-all">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center relative">
              <Wallet className="h-5 w-5 text-red-600" />
              {debtorsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {debtorsCount > 9 ? '9+' : debtorsCount}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-gray-700">Cobros</span>
          </div>
        </Link>


      </div>

      {/* Tabs para organizar el contenido */}
      <Tabs defaultValue="resumen" className="w-full border-t pt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="resumen" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="distribucion" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Distribución
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resumen - Métricas y Gráfico */}
        <TabsContent value="resumen" className="space-y-6 mt-4">
          {/* Métricas del Dashboard */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              title={period.type === "day" ? "Ventas Hoy" : period.type === "week" ? "Ventas Semana" : period.type === "month" ? "Ventas Mes" : "Ventas"}
              value={isLoadingSales ? "S/ -" : `S/ ${formatCurrency(salesStats?.current.amount ?? 0)}`}
              change={salesStats?.change.amount}
              icon={DollarSign}
              iconColor="text-green-600"
            />
            <MetricCard
              title="Kilos Vendidos"
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
              title="Por Cobrar"
              value={isLoadingDebtors ? "S/ -" : `S/ ${formatCurrency(debtorsSummary?.totalDebt ?? 0)}`}
              icon={CreditCard}
              iconColor="text-orange-600"
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
              <div className="border-l-4 border-amber-400 bg-white py-3 pl-4 pr-3">
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
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
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
