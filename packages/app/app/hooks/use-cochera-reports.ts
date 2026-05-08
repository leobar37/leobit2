import { useQuery, useMutation } from "@tanstack/react-query";
import { api, extractData } from "~/lib/api-client";
import { PERSISTED_REMOTE_QUERY_KEYS } from "~/lib/query/persisted-query-keys";
import type { CocheraReportPeriod, CocheraReportResult } from "@avileo/shared";

const COCHERA_REPORTS_KEY = PERSISTED_REMOTE_QUERY_KEYS.cocheraReports;

async function fetchCocheraReport(period: CocheraReportPeriod): Promise<CocheraReportResult> {
  const response = await api.cochera.reports.get({ query: { period } });
  return extractData<CocheraReportResult>(response, "Failed to load report");
}

export function useCocheraReport(period: CocheraReportPeriod) {
  return useQuery({
    queryKey: [...COCHERA_REPORTS_KEY, period],
    queryFn: () => fetchCocheraReport(period),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
}

export function useExportCocheraReport() {
  return useMutation({
    mutationFn: async (period: CocheraReportPeriod) => {
      const response = await api.cochera.reports.export.get({ query: { period } });
      if (response.error) {
        throw new Error(String(response.error.value));
      }
      const blob = new Blob([response.data ?? ""], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-cochera-${period}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}
