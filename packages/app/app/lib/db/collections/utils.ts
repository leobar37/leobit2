export function createShapeOptions(table: string) {
  return {
    url: import.meta.env.VITE_ELECTRIC_URL || "",
    params: {
      table,
      source_id: import.meta.env.VITE_ELECTRIC_SOURCE_ID || "",
    },
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_ELECTRIC_TOKEN || ""}`,
    },
  };
}
