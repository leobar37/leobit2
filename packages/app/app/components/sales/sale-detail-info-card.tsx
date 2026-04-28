import { Calendar, Scale, User } from "lucide-react";
import { formatDeliveryCountdown } from "~/lib/date-utils";
import type { Sale } from "~/hooks/use-sales";
import { cn, formatCurrency } from "~/lib/utils";
import { SaleDetailSection } from "./sale-detail-section";

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

  const rows = [
    {
      icon: Calendar,
      label: "Fecha",
      value: formattedDate,
      accent: "text-muted-foreground",
    },
    ...(sale.type === "pre_order" && sale.deliveryDate
      ? [
          {
            icon: Calendar,
            label: "Fecha de entrega",
            value: formatDeliveryCountdown(sale.deliveryDate),
            accent: "text-indigo-600",
          },
        ]
      : []),
    {
      icon: User,
      label: "Cliente",
      value: sale.customer?.name || "Cliente general",
      accent: "text-foreground",
    },
    ...(!sale.tara || hideTara
      ? []
      : [
          {
            icon: Scale,
            label: "Tara",
            value: `${formatCurrency(sale.tara)} kg`,
            accent: "text-muted-foreground",
          },
        ]),
    ...(sale.netWeight
      ? [
          {
            icon: Scale,
            label: "Peso neto",
            value: `${formatCurrency(sale.netWeight)} kg`,
            accent: "text-orange-700",
          },
        ]
      : []),
  ];

  return (
    <SaleDetailSection
      title="Información general"
      icon={<Calendar className="h-4 w-4" />}
    >
      {rows.map((row, index) => {
        const Icon = row.icon;

        return (
          <div
            key={row.label}
            className={cn(
              "flex items-start gap-3 px-3 py-3.5",
              index > 0 && "border-t shell-divider"
            )}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-muted-foreground">
              <Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
                {row.label}
              </p>
              <p className={cn("mt-1 text-sm font-medium", row.accent)}>
                {row.value}
              </p>
            </div>
          </div>
        );
      })}
    </SaleDetailSection>
  );
}
