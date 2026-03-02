import { useParams, Navigate } from "react-router";
import { useEffect, useState } from "react";
import { TutorialViewer } from "~/components/help/tutorial-viewer";
import { TutorialSidebar } from "~/components/help/tutorial-sidebar";
import { HelpButton } from "~/components/help/help-button";
import {
  useTutorialContent,
  useTutorialIndex,
  useReadingProgress,
} from "~/hooks/use-tutorials";
import { useMobile } from "~/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AyudaTutorialPage() {
  const { module: categoryId, slug } = useParams<{
    module: string;
    slug: string;
  }>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMobile();

  const { data: index, isLoading: isLoadingIndex } = useTutorialIndex();
  const { data: content, isLoading: isLoadingContent } = useTutorialContent(
    categoryId || "",
    slug || ""
  );
  const { progress, isRead, markAsRead, markAsUnread } = useReadingProgress();

  // Mark as read when content loads
  useEffect(() => {
    if (content && slug && !isRead(slug)) {
      // Small delay to ensure user actually viewed the content
      const timer = setTimeout(() => {
        markAsRead(slug);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [content, slug, isRead, markAsRead]);

  if (isLoadingIndex || isLoadingContent) {
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="hidden md:block w-72 border-r border-gray-200 bg-gray-50" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!index) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Error al cargar los tutoriales</p>
      </div>
    );
  }

  if (!content) {
    return <Navigate to="/ayuda" replace />;
  }

  const handleMarkAsRead = () => {
    if (slug) {
      if (isRead(slug)) {
        markAsUnread(slug);
      } else {
        markAsRead(slug);
      }
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Desktop only */}
      <div className="hidden md:block">
        <TutorialSidebar
          index={index}
          readingProgress={progress}
          currentCategory={categoryId}
          currentSlug={slug}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      {isMobile && (
        <TutorialSidebar
          index={index}
          readingProgress={progress}
          currentCategory={categoryId}
          currentSlug={slug}
          isMobile={true}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-white relative">
        <ScrollArea className="h-full">
          <div className="p-4 md:p-6 lg:p-10 pb-24 md:pb-10">
            <TutorialViewer
              content={content}
              isRead={slug ? isRead(slug) : false}
              onMarkAsRead={handleMarkAsRead}
            />
          </div>
        </ScrollArea>

        {/* HelpButton transforms to Menu button on help tutorial pages */}
        <HelpButton onMenuClick={isMobile ? () => setSidebarOpen(true) : undefined} />
      </div>
    </div>
  );
}
