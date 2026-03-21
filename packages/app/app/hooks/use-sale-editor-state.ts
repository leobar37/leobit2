import { useQueryState, parseAsString } from "nuqs";

export function useSaleEditorState() {
  const [editingItemId, setEditingItemId] = useQueryState(
    "itemId",
    parseAsString.withDefault("")
  );

  return {
    editingItemId: editingItemId || null,
    setEditingItemId,
    clearEditingItem: () => setEditingItemId(null),
  } as const;
}