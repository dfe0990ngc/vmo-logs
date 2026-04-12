import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import { tokenStore } from "./tokens";
import { AuthTokens } from "./types";

/* ------------------------------------------------------------------ */
/* Refresh Token State */
/* ------------------------------------------------------------------ */

let isRefreshing = false;
let queue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

/* ------------------------------------------------------------------ */
/* Abort Controller Registry */
/* ------------------------------------------------------------------ */

const controllers = new Set<AbortController>();

export function createAbortController() {
  const controller = new AbortController();
  controllers.add(controller);
  return controller;
}

export function cancelAllRequests() {
  controllers.forEach(c => c.abort());
  controllers.clear();
}

/* ------------------------------------------------------------------ */
/* Axios Instance */
/* ------------------------------------------------------------------ */


export const API_FOLDER = import.meta.env.VITE_API_FOLDER || '';

export const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL ||
  `${window.location.origin}/smart-sb`) + API_FOLDER;

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

/* ------------------------------------------------------------------ */
/* Refresh Queue Helpers */
/* ------------------------------------------------------------------ */

function flushQueue(token: string) {
  queue.forEach(({ resolve }) => resolve(token));
  queue = [];
}

function rejectQueue(err: unknown) {
  queue.forEach(({ reject }) => reject(err));
  queue = [];
}

async function refreshToken(): Promise<string> {
  const refresh = tokenStore.refresh();

  if (!refresh) {
    tokenStore.clear();
    throw new Error("No refresh token");
  }

  try {
    const { data } = await axios.post<AuthTokens>(
      `${BASE_URL}/api/auth/refresh`,
      { refresh_token: refresh }
    );

    tokenStore.set(data);
    return data.access_token;
  } catch (err) {
    tokenStore.clear();
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Request Interceptor */
/* ------------------------------------------------------------------ */

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Attach AbortController if missing
    if (!config.signal) {
      const controller = createAbortController();
      config.signal = controller.signal;
    }

    if (config.headers.Authorization) return config;

    let token = tokenStore.access();

    if (token && tokenStore.isExpired()) {
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          token = await refreshToken();
          flushQueue(token);
        } catch (err) {
          rejectQueue(err);
          throw err;
        } finally {
          isRefreshing = false;
          queue = [];
        }
      } else {
        token = await new Promise<string>((resolve, reject) =>
          queue.push({ resolve, reject })
        );
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  }
);

/* ------------------------------------------------------------------ */
/* Cleanup Controllers */
/* ------------------------------------------------------------------ */

api.interceptors.response.use(
  res => {
    if (res.config.signal) {
      controllers.forEach(c => {
        if (c.signal === res.config.signal) {
          controllers.delete(c);
        }
      });
    }
    return res;
  },
  err => {
    if (err?.config?.signal) {
      controllers.forEach(c => {
        if (c.signal === err.config.signal) {
          controllers.delete(c);
        }
      });
    }
    return Promise.reject(err);
  }
);