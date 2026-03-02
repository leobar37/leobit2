import { useState } from "react";
import { BookOpen, Clock, CheckCircle, ChevronRight, Menu } from "lucide-react";
import { Link } from "react-router";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { TutorialSearch } from "~/components/help/tutorial-search";
import { TutorialSidebar } from "~/components/help/tutorial-sidebar";
import { useTutorialIndex, useReadingProgress } from "~/hooks/use-tutorials";
import { useMobile } from "~/hooks/use-mobile";
import type { TutorialCategory } from "~/lib/tutorials";

export default function AyudaIndexPage() {
  const { data: index, isLoading, error } = useTutorialIndex();
  const { progress, isRead, getTotalProgress } = useReadingProgress();
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMobile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !index) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <BookOpen className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          No se pudo cargar la ayuda
        </h2>
        <p className="text-gray-500">
          Hubo un error al cargar los tutoriales. Intenta recargar la página.
        </p>
      </div>
    );
  }

  // Calculate overall progress
  const allTutorials = index.categories.flatMap((cat) => cat.tutorials);
  const totalProgress = getTotalProgress(allTutorials);
  const readCount = Object.values(progress).filter((p) => p.read).length;

  // Get icon component for category
  const getCategoryIcon = (iconName: string) => {
    return <BookOpen className="w-6 h-6" />;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Desktop only */}
      <div className="hidden md:block">
        <TutorialSidebar
          index={index}
          readingProgress={progress}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      {isMobile && (
        <TutorialSidebar
          index={index}
          readingProgress={progress}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isMobile={true}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 md:p-6 max-w-5xl">
            {/* Header */}
            <div className="mb-6 md:mb-8">
              <div className="flex items-center gap-3 mb-2">
                {/* Mobile menu button */}
                {isMobile && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSidebarOpen(true)}
                    className="h-9 w-9"
                  >
                    <Menu className="w-4 h-4" />
                  </Button>
                )}
                <h1 className="text-xl md:text-3xl font-bold text-gray-900">
                  Centro de Ayuda
                </h1>
              </div>
              <p className="text-sm md:text-base text-gray-600">
                Aprende a usar Avileo con nuestros tutoriales paso a paso
              </p>

              {/* Overall Progress */}
              <div className="mt-4 flex items-center gap-3 md:gap-4">
                <div className="flex-1 max-w-md">
                  <div className="flex justify-between text-xs md:text-sm mb-1">
                    <span className="text-gray-600">Tu progreso</span>
                    <span className="font-medium text-orange-600">
                      {totalProgress}%
                    </span>
                  </div>
                  <div className="h-1.5 md:h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-600 transition-all duration-500"
                      style={{ width: `${totalProgress}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs md:text-sm text-gray-500 whitespace-nowrap">
                  {readCount}/{allTutorials.length}
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="mb-6 md:mb-8">
              <TutorialSearch
                placeholder="Buscar tutoriales..."
                className="max-w-md"
              />
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {index.categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  isRead={isRead}
                />
              ))}
            </div>

            {/* Getting Started CTA */}
            <div className="mt-6 md:mt-8 p-4 md:p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-1">
                    ¿Eres nuevo en Avileo?
                  </h2>
                  <p className="text-sm text-gray-600">
                    Comienza con nuestro tutorial de bienvenida para aprender lo
                    básico.
                  </p>
                </div>
                <Link
                  to="/ayuda/primeros-pasos/bienvenida"
                  className="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
                >
                  Empezar ahora
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

interface CategoryCardProps {
  category: TutorialCategory;
  isRead: (slug: string) => boolean;
}

function CategoryCard({ category, isRead }: CategoryCardProps) {
  const readCount = category.tutorials.filter((t) => isRead(t.slug)).length;
  const progress = Math.round((readCount / category.tutorials.length) * 100);

  const getCategoryIcon = (iconName: string) => {
    return <BookOpen className="w-4 h-4 md:w-5 md:h-5" />;
  };

  return (
    <Link to={`/ayuda/${category.id}/${category.tutorials[0]?.slug}`}>
      <Card className="h-full hover:shadow-lg transition-all cursor-pointer group border-2 border-transparent hover:border-orange-100">
        <CardHeader className="pb-2 md:pb-3">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              {getCategoryIcon(category.icon)}
            </div>
            <Badge variant="secondary" className="text-xs">
              {category.tutorials.length} tutoriales
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors text-sm md:text-base">
            {category.title}
          </h3>
          <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4 line-clamp-2">
            {category.description}
          </p>

          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-1 md:h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-gray-500">{progress}%</span>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              {readCount} leídos
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {category.tutorials.reduce(
                (acc, t) => acc + t.estimatedReadTime,
                0
              )}{" "}
              min
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
