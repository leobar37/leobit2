import { Search, X, Clock, BookOpen } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router";
import { useTutorialSearch } from "~/hooks/use-tutorials";
import { cn } from "~/lib/utils";

interface TutorialSearchProps {
  className?: string;
  placeholder?: string;
  onSelect?: () => void;
}

export function TutorialSearch({
  className,
  placeholder = "Buscar tutoriales...",
  onSelect,
}: TutorialSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results, isLoading } = useTutorialSearch(query);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Open dropdown when typing
  useEffect(() => {
    if (query.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [query]);

  const handleSelect = () => {
    setQuery("");
    setIsOpen(false);
    onSelect?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-72 md:max-h-80 overflow-hidden">
          {isLoading ? (
            <div className="p-3 md:p-4 text-center text-gray-500">
              <div className="animate-spin w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full mx-auto mb-2" />
              Buscando...
            </div>
          ) : results && results.length > 0 ? (
            <div className="py-1.5 md:py-2">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase">
                {results.length} resultado{results.length !== 1 ? "s" : ""}
              </div>
              {results.map(({ tutorial, category }) => (
                <Link
                  key={`${category.id}-${tutorial.slug}`}
                  to={`/ayuda/${category.id}/${tutorial.slug}`}
                  onClick={handleSelect}
                  className="flex items-start gap-2.5 md:gap-3 px-3 py-2 md:py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">
                      {tutorial.title}
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-1">
                      {tutorial.description}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                      <span className="text-xs text-orange-600">
                        {category.title}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {tutorial.estimatedReadTime} min
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-3 md:p-4 text-center text-gray-500">
              <Search className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No se encontraron tutoriales</p>
              <p className="text-xs md:text-sm">Intenta con otras palabras</p>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}
