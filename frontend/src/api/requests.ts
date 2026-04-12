import { api } from "./client";
import { normalizeError } from "./errors";

/* ------------------------------------------------------------------ */
/* Abort Error Guard */
/* ------------------------------------------------------------------ */

export function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    error.name === "AbortError"
  );
}

/* ------------------------------------------------------------------ */
/* HTTP Helpers */
/* ------------------------------------------------------------------ */

export async function get<T>(url: string, config?: any): Promise<T> {
  try {
    const { data } = await api.get<T>(url, config);
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function post<T>(
  url: string,
  payload?: unknown,
  config?: any
): Promise<T> {
  try {
    const { data } = await api.post<T>(url, payload, config);
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function put<T>(
  url: string,
  payload?: unknown
): Promise<T> {
  try {
    const { data } = await api.put<T>(url, payload);
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function del<T>(
  url: string
): Promise<T> {
  try {
    const { data } = await api.delete<T>(url);
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function upload<T>(
  url: string,
  fd: FormData,
  onProgress?: (percent: number) => void
): Promise<T> {
  try {
    const { data } = await api.post<T>(url, fd, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress(e) {
        if (!e.total) return;
        onProgress?.(
          Math.round((e.loaded * 100) / e.total)
        );
      },
    });

    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

/**
 * Download a file as blob
 * Returns the blob data for file download
 */
export async function downloadBlob(url: string): Promise<Blob> {
  try {
    const response = await api.get(url, {
      responseType: "blob",
      timeout: 180000,
    });
    return response.data;
  } catch (err) {
    throw normalizeError(err);
  }
}