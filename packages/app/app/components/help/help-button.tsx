import { HelpCircle, X, BookOpen, ChevronRight, Menu } from "lucide-react";
import { useState } from "react";
import { useLocation, Link } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TutorialSearch } from "./tutorial-search";
import { useTutorialIndex, useTutorialsForRoute, useReadingProgress } from "~/hooks/use-tutorials";
import { cn } from "~/lib/utils";

interface HelpButtonProps {
  onMenuClick?: () => void;
}

export function HelpButton({ onMenuClick }: HelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Check if we're on a help page (but not the main help index)
  const isInHelpTutorial = currentPath.startsWith('/ayuda/') && currentPath.split('/').length > 2;

  const { data: index } = useTutorialIndex();
  const { data: relevantTutorials } = useTutorialsForRoute(currentPath);
  const { isRead, getReadCount } = useReadingProgress();

  // Get total tutorials count
  const totalTutorials =
    index?.categories.reduce((acc, cat) => acc + cat.tutorials.length, 0) || 0;
  const readCount = getReadCount();
  const progressPercentage =
    totalTutorials > 0 ? Math.round((readCount / totalTutorials) * 100) : 0;

  // Get icon for category
  const getCategoryIcon = (iconName: string) => {
    // For now, return a generic icon
    // In a full implementation, you could map icon names to actual components
    return <BookOpen className="w-4 h-4" />;
  };

  // If we're on a help tutorial page and have onMenuClick, show menu button instead
  if (isInHelpTutorial && onMenuClick) {
    return (
      <Button
        size="icon"
        onClick={onMenuClick}
        className={cn(
          "fixed bottom-20 right-4 z-[60] h-14 w-14 rounded-full",
          "bg-orange-600 hover:bg-orange-700 text-white",
          "transition-all duration-200 hover:scale-105"
        )}
      >
        <Menu className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button
          size="icon"
          className={cn(
            "fixed bottom-20 right-4 z-[60] h-14 w-14 rounded-full",
            "bg-orange-600 hover:bg-orange-700 text-white",
            "transition-all duration-200 hover:scale-105"
          )}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <HelpCircle className="w-6 h-6" />
          )}
        </Button>
      </DrawerTrigger>

      <DrawerContent className="h-[80vh] max-h-[600px] !p-0">
        <DrawerHeader className="border-b border-gray-100 px-4 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <DrawerTitle className="text-lg">Centro de Ayuda</DrawerTitle>
                <p className="text-sm text-gray-500">
                  {readCount} de {totalTutorials} tutoriales leídos ({progressPercentage}%)
                </p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-600 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Search */}
          <div className="mt-4">
            <TutorialSearch
              placeholder="¿Qué necesitas aprender?"
              onSelect={() => setIsOpen(false)}
            />
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1">
          <div className="px-4 py-4 space-y-5 md:space-y-6">
            {/* Relevant tutorials for current page */}
            {relevantTutorials && relevantTutorials.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                  Relevante para esta página
                </h3>
                <div className="space-y-2">
                  {relevantTutorials.slice(0, 3).map(({ tutorial, category }) => (
                    <Link
                      key={tutorial.slug}
                      to={`/ayuda/${category.id}/${tutorial.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                    >
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                        {getCategoryIcon(category.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {tutorial.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {category.title}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* All categories */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2 md:mb-3">
                Todas las categorías
              </h3>
              <div className="grid grid-cols-1 gap-1.5 md:gap-2">
                {index?.categories.map((category) => {
                  const categoryReadCount = category.tutorials.filter((t) =>
                    isRead(t.slug)
                  ).length;
                  const categoryProgress = Math.round(
                    (categoryReadCount / category.tutorials.length) * 100
                  );

                  return (
                    <Link
                      key={category.id}
                      to={`/ayuda`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                        {getCategoryIcon(category.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">
                          {category.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {category.tutorials.length} tutoriales
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-orange-600">
                          {categoryProgress}%
                        </div>
                        <div className="text-xs text-gray-400">
                          {categoryReadCount}/{category.tutorials.length}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Quick links */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2 md:mb-3">
                Enlaces rápidos
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  onClick={() => setIsOpen(false)}
                >
                  <Link to="/ayuda">Ver todos los tutoriales</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  onClick={() => setIsOpen(false)}
                >
                  <Link to="/ayuda/primeros-pasos/bienvenida">
                    Empezar desde cero
                  </Link>
                </Button>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
