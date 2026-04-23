import { CheckCircle2, CloudDownload, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyncDevTools } from "@avileo/drizzle-sync/react/devtools";
import { useNavigate } from "react-router";

export default function SyncPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center bg-gradient-to-b from-orange-50/50 to-white px-4 py-6">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-500 shadow-[0_8px_30px_rgba(249,115,22,0.3)]">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Sincronización automática
          </h1>
          <p className="text-sm text-muted-foreground">
            Los datos se sincronizan automáticamente al iniciar la aplicación.
            No es necesario hacer nada manualmente.
          </p>
        </div>

        {/* Action */}
        <Button
          onClick={() => navigate("/dashboard")}
          className="h-12 w-full rounded-2xl bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
        >
          Ir al dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      <SyncDevTools enabled={import.meta.env.DEV} />
    </div>
  );
}
