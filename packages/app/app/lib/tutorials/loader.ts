import type { TutorialIndex, TutorialCategory, Tutorial, TutorialContent } from "./types";

const TUTORIALS_BASE_PATH = "/tutorials";

/**
 * Load the tutorial index (index.json)
 */
export async function loadTutorialIndex(): Promise<TutorialIndex> {
  const response = await fetch(`${TUTORIALS_BASE_PATH}/index.json`);
  if (!response.ok) {
    throw new Error(`Failed to load tutorial index: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Load a specific tutorial's markdown content
 */
export async function loadTutorialContent(
  categoryId: string,
  slug: string
): Promise<TutorialContent | null> {
  const index = await loadTutorialIndex();

  // Find category
  const category = index.categories.find((c) => c.id === categoryId);
  if (!category) return null;

  // Find tutorial
  const tutorial = category.tutorials.find((t) => t.slug === slug);
  if (!tutorial) return null;

  // Load markdown content
  const content = await loadMarkdownFile(tutorial.file);

  return {
    slug,
    title: tutorial.title,
    content,
    category,
    tutorial,
  };
}

/**
 * Load markdown file content
 */
async function loadMarkdownFile(filePath: string): Promise<string> {
  const response = await fetch(`${TUTORIALS_BASE_PATH}/${filePath}`);
  if (!response.ok) {
    throw new Error(`Failed to load tutorial content: ${response.statusText}`);
  }
  return response.text();
}

/**
 * Get all tutorials flattened with category info
 */
export async function getAllTutorials(): Promise<
  Array<{ tutorial: Tutorial; category: TutorialCategory }>
> {
  const index = await loadTutorialIndex();
  const result: Array<{ tutorial: Tutorial; category: TutorialCategory }> = [];

  for (const category of index.categories) {
    for (const tutorial of category.tutorials) {
      result.push({
        tutorial: { ...tutorial, categoryId: category.id },
        category,
      });
    }
  }

  return result;
}

/**
 * Get tutorials for a specific role
 */
export async function getTutorialsByRole(
  role: "admin" | "vendedor"
): Promise<Array<{ tutorial: Tutorial; category: TutorialCategory }>> {
  const allTutorials = await getAllTutorials();
  return allTutorials.filter(({ tutorial }) => tutorial.roles.includes(role));
}

/**
 * Search tutorials by query string
 */
export async function searchTutorials(
  query: string
): Promise<Array<{ tutorial: Tutorial; category: TutorialCategory }>> {
  const allTutorials = await getAllTutorials();
  const lowerQuery = query.toLowerCase();

  return allTutorials.filter(
    ({ tutorial }) =>
      tutorial.title.toLowerCase().includes(lowerQuery) ||
      tutorial.description.toLowerCase().includes(lowerQuery) ||
      tutorial.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get tutorials relevant to a specific route/page
 */
export async function getTutorialsForRoute(
  routePath: string
): Promise<Array<{ tutorial: Tutorial; category: TutorialCategory }>> {
  const allTutorials = await getAllTutorials();

  // Map routes to relevant tutorial categories
  const routeMapping: Record<string, string[]> = {
    "/ventas": ["ventas"],
    "/clientes": ["clientes"],
    "/cobros": ["cobros"],
    "/pedidos": ["pedidos"],
    "/productos": ["productos"],
    "/distribuciones": ["distribuciones"],
    "/mi-distribucion": ["distribuciones"],
    "/cierre": ["cierre"],
    "/config": ["configuracion"],
  };

  const relevantCategories = routeMapping[routePath] || [];

  return allTutorials.filter(({ category }) =>
    relevantCategories.includes(category.id)
  );
}
