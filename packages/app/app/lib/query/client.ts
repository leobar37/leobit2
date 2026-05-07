import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
      gcTime: 1000 * 60 * 60 * 4, // 4 hours instead of 24h to prevent memory bloat
    },
  },
});
