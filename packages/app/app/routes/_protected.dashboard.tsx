import { Link } from "react-router";
import {
  ShoppingCart,
  Users,
  Package,
  FileText,
  Wallet,
  AlertCircle,
  Settings,
  DollarSign,
  Weight,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";
import { useMiDistribucion } from "~/hooks/use-distribuciones";
import { BusinessUserRole } from "@avileo/shared";
import {
  MinimalCard,
  MinimalCardTitle,
  MinimalCardMedia,
} from "~/components/cards";
import { Badge } from "@/components/ui/badge";
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
import { useState } from "react";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const { data: distribucion, isLoading: isLoadingDistribucion } = useMiDistribucion();

  const [period, setPeriod] = useState<PeriodValue>({
    type: "day",
    startDate: undefined,
    endDate: undefined,
  });

  const { data: salesStats, isLoading: isLoadingSales } = useSalesStats(period);
  const { data: debtorsSummary, isLoading: isLoadingDebtors } = useDebtorsSummary();
  const { data: chartData, isLoading: isLoadingChart } = useSalesChart(period);

  const usarDistribucion = business?.usarDistribucion ?? true;
  const tieneDistribucion = !!distribucion && distribucion.kilosAsignados != null && distribucion.kilosAsignados > 0;
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

      {usarDistribucion && !isLoadingDistribucion && tieneDistribucion && (
        <Link to="/mi-distribucion" className="block">
          <InventoryCard
            kilosAsignados={distribucion.kilosAsignados}
            kilosVendidos={distribucion.kilosVendidos}
            puntoVenta={distribucion.puntoVenta}
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

      {/* Selector de Período */}
      <PeriodSelector value={period} onChange={setPeriod} />

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
        <WeeklySalesChart labels={chartData.labels} data={chartData.data} />
      )}

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/ventas" className="block">
          <MinimalCard 
            variant="outlined" 
            interactive 
            clickable 
            radius="md" 
            className="h-32 flex flex-col items-center justify-center gap-2"
          >
            <MinimalCardMedia icon={ShoppingCart} iconColor="text-orange-600" size="lg" />
            <MinimalCardTitle className="text-sm font-medium">Nueva Venta</MinimalCardTitle>
          </MinimalCard>
        </Link>

        <Link to="/clientes" className="block">
          <MinimalCard 
            variant="outlined" 
            interactive 
            clickable 
            radius="md" 
            className="h-32 flex flex-col items-center justify-center gap-2"
          >
            <MinimalCardMedia icon={Users} iconColor="text-blue-600" size="lg" />
            <MinimalCardTitle className="text-sm font-medium">Clientes</MinimalCardTitle>
          </MinimalCard>
        </Link>

        <Link to="/cobros" className="block">
          <MinimalCard 
            variant="outlined" 
            interactive 
            clickable 
            radius="md" 
            className="h-32 flex flex-col items-center justify-center gap-2 relative"
          >
            <MinimalCardMedia icon={Wallet} iconColor="text-red-600" size="lg" />
            <MinimalCardTitle className="text-sm font-medium">Cobros</MinimalCardTitle>
            {debtorsCount > 0 && (
              <Badge className="absolute top-3 right-3 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {debtorsCount}
              </Badge>
            )}
          </MinimalCard>
        </Link>

        <Link to="/cierre" className="block">
          <MinimalCard 
            variant="outlined" 
            interactive 
            clickable 
            radius="md" 
            className="h-32 flex flex-col items-center justify-center gap-2"
          >
            <MinimalCardMedia icon={FileText} iconColor="text-purple-600" size="lg" />
            <MinimalCardTitle className="text-sm font-medium">Cierre</MinimalCardTitle>
          </MinimalCard>
        </Link>
      </div>
    </div>
  );
}
