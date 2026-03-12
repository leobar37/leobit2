import { X, BookOpen, CheckCircle2 } from "lucide-react";
import { Link } from "react-router";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TutorialSearch } from "~/components/help/tutorial-search";
import { cn } from "~/lib/utils";
import type { ReadingProgress, TutorialCategory, TutorialIndex } from "~/lib/tutorials";

interface TutorialSidebarProps {
  index: TutorialIndex;
  readingProgress: ReadingProgress;
  currentCategory?: string;
  currentSlug?: string;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

function filterCategories(index: TutorialIndex, searchQuery: string) {
  const query = searchQuery.trim().toLowerCase();
  if (!query) {
    return index.categories;
  }

  return index.categories
    .map((category) => ({
      ...category,
      tutorials: category.tutorials.filter(
        (tutorial) =>
          tutorial.title.toLowerCase().includes(query) ||
          tutorial.description.toLowerCase().includes(query) ||
          tutorial.tags.some((tag) => tag.toLowerCase().includes(query))
      ),
    }))
    .filter((category) => {
      return (
        category.title.toLowerCase().includes(query) || category.tutorials.length > 0
      );
    });
}

function SidebarContent({
  categories,
  readingProgress,
  currentCategory,
  currentSlug,
  searchQuery,
  onSearchChange,
  onClose,
}: {
  categories: TutorialCategory[];
  readingProgress: ReadingProgress;
  currentCategory?: string;
  currentSlug?: string;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Tutoriales</p>
            <p className="text-xs text-muted-foreground">
              {categories.reduce((total, category) => total + category.tutorials.length, 0)} disponibles
            </p>
          </div>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <TutorialSearch
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Buscar tutoriales..."
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {categories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-muted-foreground">
              No hay tutoriales que coincidan con tu búsqueda.
            </div>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="space-y-2">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {category.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {category.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {category.tutorials.length}
                  </Badge>
                </div>

                <div className="space-y-1">
                  {category.tutorials.map((tutorial) => {
                    const isActive =
                      currentCategory === category.id && currentSlug === tutorial.slug;
                    const isRead = readingProgress[tutorial.slug]?.read ?? false;

                    return (
                      <Link
                        key={tutorial.slug}
                        to={`/ayuda/${category.id}/${tutorial.slug}`}
                        onClick={onClose}
                        className={cn(
                          "flex items-start gap-3 rounded-xl px-3 py-2 transition-colors",
                          isActive
                            ? "bg-orange-50 text-orange-700"
                            : "hover:bg-gray-50 text-gray-700"
                        )}
                      >
                        <div className="pt-0.5">
                          <CheckCircle2
                            className={cn(
                              "h-4 w-4",
                              isRead ? "text-emerald-600" : "text-gray-300"
                            )}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{tutorial.title}</p>
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {tutorial.description}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function TutorialSidebar({
  index,
  readingProgress,
  currentCategory,
  currentSlug,
  searchQuery = "",
  onSearchChange,
  isMobile = false,
  isOpen = false,
  onClose,
}: TutorialSidebarProps) {
  const categories = filterCategories(index, searchQuery);

  if (isMobile) {
    if (!isOpen) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-50 md:hidden">
        <button
          type="button"
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
          aria-label="Cerrar menú de tutoriales"
        />
        <div className="absolute left-0 top-0 h-full w-[88vw] max-w-sm shadow-xl">
          <SidebarContent
            categories={categories}
            readingProgress={readingProgress}
            currentCategory={currentCategory}
            currentSlug={currentSlug}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  return (
    <aside className="h-full w-72 border-r border-gray-200 bg-white">
      <SidebarContent
        categories={categories}
        readingProgress={readingProgress}
        currentCategory={currentCategory}
        currentSlug={currentSlug}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
      />
    </aside>
  );
}
