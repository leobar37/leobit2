import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchInterval: 30000,
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});
