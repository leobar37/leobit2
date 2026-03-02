import { Link, useLocation } from "react-router";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Circle,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "~/lib/utils";
import type { TutorialIndex, TutorialCategory, Tutorial } from "~/lib/tutorials";

interface TutorialSidebarProps {
  index: TutorialIndex;
  readingProgress: { [slug: string]: { read: boolean } };
  currentCategory?: string;
  currentSlug?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function TutorialSidebar({
  index,
  readingProgress,
  currentCategory,
  currentSlug,
  searchQuery,
  onSearchChange,
  isMobile,
  isOpen,
  onClose,
}: TutorialSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(currentCategory ? [currentCategory] : [])
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const getCategoryProgress = (category: TutorialCategory) => {
    const readCount = category.tutorials.filter(
      (t) => readingProgress[t.slug]?.read
    ).length;
    return {
      read: readCount,
      total: category.tutorials.length,
      percentage: Math.round((readCount / category.tutorials.length) * 100),
    };
  };

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <Link to="/ayuda" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-orange-600" />
            </div>
            <span className="font-semibold text-gray-900 text-sm md:text-base">
              Centro de Ayuda
            </span>
          </Link>
          {isMobile && onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {onSearchChange && (
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar tutoriales..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        )}
      </div>

      {/* Categories */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {index.categories.map((category) => {
            const progress = getCategoryProgress(category);
            const isExpanded = expandedCategories.has(category.id);
            const isActive = currentCategory === category.id;

            return (
              <div key={category.id} className="mb-1">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2.5 md:py-2 rounded-lg text-left transition-colors",
                    isActive
                      ? "bg-orange-100 text-orange-900"
                      : "hover:bg-gray-100 text-gray-700"
                  )}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="flex-1 font-medium text-sm">
                    {category.title}
                  </span>
                  <span className="text-xs text-gray-500">
                    {progress.read}/{progress.total}
                  </span>
                </button>

                {/* Tutorials List */}
                {isExpanded && (
                  <div className="ml-3 md:ml-4 mt-1 space-y-0.5">
                    {category.tutorials.map((tutorial) => {
                      const isTutorialActive =
                        currentCategory === category.id &&
                        currentSlug === tutorial.slug;
                      const isRead = readingProgress[tutorial.slug]?.read;

                      return (
                        <Link
                          key={tutorial.slug}
                          to={`/ayuda/${category.id}/${tutorial.slug}`}
                          onClick={isMobile ? onClose : undefined}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2.5 md:py-2 rounded-lg text-sm transition-colors",
                            isTutorialActive
                              ? "bg-orange-600 text-white"
                              : "hover:bg-gray-100 text-gray-600"
                          )}
                        >
                          {isRead ? (
                            <CheckCircle
                              className={cn(
                                "w-4 h-4 flex-shrink-0",
                                isTutorialActive
                                  ? "text-white"
                                  : "text-green-500"
                              )}
                            />
                          ) : (
                            <Circle
                              className={cn(
                                "w-4 h-4 flex-shrink-0",
                                isTutorialActive
                                  ? "text-white"
                                  : "text-gray-300"
                              )}
                            />
                          )}
                          <span className="truncate">{tutorial.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 md:p-4 border-t border-gray-200 bg-white">
        <div className="text-xs text-gray-500 text-center">
          Versión {index.version} · Actualizado {index.lastUpdated}
        </div>
      </div>
    </>
  );

  // Mobile version in Drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
        <DrawerContent className="h-[85vh]">
          <div className="flex flex-col h-full">
            <SidebarContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop version
  return (
    <div className="w-72 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
      <SidebarContent />
    </div>
  );
}
