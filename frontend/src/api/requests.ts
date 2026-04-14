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

/**
 * Upload a file via multipart/form-data.
 *
 * Key differences from a normal post():
 *  - timeout is set to 5 minutes (overrides the global 30s default)
 *  - the auto-AbortController from the request interceptor is skipped
 *    (see client.ts) so a route change / cancelAllRequests() won't kill
 *    the transfer mid-way
 *  - an optional `signal` lets the caller intentionally cancel if needed
 */
export async function upload<T>(
  url: string,
  fd: FormData,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<T> {
  try {
    const { data } = await api.post<T>(url, fd, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      // Override the global 30 s timeout — large files can take minutes
      timeout: 300000, // 5 minutes
      // Use the caller-supplied signal for intentional cancellation only;
      // the interceptor will NOT inject its own controller for uploads
      signal,
      onUploadProgress(e) {
        if (!e.total) return;
        onProgress?.(Math.round((e.loaded * 100) / e.total));
      },
    });

    return data;
  } catch (err) {
    // Let intentional aborts bubble up without normalising
    if (isAbortError(err)) throw err;
    throw normalizeError(err);
  }
}

/**
 * Download a file as a Blob.
 * Returns the blob for the caller to trigger a browser save.
 */
export async function downloadBlob(url: string): Promise<Blob> {
  try {
    const response = await api.get(url, {
      responseType: "blob",
      timeout: 180000, // 3 minutes
    });
    return response.data;
  } catch (err) {
    throw normalizeError(err);
  }
}