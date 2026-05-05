import { useNavigate, useSearchParams } from "react-router";
import { Receipt } from "lucide-react";
import { ExpenseCapture } from "@/components/expenses/expense-capture";
import { useDistribucion } from "~/hooks/use-distribuciones";
import { useSetLayout } from "~/components/layout/app-layout";
import { toast } from "sonner";

export default function NuevoGastoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const distribucionId = searchParams.get("distribucion") ?? undefined;
  const returnTo = distribucionId ? "/mi-distribucion" : "/gastos";
  const { data: distribucion } = useDistribucion(distribucionId ?? null);

  useSetLayout({ title: "Nuevo Gasto", showBackButton: true, backHref: returnTo });

  return (
    <div className="space-y-4 pb-8">
      {distribucionId && (
        <div className="shell-card-soft flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <Receipt className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Gasto asociado a distribución
            </p>
            <p className="truncate text-sm font-semibold">
              {distribucion?.puntoVenta ?? "Distribución activa"}
            </p>
          </div>
        </div>
      )}

      <ExpenseCapture
        variant="inline"
        distribucionId={distribucionId}
        onSuccess={() => {
          toast.success("Gasto registrado exitosamente");
          navigate(returnTo);
        }}
        onCancel={() => navigate(returnTo)}
      />
    </div>
  );
}
