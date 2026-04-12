import { AuthTokens } from "./types";

export const ACCESS = "smart_sb_access_token";
export const REFRESH = "smart_sb_refresh_token";
export const EXPIRY = "smart_sb_token_expiry";

export const tokenStore = {
  set(tokens: AuthTokens) {
    localStorage.setItem(ACCESS, tokens.access_token);
    localStorage.setItem(REFRESH, tokens.refresh_token);

    const expiry = Date.now() + tokens.expires_in * 1000;
    localStorage.setItem(EXPIRY, expiry.toString());
  },

  access(): string | null {
    return localStorage.getItem(ACCESS);
  },

  refresh(): string | null {
    return localStorage.getItem(REFRESH);
  },

  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
    localStorage.removeItem(EXPIRY);
  },

  isExpired(): boolean {
    const expiry = localStorage.getItem(EXPIRY);
    if (!expiry) return true;

    return Date.now() >= Number(expiry) - 300000;
  }
};
