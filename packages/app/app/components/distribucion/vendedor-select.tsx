import { useState } from "react";
import { User, X, ChevronDown, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppDrawer } from "~/components/ui/app-drawer";
import { useTeam } from "~/hooks/use-team";
import { useAuth } from "~/hooks/use-auth";
import { useBusiness } from "~/hooks/use-business";
import { cn } from "~/lib/utils";

interface VendedorOption {
  id: string;
  name: string;
  role: string;
  userId?: string;
}

interface VendedorSelectProps {
  value: string | null;
  selectedVendedor?: VendedorOption | null;
  onChange: (vendedor: VendedorOption | null) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  helperText?: string;
  compact?: boolean;
}

export function VendedorSelect({
  value,
  selectedVendedor: propSelectedVendedor,
  onChange,
  disabled = false,
  placeholder = "Seleccionar vendedor",
  required = false,
  helperText,
  compact = false,
}: VendedorSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: team = [], isLoading } = useTeam();
  const { user } = useAuth();
  const { data: business } = useBusiness();

  const currentMemberFallback =
    business?.businessUserId && user
      ? {
          id: business.businessUserId,
          userId: user.id,
          name: user.name || user.email || "Yo",
          role: business.role,
          isActive: business.isActive,
        }
      : null;
  const teamOptions = team.length > 0 ? team : currentMemberFallback ? [currentMemberFallback] : [];
  const vendedores = teamOptions.filter(
    (m) => (m.role === "VENDEDOR" || m.role === "ADMIN_NEGOCIO") && m.isActive
  );

  const currentMemberId =
    team.find((member) => member.userId === user?.id)?.id ??
    currentMemberFallback?.id ??
    null;

  const selectedVendedor =
    propSelectedVendedor || vendedores.find((v) => v.id === value);

  const handleSelectVendedor = (vendedor: VendedorOption) => {
    onChange(vendedor);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClearVendedor = () => {
    onChange(null);
  };

  const filteredVendedores = vendedores.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Card
        data-testid="vendedor-select"
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={cn(
          compact
            ? "cursor-pointer rounded-lg border border-border/70 bg-background/55 transition-colors dark:border-white/[0.08] dark:bg-white/[0.03]"
            : "shell-card cursor-pointer rounded-3xl border-0 transition-colors",
          !disabled && (compact ? "hover:bg-accent/50" : "hover:bg-accent"),
          disabled && "opacity-50 cursor-not-allowed",
        )}
        onClick={() => !disabled && setIsOpen(true)}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <CardContent className={compact ? "p-3" : "p-4"}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "shell-card-muted flex flex-shrink-0 items-center justify-center bg-orange-100/80 dark:bg-orange-500/[0.12]",
                  compact ? "h-9 w-9 rounded-lg" : "h-12 w-12 rounded-2xl",
                )}
              >
                <User className={cn("text-orange-600 dark:text-orange-300", compact ? "h-4 w-4" : "h-6 w-6")} />
              </div>
              <div className="min-w-0">
                <p className={cn("truncate", compact ? "text-sm font-medium" : "font-semibold")}>
                  {selectedVendedor?.name || placeholder}
                </p>
                {selectedVendedor && (
                  <p className={cn("truncate text-muted-foreground", compact ? "text-xs" : "text-sm")}>
                    {selectedVendedor.id === currentMemberId
                      ? selectedVendedor.role === "ADMIN_NEGOCIO"
                        ? "Yo (Admin)"
                        : "Yo (Vendedor)"
                      : selectedVendedor.role === "ADMIN_NEGOCIO"
                        ? "Admin"
                        : "Vendedor"}
                  </p>
                )}
                {!selectedVendedor && required && (
                  <p className={cn("text-orange-600 dark:text-orange-300", compact ? "text-xs" : "text-sm")}>
                    {helperText || "Seleccione un vendedor"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {selectedVendedor && !disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearVendedor();
                  }}
                  className={cn(
                    "text-muted-foreground hover:bg-accent hover:text-destructive",
                    compact ? "h-8 w-8 rounded-md" : "rounded-2xl",
                  )}
                >
                  <X className={compact ? "h-4 w-4" : "h-5 w-5"} />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                disabled={disabled}
                className={cn(
                  "text-muted-foreground hover:bg-accent hover:text-foreground",
                  compact ? "h-8 w-8 rounded-md" : "rounded-2xl",
                  isOpen && "bg-orange-100 text-orange-700",
                )}
              >
                <ChevronDown
                  className={cn(
                    "transition-transform",
                    compact ? "h-4 w-4" : "h-5 w-5",
                    isOpen && "rotate-180",
                  )}
                />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AppDrawer open={isOpen} onOpenChange={setIsOpen} size="large">
        <AppDrawer.Header
          title="Seleccionar vendedor"
          icon={<User className="h-5 w-5" />}
          onClose={() => setIsOpen(false)}
        />

        <AppDrawer.Body className="space-y-3">
          <Input
            placeholder="Buscar vendedor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="shell-search-field px-4"
          />

          <div className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Cargando vendedores...
              </p>
            ) : filteredVendedores.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No se encontraron vendedores
              </p>
            ) : (
              filteredVendedores.map((vendedor) => (
                <button
                  data-testid="vendedor-select-option"
                  key={vendedor.id}
                  type="button"
                  onClick={() =>
                    handleSelectVendedor({
                      id: vendedor.id,
                      name: vendedor.name,
                      role: vendedor.role,
                      userId: vendedor.userId,
                    })
                  }
                  className={cn(
                    "w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                    value === vendedor.id
                      ? "shell-card-muted border-orange-300 bg-orange-50/90 dark:border-orange-500/40 dark:bg-orange-500/20"
                      : "border-border bg-card hover:bg-accent",
                  )}
                >
                  <div className="shell-card-muted flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100/80 dark:bg-orange-500/[0.14]">
                    {vendedor.role === "ADMIN_NEGOCIO" ? (
                      <Crown className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                    ) : (
                      <User className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {vendedor.name}
                      {vendedor.id === currentMemberId && " (Yo)"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {vendedor.role === "ADMIN_NEGOCIO" ? "Admin" : "Vendedor"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </AppDrawer.Body>
      </AppDrawer>
    </>
  );
}

export type { VendedorSelectProps, VendedorOption };
