import { qk } from "@/api/querykeys";
import { useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { UserFilters } from "./users.types";
import { createUser, deleteUser, fetchUsers, updateUser } from "./users.api";
import { GlobalFilters } from "@/types/types";
import { useCallback } from "react";
// import { upload } from "@/api/requests";

export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: qk.users(filters),
    queryFn: () => fetchUsers(filters),

    // keeps previous data during page change
    placeholderData: (prev) => prev,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: (res) => {
      qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "users",
      });

      toast.success(res?.message || 'User has been added successfully');
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    onSuccess: (res) => {
      qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "users",
      });

      toast.success(res?.message || 'User has been updated successfully');
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: deleteUser,

    onSettled: (res) => {
      qc.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "users",
      });

      toast.info(res?.message || 'User has been deleted successfully');
    },
  });
}

export function useUserFilters() {
  const [params, setParams] = useSearchParams();

  const filters: GlobalFilters = {
    page: Number(params.get("page") ?? 1),
    limit: Number(params.get("limit") ?? 10),
    search: params.get("search") ?? "",
  };

  // Memoize updateFilters to prevent infinite loops in useEffect
  const updateFilters = useCallback((next: Partial<GlobalFilters>) => {
    setParams((prev) => {
      const current = Object.fromEntries(prev);
      
      // Convert values to strings and filter out empty values
      const updated = Object.entries({ ...current, ...next }).reduce((acc, [key, value]) => {
        // Convert to string and only include if not empty
        const stringValue = String(value);
        if (stringValue && stringValue !== '' && stringValue !== '0') {
          acc[key] = stringValue;
        }
        return acc;
      }, {} as Record<string, string>);

      return updated;
    });
  }, [setParams]);

  return { filters, updateFilters };
}
