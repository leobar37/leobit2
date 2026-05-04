/**
 * Tag Filter Component
 * Filter customers by tags using a popover
 */
import { useState } from "react";
import { Filter, ChevronDown, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TagSelect } from "./tag-select";
import { TagBadge } from "./tag-badge";
import { useTags } from "~/hooks/use-tags";

interface TagFilterProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  onCreateClick?: () => void;
}

export function TagFilter({ selectedTagIds, onChange, onCreateClick }: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: tags } = useTags();

  const selectedTags = tags?.filter((tag) => selectedTagIds.includes(tag.id));
  const selectedCount = selectedTags?.length ?? 0;

  const triggerContent = (
    <div className="flex min-w-0 items-center gap-2">
      <Filter className="h-4 w-4 shrink-0" />
      {selectedCount > 0 ? (
        <span className="truncate text-sm font-medium text-foreground">
          {selectedCount === 1 ? selectedTags?.[0]?.name : `${selectedCount} etiquetas`}
        </span>
      ) : (
        <span className="truncate text-sm text-muted-foreground">Filtrar</span>
      )}
    </div>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full min-w-0 justify-between rounded-xl border-stone-200/80 bg-white/75 px-3 text-left shadow-[0_1px_6px_rgba(15,23,42,0.02)] hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
        >
          {triggerContent}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] rounded-2xl border-stone-200/80 p-4 dark:border-white/10 dark:bg-[#171922]" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Etiquetas</p>
            {selectedTagIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground"
                onClick={() => onChange([])}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
          <TagSelect selectedTagIds={selectedTagIds} onChange={onChange} />
          {selectedCount > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-1">
              {selectedTags?.map((tag) => (
                <TagBadge key={tag.id} tag={tag} size="sm" />
              ))}
            </div>
          )}
          {onCreateClick && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:text-orange-200 dark:hover:bg-orange-500/[0.12] dark:hover:text-orange-100"
              onClick={() => {
                setIsOpen(false);
                onCreateClick();
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Crear etiqueta
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
