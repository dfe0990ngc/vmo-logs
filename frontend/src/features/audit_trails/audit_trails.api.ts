import { get } from "@/api/requests";
import { 
  AuditTrail, 
  AuditTrailFilters, 
  AuditTrailStatistics,
  FilterOptions 
} from "./audit_trails.types";
import { PaginatedResponse } from "@/types/types";

export const fetchAuditTrails = (filters: AuditTrailFilters) => {
  const params = new URLSearchParams(
    Object.entries(filters).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== "" && val !== null) {
        acc[key] = String(val);
      }
      return acc;
    }, {} as Record<string, string>)
  );

  return get<PaginatedResponse<AuditTrail>>(`/api/audit-trails?${params}`);
};

export const fetchAuditTrailStatistics = () => 
  get<{ statistics: AuditTrailStatistics }>("/api/audit-trails/statistics");

export const fetchEntityHistory = (entityType: string, entityId: number) =>
  get<{ history: AuditTrail[] }>(`/api/audit-trails/entity/${entityType}/${entityId}`);

export const fetchUserActivity = (userId: number) =>
  get<{ activity: AuditTrail[] }>(`/api/audit-trails/user/${userId}`);

export const fetchFilterOptions = () =>
  get<FilterOptions>("/api/audit-trails/filter-options");

export const fetchAuditTrail = (id: number) =>
  get<{ audit_trail: AuditTrail }>(`/api/audit-trails/${id}`);
