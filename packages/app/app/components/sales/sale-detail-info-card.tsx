import { Calendar, Scale, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Sale } from "~/hooks/use-sales";
import { formatCurrency } from "~/lib/utils";

interface SaleDetailInfoCardProps {
  hideTara: boolean;
  sale: Sale;
}

export function SaleDetailInfoCard({ hideTara, sale }: SaleDetailInfoCardProps) {
  const formattedDate = new Date(sale.saleDate).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Informacion General</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{formattedDate}</span>
        </div>

        <div className="flex items-center gap-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{sale.customer?.name || "Cliente general"}</span>
        </div>

        {sale.tara && !hideTara && (
          <div className="flex items-center gap-3">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <span>Tara: {formatCurrency(sale.tara)} kg</span>
          </div>
        )}

        {sale.netWeight && (
          <div className="flex items-center gap-3">
            <Scale className="h-4 w-4 text-orange-600" />
            <span className="font-medium">Neto: {formatCurrency(sale.netWeight)} kg</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
