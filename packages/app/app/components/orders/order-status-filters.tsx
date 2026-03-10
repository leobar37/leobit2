import { useAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { statusFilterAtom, type OrderStatus } from "~/atoms/orders";

const statusFilters: { value: OrderStatus; label: string }[] = [
  { value: null, label: "Todos" },
  { value: "draft", label: "Borradores" },
  { value: "confirmed", label: "Confirmados" },
  { value: "delivered", label: "Entregados" },
  { value: "cancelled", label: "Cancelados" },
];

export function OrderStatusFilters() {
  const [statusFilter, setStatusFilter] = useAtom(statusFilterAtom);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {statusFilters.map((filter) => (
        <Button
          key={filter.label}
          variant={statusFilter === filter.value ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter(filter.value)}
          className={
            statusFilter === filter.value
              ? "bg-orange-500 hover:bg-orange-600"
              : ""
          }
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}
