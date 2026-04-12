import {
  QueryClient,
  MutationCache,
  QueryCache,
} from "@tanstack/react-query";

import { normalizeError } from "./errors";
import { toast } from "sonner";

export const queryClient = new QueryClient({

  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },

    mutations: {
      retry: 0,
    },
  },

  queryCache: new QueryCache({
    onError: (error) => {
      const err = normalizeError(error);
      console.error("Query Error:", err.message);
    },
  }),

  mutationCache: new MutationCache({
    onError: (error) => {

      const msg = error.response?.data?.message || error.message || "Unknown error";
      
      // Plug your toast here
      toast.error(msg);
    },
  }),
});
