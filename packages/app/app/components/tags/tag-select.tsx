/**
 * Tag Select Component
 * Multi-select component for tags with visual feedback
 */
import { Check } from "lucide-react";
import { useTags } from "~/hooks/use-tags";

interface TagSelectProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  className?: string;
}

export function TagSelect({ selectedTagIds, onChange, className = "" }: TagSelectProps) {
  const { data: tags, isLoading } = useTags();

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        <span className="text-sm text-muted-foreground">Cargando etiquetas...</span>
      </div>
    );
  }

  if (!tags || tags.length === 0) {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        <span className="text-sm text-muted-foreground">No hay etiquetas creadas</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => {
        const isSelected = selectedTagIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              isSelected
                ? "ring-2 ring-offset-1"
                : "opacity-60 hover:opacity-80"
            }`}
            style={{
              backgroundColor: `${tag.color}20`,
              color: tag.color,
              "--tw-ring-color": tag.color,
            } as React.CSSProperties}
          >
            {isSelected && <Check className="h-3.5 w-3.5" />}
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
