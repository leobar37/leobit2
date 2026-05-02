import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "~/lib/utils";

interface TutorialSearchProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TutorialSearch({
  value = "",
  onChange,
  placeholder = "Buscar...",
  className,
}: TutorialSearchProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="shell-search-field pl-9 pr-4"
      />
    </div>
  );
}
