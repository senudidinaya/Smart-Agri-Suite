import { useQuery } from "@tanstack/react-query";
import { getAnalytics } from "./analyticsRepository.mock";
export function useAnalyticsQuery() {
  return useQuery({ queryKey: ["analytics"], queryFn: getAnalytics, staleTime: 1000 * 60 * 5 });
}
