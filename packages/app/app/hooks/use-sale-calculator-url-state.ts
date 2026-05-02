import { useQueryState, parseAsString } from "nuqs";

/**
 * URL state for the sale calculator page.
 * Persisting these in the query string means they survive page reloads
 * and can be shared via links.
 */
export function useSaleCalculatorUrlState() {
  const [productId, setProductId] = useQueryState(
    "productId",
    parseAsString.withDefault(""),
  );
  const [variantId, setVariantId] = useQueryState(
    "variantId",
    parseAsString.withDefault(""),
  );
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [filter, setFilter] = useQueryState(
    "filter",
    parseAsString.withDefault("all"),
  );
  const [itemId, setItemId] = useQueryState(
    "itemId",
    parseAsString.withDefault(""),
  );

  const clearCalculatorState = () => {
    setProductId(null);
    setVariantId(null);
    setSearch(null);
    setFilter(null);
    setItemId(null);
  };

  return {
    productId: productId || null,
    setProductId,
    variantId: variantId || null,
    setVariantId,
    search,
    setSearch,
    filter,
    setFilter,
    itemId: itemId || null,
    setItemId,
    clearCalculatorState,
  } as const;
}
