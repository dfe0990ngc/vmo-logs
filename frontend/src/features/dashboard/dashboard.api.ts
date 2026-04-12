import { get } from "@/api/requests";
import { DashboardData, DashboardFilters } from "./dashboard.types";

export const fetchDashboardData = (filters: DashboardFilters) => {
  const params = new URLSearchParams(
    Object.entries(filters).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== "") {
        acc[key] = String(val);
      }
      return acc;
    }, {} as Record<string, string>)
  );

  return get<DashboardData>(`/api/dashboard?${params}`);
};

export const fetchWelcomeStats = () => {
  return get<{
    total_ordinances: number;
    total_resolutions: number;
    active_sessions: number;
    active_committees: number;
  }>("/api/welcome-stats");
};