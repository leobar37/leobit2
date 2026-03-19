import { CircleHelp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import type { ReactNode } from "react";

interface FieldInfoProps {
  label: string;
  description: string;
  children?: ReactNode;
}

export function FieldInfo({ label, description, children }: FieldInfoProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">{label}</label>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-help"
              aria-label={`Información sobre ${label}`}
            >
              <CircleHelp className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            className="text-sm text-muted-foreground max-w-xs"
            align="start"
          >
            <p>{description}</p>
          </PopoverContent>
        </Popover>
      </div>
      {children}
    </div>
  );
}
