import { useState } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  BarChart3,
  CarFront,
  Droplets,
  Download,
  FileText,
  ReceiptText,
  Route,
  ShoppingBasket,
  Wallet,
} from "lucide-react";
import type { CocheraReportPeriod, CocheraReportRow } from "@avileo/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MobilePage, MobileSlot } from "~/components/mobile";
import { useBusinessMode } from "~/hooks/use-business-mode";
import { useCocheraReport, useExportCocheraReport } from "~/hooks/use-cochera-reports";
import { useWaterOperationalReport } from "~/hooks/use-dashboard";
import { useSubscriptionStatus } from "~/hooks/use-subscription-status";
import { formatCurrency } from "~/lib/utils";

const periodOptions: { value: CocheraReportPeriod; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
];

const reportLinks = [
  {
    to: "/reportes/cuentas-por-cobrar",
    title: "Cuentas por cobrar",
    description: "Clientes con saldos pendientes.",
    icon: Wallet,
  },
  {
    to: "/reportes/alertas-stock",
    title: "Alertas de stock",
    description: "Productos e inventario por reponer.",
    icon: AlertTriangle,
  },
  {
    to: "/reportes/compras-sugeridas",
    title: "Compras sugeridas",
    description: "Estimación de abastecimiento.",
    icon: ShoppingBasket,
  },
];

