/**
 * Tag Badge Component
 * Displays a tag with its color
 */
import { X } from "lucide-react";
import type { Tag } from "@avileo/shared";

interface TagBadgeProps {
  tag: Tag | { id: string; name: string; color: string };
  onRemove?: () => void;
  size?: "sm" | "md";
  className?: string;
}

export function TagBadge({ tag, onRemove, size = "md", className = "" }: TagBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-70 transition-opacity"
          type="button"
        >
          <X className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
        </button>
      )}
    </span>
  );
}
