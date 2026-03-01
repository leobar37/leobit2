import { DatePicker } from "@/components/ui/date-picker";
import { toDateString, addDays } from "~/lib/date-utils";

interface OrderDeliveryDateProps {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
}

export function OrderDeliveryDate({
  value,
  onChange,
  minDate,
}: OrderDeliveryDateProps) {
  // Default min date is tomorrow
  const computedMinDate = minDate ?? toDateString(addDays(new Date(), 1));

  return (
    <div className="space-y-2">
      <DatePicker
        value={value}
        onChange={onChange}
        minDate={computedMinDate}
        label="Fecha de entrega"
        placeholder="Seleccionar fecha de entrega"
      />
      <p className="text-xs text-muted-foreground px-1">
        La fecha de entrega debe ser desde mañana
      </p>
    </div>
  );
}
