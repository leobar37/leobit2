import { AlertCircle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AccountsReceivableItem } from "~/hooks/use-accounts-receivable";

interface SummaryStatsProps {
  accounts?: AccountsReceivableItem[];
}

export function SummaryStats({ accounts }: SummaryStatsProps) {
  if (!accounts || accounts.length === 0) return null;

  return (
    <Card className="border-0 shadow-md rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-orange-500" />
          Resumen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium">Deudas Altas</p>
              <p className="text-sm text-muted-foreground">Mayor a S/ 500</p>
            </div>
          </div>
          <p className="font-bold text-lg">
            {accounts.filter((a) => a.totalDebt > 500).length} clientes
          </p>
        </div>

        <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium">Deudas Medias</p>
              <p className="text-sm text-muted-foreground">Entre S/ 200 y S/ 500</p>
            </div>
          </div>
          <p className="font-bold text-lg">
            {accounts.filter((a) => a.totalDebt > 200 && a.totalDebt <= 500).length} clientes
          </p>
        </div>

        <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Deudas Bajas</p>
              <p className="text-sm text-muted-foreground">Menor a S/ 200</p>
            </div>
          </div>
          <p className="font-bold text-lg">
            {accounts.filter((a) => a.totalDebt <= 200).length} clientes
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
