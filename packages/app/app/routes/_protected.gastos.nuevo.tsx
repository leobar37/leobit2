import { useNavigate, useSearchParams } from "react-router";
import { ExpenseCapture } from "@/components/expenses/expense-capture";
import { useSetLayout } from "~/components/layout/app-layout";
import { toast } from "sonner";

export default function NuevoGastoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const distribucionId = searchParams.get("distribucion") ?? undefined;

  useSetLayout({ title: "Nuevo Gasto", showBackButton: true, backHref: "/gastos" });

  return (
    <div className="pb-8">
      <ExpenseCapture
        variant="inline"
        distribucionId={distribucionId}
        onSuccess={() => {
          toast.success("Gasto registrado exitosamente");
          navigate("/gastos");
        }}
        onCancel={() => navigate("/gastos")}
      />
    </div>
  );
}
