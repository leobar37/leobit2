/**
 * Types for the tutorial/help system
 */

export type UserRole = "admin" | "vendedor";

export interface Tutorial {
  slug: string;
  title: string;
  description: string;
  file: string;
  tags: string[];
  roles: UserRole[];
  estimatedReadTime: number;
  categoryId?: string;
}

export interface TutorialCategory {
  id: string;
  title: string;
  icon: string;
  order: number;
  description: string;
  tutorials: Tutorial[];
}

export interface TutorialIndex {
  version: string;
  lastUpdated: string;
  categories: TutorialCategory[];
}

export interface TutorialContent {
  slug: string;
  title: string;
  content: string;
  category: TutorialCategory;
  tutorial: Tutorial;
}

export interface ReadingProgress {
  [tutorialSlug: string]: {
    read: boolean;
    lastReadAt?: string;
    progress?: number;
  };
}

export interface TutorialSearchResult {
  tutorial: Tutorial;
  category: TutorialCategory;
  matches: {
    title: boolean;
    description: boolean;
    content: boolean;
  };
}