const waterPeriodOptions = [
  { value: "day", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
] as const;

const paymentMethodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins} min`;
  return `${hours} h ${mins} min`;
}

function vehicleTypeLabel(type: CocheraReportRow["vehicleType"]): string {
  const labels: Record<string, string> = {
    auto: "Auto",
    moto: "Moto",
    camioneta: "Camioneta",
    mototaxi: "Mototaxi",
    motolineal: "Motolineal",
  };
  return labels[type] ?? type;
}

function settlementStatus(row: CocheraReportRow): { label: string; className: string } {
  const balanceDue = Number(row.balanceDue ?? "0") || 0;
  const amountPaid = Number(row.amountPaid ?? "0") || 0;

  if (balanceDue <= 0) {
    return { label: "Cobrado", className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200" };
  }

  if (amountPaid > 0 || row.paymentMode === "a_cuenta") {
    return { label: "A cuenta", className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200" };
  }

  return { label: "Pendiente", className: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200" };
}

function ReportsMenu() {
  return (
    <MobilePage.Root maxWidth="md" className="space-y-4">
      <div className="rounded-[28px] bg-white/80 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:bg-[#151821]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
            <p className="text-sm text-muted-foreground">Consulta indicadores clave del negocio.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {reportLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className="block">
              <Card className="border-0 bg-white/75 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition-all active:scale-[0.99] dark:bg-[#151821]">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-foreground">{item.title}</h2>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </MobilePage.Root>
  );
}

function CocheraReportsContent() {
  const [period, setPeriod] = useState<CocheraReportPeriod>("today");
  const report = useCocheraReport(period);
  const subscription = useSubscriptionStatus();
  const exportReport = useExportCocheraReport();

  const canExport = subscription.data?.canExport ?? false;
  const rows = report.data?.rows ?? [];

  return (
    <MobilePage.Root maxWidth="lg" className="space-y-4">
      <div className="rounded-[28px] bg-white/80 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:bg-[#151821]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CarFront className="h-5 w-5 text-orange-600" />
              <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Vehículos completados e ingresos por periodo.</p>
          </div>
          <Badge variant={canExport ? "success" : "shell"}>{canExport ? "Exportación activa" : "Solo lectura"}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {periodOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
          data-testid={`cochera-report-period-${option.value}`}
            size="sm"
            variant={period === option.value ? "default" : "outline"}
            className="rounded-2xl"
            onClick={() => setPeriod(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-0 bg-white/75 shadow-sm dark:bg-[#151821]">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Vehículos</p>
            <p className="mt-1 text-2xl font-bold">{report.data?.summary.totalVehicles ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/75 shadow-sm dark:bg-[#151821]">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Cobrado</p>
            <p className="mt-1 text-2xl font-bold">S/ {formatCurrency(report.data?.summary.totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white/75 shadow-sm dark:bg-[#151821]">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pendiente</p>
            <p className="mt-1 text-2xl font-bold">S/ {formatCurrency(report.data?.summary.totalPending)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {report.data ? `${formatDateTime(report.data.startDate)} - ${formatDateTime(report.data.endDate)}` : "Cargando periodo..."}
        </div>
        <Button
          type="button"
          variant="outline"
          data-testid="cochera-report-export"
          className="rounded-2xl"
          disabled={!canExport || exportReport.isPending}
          onClick={() => exportReport.mutate(period)}
        >
          <Download className="h-4 w-4" />
          {exportReport.isPending ? "Exportando..." : "Exportar CSV"}
        </Button>
      </div>

      {!canExport && !subscription.isLoading ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Exportación no disponible en tu plan.
        </div>
      ) : null}

      {report.isLoading ? (
        <Card className="border-0 bg-white/75 dark:bg-[#151821]">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">Cargando reporte...</CardContent>
        </Card>
      ) : report.isError ? (
        <Card className="border-0 bg-white/75 dark:bg-[#151821]">
          <CardContent className="p-6 text-center text-sm text-red-600">No se pudo cargar el reporte.</CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="border-0 bg-white/75 dark:bg-[#151821]">
          <CardContent className="p-6 text-center">
            <ReceiptText className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 font-medium">Sin vehículos completados</p>
            <p className="text-sm text-muted-foreground">No hay salidas registradas para este periodo.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const status = settlementStatus(row);
            return (
              <Card key={row.id} className="border-0 bg-white/75 shadow-sm dark:bg-[#151821]">
                <CardContent className="p-4" data-testid={`cochera-report-row-${row.plate}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold tracking-wide">{row.plate}</p>
                        <Badge variant="outline">{vehicleTypeLabel(row.vehicleType)}</Badge>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(row.entryAt)} → {formatDateTime(row.exitAt)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDuration(row.durationMinutes)}</p>
                      {row.responsibleName ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Responsable: {row.responsibleName}
                          {row.responsiblePhone ? ` · ${row.responsiblePhone}` : ""}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="font-bold">S/ {formatCurrency(row.amountPaid)}</p>
                      {Number(row.balanceDue ?? "0") > 0 ? (
                        <p className="text-xs text-amber-600 dark:text-amber-300">
                          Pend. S/ {formatCurrency(row.balanceDue)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Total S/ {formatCurrency(row.totalAmount)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{row.paymentMethod ?? "Sin método"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </MobilePage.Root>
  );
}

function WaterReportsContent() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const report = useWaterOperationalReport({ type: period }, { enabled: true });
  const summary = report.data?.summary;
  const paymentRows = summary
    ? Object.entries(summary.paymentBreakdown).filter(([, amount]) => amount > 0)
    : [];

  return (
    <MobilePage.Root maxWidth="lg" className="space-y-4">
      <div className="rounded-[28px] bg-white/80 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:bg-[#151821]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-sky-600" />
              <h1 className="text-2xl font-bold tracking-tight">Reportes de agua</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Bidones, paradas y recaudación por ruta/repartidor.
            </p>
          </div>
          <Badge variant="shell">Operativo</Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {waterPeriodOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={period === option.value ? "default" : "outline"}
            className="rounded-2xl"
            onClick={() => setPeriod(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {report.isLoading ? (
        <Card className="border-0 bg-white/75 dark:bg-[#151821]">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">Cargando reporte...</CardContent>
        </Card>
      ) : report.isError ? (
        <Card className="border-0 bg-white/75 dark:bg-[#151821]">
          <CardContent className="p-6 text-center text-sm text-red-600">No se pudo cargar el reporte.</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card className="border-0 bg-white/75 shadow-sm dark:bg-[#151821]">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Bidones vendidos</p>
                <p className="mt-1 text-2xl font-bold">{summary?.soldContainers ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/75 shadow-sm dark:bg-[#151821]">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Bidones entregados</p>
                <p className="mt-1 text-2xl font-bold">{summary?.deliveredContainers ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/75 shadow-sm dark:bg-[#151821]">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Paradas</p>
                <p className="mt-1 text-2xl font-bold">
                  {summary?.stopsCompleted ?? 0}/{summary?.stopsTotal ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/75 shadow-sm dark:bg-[#151821]">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="mt-1 text-2xl font-bold">{summary?.stopsPending ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/75 shadow-sm dark:bg-[#151821]">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Recaudación</p>
                <p className="mt-1 text-2xl font-bold">S/ {formatCurrency(summary?.totalRevenue)}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 bg-white/75 shadow-sm dark:bg-[#151821]">
            <CardContent className="p-4">
              <h2 className="font-semibold">Desglose de recaudación</h2>
              {paymentRows.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Sin recaudación registrada.</p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {paymentRows.map(([method, amount]) => (
                    <div key={method} className="rounded-2xl bg-sky-50 p-3 dark:bg-sky-500/10">
                      <p className="text-xs text-sky-700 dark:text-sky-200">
                        {paymentMethodLabels[method] ?? method}
                      </p>
                      <p className="font-bold">S/ {formatCurrency(amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            {(report.data?.routes ?? []).length === 0 ? (
              <Card className="border-0 bg-white/75 dark:bg-[#151821]">
                <CardContent className="p-6 text-center">
                  <Route className="mx-auto h-10 w-10 text-muted-foreground/60" />
                  <p className="mt-3 font-medium">Sin rutas en el periodo</p>
                  <p className="text-sm text-muted-foreground">Aún no hay paradas ni entregas registradas.</p>
                </CardContent>
              </Card>
            ) : (
              report.data?.routes.map((row) => (
                <Card key={row.distribucionId ?? row.routeName} className="border-0 bg-white/75 shadow-sm dark:bg-[#151821]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{row.routeName}</p>
                        <p className="text-xs text-muted-foreground">{row.sellerLabel}</p>
                      </div>
                      <p className="font-bold">S/ {formatCurrency(row.totalRevenue)}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="rounded-xl bg-sky-50 p-2 dark:bg-sky-500/10">
                        <p className="text-xs text-muted-foreground">Bidones</p>
                        <p className="font-bold">{row.deliveredContainers}</p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 p-2 dark:bg-emerald-500/10">
                        <p className="text-xs text-muted-foreground">Completadas</p>
                        <p className="font-bold">{row.stopsCompleted}</p>
                      </div>
                      <div className="rounded-xl bg-amber-50 p-2 dark:bg-amber-500/10">
                        <p className="text-xs text-muted-foreground">Pendientes</p>
                        <p className="font-bold">{row.stopsPending}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </MobilePage.Root>
  );
}

export default function ReportesIndexPage() {
  const { is } = useBusinessMode();

  return (
    <>
      <MobileSlot name="header:center" priority={10}>
        <h1 className="truncate font-bold text-lg tracking-tight">Reportes</h1>
      </MobileSlot>
      <MobileSlot name="header:right" priority={10}>
        <FileText className="h-5 w-5 text-muted-foreground" />
      </MobileSlot>

      {is.cochera ? <CocheraReportsContent /> : is.agua ? <WaterReportsContent /> : <ReportsMenu />}
    </>
  );
}
