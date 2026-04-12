import { AxiosError } from "axios";
import { ApiError } from "./types";

export function normalizeError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    return {
      message:
        error.response?.data?.message ||
        error.message ||
        "Network error",
      status: error.response?.status,
      errors: error.response?.data?.errors,
    };
  }

  return {
    message: "Unknown error",
  };
}
