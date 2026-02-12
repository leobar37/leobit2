import { ShoppingCart, User, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Sale } from "~/lib/db/schema";

interface SaleCardProps {
  sale: Sale;
  onClick?: () => void;
}

export function SaleCard({ sale, onClick }: SaleCardProps) {
  const formattedDate = new Date(sale.saleDate).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedAmount = Number(sale.totalAmount).toFixed(2);

  return (
    <Card
      className="border-0 shadow-md rounded-2xl cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="h-6 w-6 text-orange-600" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate">
                  Venta #{sale.id.slice(-6)}
                </h3>
                <Badge
                  variant={sale.saleType === "contado" ? "default" : "secondary"}
                  className={
                    sale.saleType === "contado"
                      ? "bg-green-100 text-green-700 hover:bg-green-100"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-100"
                  }
                >
                  {sale.saleType === "contado" ? "Contado" : "Crédito"}
                </Badge>
              </div>

              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formattedDate}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>{sale.clientId || "Cliente general"}</span>
                </div>

                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <DollarSign className="h-3.5 w-3.5 text-orange-600" />
                  <span className="text-orange-600">S/ {formattedAmount}</span>
                </div>
              </div>
            </div>
          </div>

          {sale.saleType === "credito" && Number(sale.balanceDue) > 0 && (
            <Badge variant="destructive" className="shrink-0">
              Debe S/ {Number(sale.balanceDue).toFixed(2)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
