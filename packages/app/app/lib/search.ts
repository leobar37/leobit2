import { useState, useEffect } from "react";

/**
 * Type for a searchable field function
 * Returns a string value from the item to search against
 */
export type SearchableField<T> = (item: T) => string | undefined | null;

/**
 * Options for filtering items by search
 */
export interface SearchOptions<T> {
  /** The search query string */
  search: string;
  /** Array of field extractors to search against */
  fields: SearchableField<T>[];
  /** Whether search should be case-sensitive (default: false) */
  caseSensitive?: boolean;
}

/**
 * Filter an array of items by search string across multiple fields
 * Returns a new array with items that match the search criteria
 *
 * @param items - Array of items to filter
 * @param options - Search options including query and fields to search
 * @returns Filtered array of items
 *
 * @example
 * const customers = [
 *   { id: '1', name: 'Juan', dni: '12345678' },
 *   { id: '2', name: 'Maria', dni: '87654321' }
 * ];
 *
 * const filtered = filterBySearch(customers, {
 *   search: 'juan',
 *   fields: [(c) => c.name, (c) => c.dni]
 * });
 * // Returns [{ id: '1', name: 'Juan', dni: '12345678' }]
 */
export function filterBySearch<T>(items: T[], options: SearchOptions<T>): T[] {
  const { search, fields, caseSensitive = false } = options;

  // Handle empty or whitespace-only search
  if (!search || search.trim() === "") {
    return items;
  }

  const searchTerm = caseSensitive ? search : search.toLowerCase();

  return items.filter((item) => {
    // Check if any of the searchable fields match
    for (const field of fields) {
      const fieldValue = field(item);

      if (fieldValue == null) {
        continue;
      }

      const valueToCompare = caseSensitive
        ? String(fieldValue)
        : String(fieldValue).toLowerCase();

      if (valueToCompare.includes(searchTerm)) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Hook to debounce a value - delays updating the debounced value
 * until after the specified delay has elapsed since the last change
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * const [search, setSearch] = useState("");
 * const debouncedSearch = useDebounce(search);
 *
 * // Use debouncedSearch for expensive operations
 * useEffect(() => {
 *   // This only runs when user stops typing for 300ms
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Predefined field extractors for common entity types
 * Use these for quick field configuration
 */
export const SearchFields = {
  /** Extract id field */
  id: <T extends { id: string }>(item: T) => item.id,

  /** Extract name field */
  name: <T extends { name?: string }>(item: T) => item.name,

  /** Extract dni field */
  dni: <T extends { dni?: string }>(item: T) => item.dni,

  /** Extract phone field */
  phone: <T extends { phone?: string }>(item: T) => item.phone,

  /** Extract email field */
  email: <T extends { email?: string }>(item: T) => item.email,

  /** Extract totalAmount field */
  totalAmount: <T extends { totalAmount?: string | number }>(
    item: T
  ) => {
    if (item.totalAmount == null) return undefined;
    return String(item.totalAmount);
  },

  /** Extract saleType field */
  saleType: <T extends { saleType?: string }>(item: T) => item.saleType,

  /** Extract status field */
  status: <T extends { status?: string }>(item: T) => item.status,
} as const;
