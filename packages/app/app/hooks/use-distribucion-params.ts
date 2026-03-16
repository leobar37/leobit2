import { useCallback } from "react";
import { useNavigate } from "react-router";

/**
 * Hook to manage distribucion navigation
 * Provides consistent navigation methods for distribucion routes
 */
export function useDistribucionParams() {
  const navigate = useNavigate();

  const navigateToCreate = useCallback(
    (options?: { fecha?: string }) => {
      console.log("[useDistribucionParams] navigateToCreate called, options:", options);
      const params = new URLSearchParams();
      if (options?.fecha) {
        params.set("fecha", options.fecha);
      }
      const queryString = params.toString();
      const path = `/distribuciones/nueva${queryString ? `?${queryString}` : ""}`;
      console.log("[useDistribucionParams] Navigating to:", path);
      navigate(path);
      console.log("[useDistribucionParams] navigate called");
    },
    [navigate]
  );

  const navigateToEdit = useCallback(
    (id: string) => {
      navigate(`/distribuciones/${id}/editar`);
    },
    [navigate]
  );

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return {
    navigateToCreate,
    navigateToEdit,
    goBack,
  };
}
