import { useState } from "react";
import { Users, X, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppDrawer } from "~/components/ui/app-drawer";
import { useCustomerGroups, type CustomerGroup } from "~/hooks/use-grupos";
import { cn } from "~/lib/utils";

interface GroupSelectProps {
  value: string | null;
  values?: string[];
  selectedGroup?: CustomerGroup | null;
  selectedGroups?: CustomerGroup[];
  onChange: (group: CustomerGroup | null) => void;
  onMultiChange?: (groups: CustomerGroup[]) => void;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  multi?: boolean;
}

export function GroupSelect({
  value,
  values,
  selectedGroup: propSelectedGroup,
  selectedGroups: propSelectedGroups,
  onChange,
  onMultiChange,
  disabled = false,
  placeholder = "Seleccionar grupo (opcional)",
  helperText,
  multi = false,
}: GroupSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: groups = [], isLoading } = useCustomerGroups();

  const selectedGroup = propSelectedGroup || groups.find((g) => g.id === value);
  const selectedGroups =
    propSelectedGroups ??
    (values ? groups.filter((g) => values.includes(g.id)) : []);

  const handleSelectGroup = (group: CustomerGroup) => {
    if (multi && onMultiChange) {
      const isSelected = selectedGroups.some((g) => g.id === group.id);
      if (isSelected) {
        onMultiChange(selectedGroups.filter((g) => g.id !== group.id));
      } else {
        onMultiChange([...selectedGroups, group]);
      }
    } else {
      onChange(group);
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  const handleClearGroup = () => {
    onChange(null);
  };

  const handleRemoveGroup = (groupId: string) => {
    if (multi && onMultiChange) {
      onMultiChange(selectedGroups.filter((g) => g.id !== groupId));
    }
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Card
        className={cn(
          "shell-card cursor-pointer rounded-3xl border-0 transition-colors",
          !disabled && "hover:bg-accent",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shell-card-muted flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-100/80">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                {multi && selectedGroups.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {selectedGroups.map((g) => (
                      <span
                        key={g.id}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                      >
                        {g.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveGroup(g.id);
                          }}
                          className="rounded-full hover:bg-blue-200 dark:hover:bg-blue-500/30"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="truncate font-semibold">
                      {selectedGroup?.name || placeholder}
                    </p>
                    {selectedGroup && (
                      <p className="text-sm text-muted-foreground truncate">
                        {selectedGroup.memberCount ?? 0} clientes
                      </p>
                    )}
                  </>
                )}
                {!selectedGroup && selectedGroups.length === 0 && helperText && (
                  <p className="text-sm text-muted-foreground">
                    {helperText}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {!multi && selectedGroup && !disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearGroup();
                  }}
                  className="rounded-2xl text-muted-foreground hover:bg-accent hover:text-destructive"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                disabled={disabled}
                className={cn(
                  "rounded-2xl text-muted-foreground hover:bg-accent hover:text-foreground",
                  isOpen && "bg-blue-100 text-blue-700",
                )}
              >
                <ChevronDown
                  className={cn(
                    "h-5 w-5 transition-transform",
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
          title="Seleccionar grupo de clientes"
          icon={<Users className="h-5 w-5" />}
          onClose={() => setIsOpen(false)}
        />

        <AppDrawer.Body className="space-y-3">
          <Input
            placeholder="Buscar grupo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="shell-search-field px-4"
          />

          <div className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Cargando grupos...
              </p>
            ) : filteredGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {searchQuery
                  ? "No se encontraron grupos"
                  : "No hay grupos creados. Crea uno en /grupos"}
              </p>
            ) : (
              filteredGroups.map((group) => {
                const isSelected = multi
                  ? selectedGroups.some((g) => g.id === group.id)
                  : value === group.id;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleSelectGroup(group)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                      isSelected
                        ? "shell-card-muted border-blue-300 bg-blue-50/90 dark:border-blue-400/30 dark:bg-blue-500/12"
                        : "border-border bg-card hover:bg-accent",
                    )}
                  >
                    <div className="shell-card-muted flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100/80 dark:bg-blue-500/14">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{group.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {group.memberCount ?? 0} clientes
                      </p>
                    </div>
                    {isSelected && multi && (
                      <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </AppDrawer.Body>
      </AppDrawer>
    </>
  );
}

export type { GroupSelectProps };
