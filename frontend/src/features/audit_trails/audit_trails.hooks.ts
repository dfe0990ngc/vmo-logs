import { qk } from "@/api/querykeys";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { 
  fetchAuditTrails, 
  fetchAuditTrailStatistics,
  fetchEntityHistory,
  fetchUserActivity,
  fetchFilterOptions,
  fetchAuditTrail
} from "./audit_trails.api";
import { AuditTrailFilters } from "./audit_trails.types";

export function useAuditTrails(filters: AuditTrailFilters) {
  return useQuery({
    queryKey: qk.audit_trails(filters),
    queryFn: () => fetchAuditTrails(filters),
    placeholderData: (prev) => prev,
  });
}

export function useAuditTrailStatistics() {
  return useQuery({
    queryKey: ["audit-trail-statistics"],
    queryFn: fetchAuditTrailStatistics,
    staleTime: 30000, // Cache for 30 seconds
  });
}

export function useEntityHistory(entityType: string, entityId: number) {
  return useQuery({
    queryKey: ["entity-history", entityType, entityId],
    queryFn: () => fetchEntityHistory(entityType, entityId),
    enabled: !!entityType && !!entityId,
  });
}

export function useUserActivity(userId: number) {
  return useQuery({
    queryKey: ["user-activity", userId],
    queryFn: () => fetchUserActivity(userId),
    enabled: !!userId,
  });
}

export function useFilterOptions() {
  return useQuery({
    queryKey: ["audit-trail-filter-options"],
    queryFn: fetchFilterOptions,
    staleTime: 300000, // Cache for 5 minutes
  });
}

export function useAuditTrail(id: number) {
  return useQuery({
    queryKey: ["audit-trail", id],
    queryFn: () => fetchAuditTrail(id),
    enabled: !!id,
  });
}

export function useAuditTrailFilters() {
  const [filters, setFilters] = useState<AuditTrailFilters>({
    page: 1,
    limit: 10,
    search: "",
    action: "all",
    entity_type: "all",
    user_id: "",
    start_date: "",
    end_date: "",
  });

  const updateFilters = useCallback((newFilters: Partial<AuditTrailFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  return { filters, updateFilters };
}
