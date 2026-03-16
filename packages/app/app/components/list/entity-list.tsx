import type { ReactNode, ComponentType } from "react";
import { Search, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useListSearch } from "~/hooks/use-list-search";
import type { SearchableField } from "~/lib/search";

export interface EntityListProps<T> {
  /** The items to display */
  items: T[] | undefined;
  /** Fields to search against */
  searchFields: SearchableField<T>[];
  /** Function to render each item */
  renderItem: (item: T) => ReactNode;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** Icon for empty state */
  emptyIcon?: LucideIcon;
  /** Title for empty state */
  emptyTitle?: string;
  /** Description for empty state */
  emptyDescription?: string;
  /** Action button for empty state */
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  /** Loading state */
  isLoading?: boolean;
  /** Loading message */
  loadingMessage?: string;
  /** Error state */
  error?: Error | null;
  /** Error message */
  errorMessage?: string;
  /** Custom empty state content */
  customEmptyState?: ReactNode;
  /** Custom loading state content */
  customLoadingState?: ReactNode;
  /** Custom error state content */
  customErrorState?: ReactNode;
  /** Additional content to render above the list */
  headerContent?: ReactNode;
  /** Additional className for the container */
  className?: string;
  /** Debounce delay for search in milliseconds */
  debounceMs?: number;
}

/**
 * Standardized entity list component with search functionality.
 * Follows the mobile list pattern with consistent search styling.
 *
 * @example
 * <EntityList
 *   items={customers}
 *   searchFields={[(c) => c.name, (c) => c.dni]}
 *   renderItem={(customer) => (
 *     <CustomerCard key={customer.id} customer={customer} />
 *   )}
 *   searchPlaceholder="Buscar cliente..."
 *   emptyIcon={User}
 *   emptyTitle="No hay clientes"
 *   emptyDescription="Crea tu primer cliente para comenzar"
 * />
 */
export function EntityList<T>({
  items,
  searchFields,
  renderItem,
  searchPlaceholder = "Buscar...",
  emptyIcon: EmptyIcon,
  emptyTitle = "No se encontraron resultados",
  emptyDescription,
  emptyAction,
  isLoading = false,
  loadingMessage = "Cargando...",
  error = null,
  errorMessage = "Error al cargar datos",
  customEmptyState,
  customLoadingState,
  customErrorState,
  headerContent,
  className,
  debounceMs = 300,
}: EntityListProps<T>) {
  const {
    filteredItems,
    search,
    setSearch,
    isSearching,
  } = useListSearch({
    items,
    searchFields,
    debounceMs,
  });

  return (
    <div className={className}>
      <div className="space-y-4">
        {headerContent}

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 rounded-[20px] border-stone-200/80 bg-white/75 pl-11 pr-4 shadow-[0_1px_6px_rgba(15,23,42,0.02)] placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-orange-200"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <>
            {customLoadingState || (
              <div className="py-8 text-center">
                {EmptyIcon && (
                  <EmptyIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                )}
                <p className="text-muted-foreground">{loadingMessage}</p>
              </div>
            )}
          </>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <>
            {customErrorState || (
              <div className="py-8 text-center">
                <p className="text-red-500">{errorMessage}</p>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredItems.length === 0 && (
          <>
            {customEmptyState || (
              <div className="py-8 text-center">
                {EmptyIcon && (
                  <EmptyIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                )}
                <p className="text-muted-foreground">
                  {isSearching ? emptyTitle : emptyDescription || emptyTitle}
                </p>
                {emptyAction && (
                  <Button
                    onClick={emptyAction.onClick}
                    className="mt-4 bg-orange-500 hover:bg-orange-600"
                  >
                    {emptyAction.label}
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {/* List */}
        {!isLoading && !error && filteredItems.length > 0 && (
          <div className="space-y-3">
            {filteredItems.map((item, index) => (
              <div key={index}>{renderItem(item)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
