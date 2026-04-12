import { qk } from "@/api/querykeys";
import {
  createCommunication,
  deleteCommunication,
  fetchCommunication,
  fetchCommunications,
  updateCommunication,
} from "./communications.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CommunicationFilters } from "./communications.types";
import { toast } from "sonner";
import { useCallback, useState } from "react";

export function useCommunications(filters: CommunicationFilters) {
  return useQuery({
    queryKey: qk.communications(filters),
    queryFn: () => fetchCommunications(filters),
    placeholderData: (prev) => prev,
  });
}

export function useCommunication(id: number | null | undefined) {
  return useQuery({
    queryKey: qk.communication(id!),
    queryFn: () => fetchCommunication(id!),
    enabled: !!id && id > 0,
  });
}

export function useCreateCommunication() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createCommunication,
    onSuccess: (res) => {
      qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "communications",
      });
      toast.success(res?.message || "Communication created successfully");
    },
  });
}

export function useUpdateCommunication() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: updateCommunication,
    onSuccess: (res) => {
      qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "communications",
      });
      toast.success(res?.message || "Communication updated successfully");
    },
  });
}

export function useDeleteCommunication() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: deleteCommunication,
    onSettled: (res) => {
      qc.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "communications",
      });

      if (res?.success) {
        toast.info(res?.message || "Communication deleted successfully");
      } else {
        toast.warning(res?.message || "Failed to delete communication");
      }
    },
  });
}

export function useCommunicationFilters() {
  const [filters, setFilters] = useState<CommunicationFilters>({
    page: 1,
    limit: 10,
    search: "",
    communication_type: "",
    status: "",
    date_from: "",
    date_to: "",
  });

  const updateFilters = useCallback((newFilters: Partial<CommunicationFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  return { filters, updateFilters };
}