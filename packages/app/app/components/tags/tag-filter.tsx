/**
 * Tag Filter Component
 * Filter customers by tags using a popover
 */
import { useState } from "react";
import { Filter, ChevronDown, X } from "lucide-react";
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
}

export function TagFilter({ selectedTagIds, onChange }: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: tags } = useTags();

  const selectedTags = tags?.filter((tag) => selectedTagIds.includes(tag.id));

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between rounded-xl">
          <div className="flex items-center gap-2 overflow-hidden">
            <Filter className="h-4 w-4 shrink-0" />
            {selectedTags && selectedTags.length > 0 ? (
              <div className="flex items-center gap-1 overflow-hidden">
                {selectedTags.slice(0, 2).map((tag) => (
                  <TagBadge key={tag.id} tag={tag} size="sm" />
                ))}
                {selectedTags.length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{selectedTags.length - 2}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">Filtrar por etiquetas</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
