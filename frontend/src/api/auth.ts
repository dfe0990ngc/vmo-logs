import { ApiResponse } from "@/types/types";
import { post } from "./requests";
import { tokenStore } from "./tokens";
import { AuthTokens } from "./types";

export async function login(credentials: unknown) {
  const tokens = await post<AuthTokens>(
    "/api/auth/login",
    credentials
  );

  tokenStore.set(tokens);

  return tokens;
}

export async function logout() {
  try{
    const res = await post<ApiResponse<[]>>("/api/auth/logout");
    console.log(res);
  }finally{
    tokenStore.clear();
  
    window.dispatchEvent(
      new CustomEvent("auth:logout")
    );
  }
}
