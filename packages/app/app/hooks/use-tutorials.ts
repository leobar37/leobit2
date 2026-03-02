import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import type {
  TutorialIndex,
  TutorialCategory,
  Tutorial,
  TutorialContent,
  ReadingProgress,
} from "~/lib/tutorials";
import {
  loadTutorialIndex,
  loadTutorialContent,
  getAllTutorials,
  getTutorialsByRole,
  searchTutorials,
  getTutorialsForRoute,
} from "~/lib/tutorials";

const PROGRESS_STORAGE_KEY = "avileo:tutorial-progress";

/**
 * Hook to load the tutorial index
 */
export function useTutorialIndex() {
  return useQuery<TutorialIndex, Error>({
    queryKey: ["tutorials", "index"],
    queryFn: loadTutorialIndex,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to load a specific tutorial's content
 */
export function useTutorialContent(categoryId: string, slug: string) {
  return useQuery<TutorialContent | null, Error>({
    queryKey: ["tutorials", "content", categoryId, slug],
    queryFn: () => loadTutorialContent(categoryId, slug),
    staleTime: 1000 * 60 * 5,
    enabled: !!categoryId && !!slug,
  });
}

/**
 * Hook to get all tutorials
 */
export function useAllTutorials() {
  return useQuery<Array<{ tutorial: Tutorial; category: TutorialCategory }>, Error>({
    queryKey: ["tutorials", "all"],
    queryFn: getAllTutorials,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to get tutorials filtered by role
 */
export function useTutorialsByRole(role: "admin" | "vendedor") {
  return useQuery<Array<{ tutorial: Tutorial; category: TutorialCategory }>, Error>({
    queryKey: ["tutorials", "by-role", role],
    queryFn: () => getTutorialsByRole(role),
    staleTime: 1000 * 60 * 5,
    enabled: !!role,
  });
}

/**
 * Hook to search tutorials
 */
export function useTutorialSearch(query: string) {
  return useQuery<Array<{ tutorial: Tutorial; category: TutorialCategory }>, Error>({
    queryKey: ["tutorials", "search", query],
    queryFn: () => searchTutorials(query),
    staleTime: 1000 * 60 * 1,
    enabled: query.length >= 2,
  });
}

/**
 * Hook to get tutorials relevant to current route
 */
export function useTutorialsForRoute(routePath: string) {
  return useQuery<Array<{ tutorial: Tutorial; category: TutorialCategory }>, Error>({
    queryKey: ["tutorials", "for-route", routePath],
    queryFn: () => getTutorialsForRoute(routePath),
    staleTime: 1000 * 60 * 5,
    enabled: !!routePath,
  });
}

/**
 * Hook to manage reading progress
 */
export function useReadingProgress() {
  const [progress, setProgressState] = useState<ReadingProgress>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load progress from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (stored) {
      try {
        setProgressState(JSON.parse(stored));
      } catch {
        // Invalid JSON, ignore
      }
    }
    setIsLoaded(true);
  }, []);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    }
  }, [progress, isLoaded]);

  const markAsRead = useCallback((tutorialSlug: string) => {
    setProgressState((prev) => ({
      ...prev,
      [tutorialSlug]: {
        read: true,
        lastReadAt: new Date().toISOString(),
        progress: 100,
      },
    }));
  }, []);

  const markAsUnread = useCallback((tutorialSlug: string) => {
    setProgressState((prev) => ({
      ...prev,
      [tutorialSlug]: {
        read: false,
        progress: 0,
      },
    }));
  }, []);

  const isRead = useCallback(
    (tutorialSlug: string) => {
      return progress[tutorialSlug]?.read ?? false;
    },
    [progress]
  );

  const getProgress = useCallback(
    (tutorialSlug: string) => {
      return progress[tutorialSlug]?.progress ?? 0;
    },
    [progress]
  );

  const getReadCount = useCallback(() => {
    return Object.values(progress).filter((p) => p.read).length;
  }, [progress]);

  const getTotalProgress = useCallback(
    (tutorials: Tutorial[]) => {
      if (tutorials.length === 0) return 0;
      const readCount = tutorials.filter((t) => progress[t.slug]?.read).length;
      return Math.round((readCount / tutorials.length) * 100);
    },
    [progress]
  );

  return {
    progress,
    isLoaded,
    markAsRead,
    markAsUnread,
    isRead,
    getProgress,
    getReadCount,
    getTotalProgress,
  };
}

/**
 * Hook to invalidate tutorial queries
 */
export function useInvalidateTutorials() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["tutorials"] });
  }, [queryClient]);
}
