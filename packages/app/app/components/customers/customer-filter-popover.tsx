import { useState } from "react";
import { ChevronDown, Filter, Plus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TagBadge, TagSelect } from "~/components/tags";
import { useCustomerGroups } from "~/hooks/use-grupos";
import { useTags } from "~/hooks/use-tags";
import { cn } from "~/lib/utils";

interface CustomerFilterPopoverProps {
  selectedTagIds: string[];
  onTagIdsChange: (tagIds: string[]) => void;
  selectedGroupIds: string[];
  onGroupIdsChange: (groupIds: string[]) => void;
  onCreateClick?: () => void;
}

export function CustomerFilterPopover({
  selectedTagIds,
  onTagIdsChange,
  selectedGroupIds,
  onGroupIdsChange,
  onCreateClick,
}: CustomerFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: tags = [] } = useTags();
  const { data: groups = [] } = useCustomerGroups();

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));
  const selectedGroups = groups.filter((group) => selectedGroupIds.includes(group.id));

  const selectedTagCount = selectedTags.length;
  const selectedGroupCount = selectedGroups.length;
  const totalFilters = selectedTagCount + selectedGroupCount;

  const triggerLabel = (() => {
    if (totalFilters === 0) return "Filtrar";
    if (totalFilters === 1) {
      if (selectedTagCount === 1) return selectedTags[0]?.name ?? "1 etiqueta";
      return selectedGroups[0]?.name ?? "1 grupo";
    }

    const parts: string[] = [];
    if (selectedTagCount > 0) {
      parts.push(selectedTagCount === 1 ? "1 etiqueta" : `${selectedTagCount} etiquetas`);
    }
    if (selectedGroupCount > 0) {
      parts.push(selectedGroupCount === 1 ? "1 grupo" : `${selectedGroupCount} grupos`);
    }
    return parts.join(", ");
  })();

  const toggleGroup = (groupId: string) => {
    if (selectedGroupIds.includes(groupId)) {
      onGroupIdsChange(selectedGroupIds.filter((id) => id !== groupId));
      return;
    }
    onGroupIdsChange([...selectedGroupIds, groupId]);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full min-w-0 justify-between rounded-xl border-stone-200/80 bg-white/75 px-3 text-left shadow-[0_1px_6px_rgba(15,23,42,0.02)] hover:bg-white"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Filter className="h-4 w-4 shrink-0" />
            <span className={cn("truncate text-sm", totalFilters > 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
              {triggerLabel}
            </span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[min(24rem,calc(100vw-2rem))] rounded-2xl border-stone-200/80 p-4" align="end">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Filtros</p>
            {totalFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground"
                onClick={() => {
                  onTagIdsChange([]);
                  onGroupIdsChange([]);
                }}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Limpiar todo
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Etiquetas</p>
              {selectedTagCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-muted-foreground"
                  onClick={() => onTagIdsChange([])}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Limpiar
                </Button>
              )}
            </div>

            <TagSelect selectedTagIds={selectedTagIds} onChange={onTagIdsChange} />

            {selectedTagCount > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-1">
                {selectedTags.map((tag) => (
                  <TagBadge key={tag.id} tag={tag} size="sm" />
                ))}
              </div>
            )}

            {onCreateClick && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                onClick={() => {
                  setIsOpen(false);
                  onCreateClick();
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Crear etiqueta
              </Button>
            )}
          </div>

          <div className="space-y-3 border-t border-stone-100 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Grupos</p>
              {selectedGroupCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-muted-foreground"
                  onClick={() => onGroupIdsChange([])}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Limpiar
                </Button>
              )}
            </div>

            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay grupos creados</p>
              ) : (
                groups.map((group) => {
                  const isSelected = selectedGroupIds.includes(group.id);
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className={cn(
                        "w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                        isSelected
                          ? "border-orange-300 bg-orange-50 text-orange-800"
                          : "border-stone-200/80 bg-white hover:bg-stone-50"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="truncate">{group.name}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
