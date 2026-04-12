import "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    meta?: {
      excludeAuth?: boolean;
    };
  }

  export interface InternalAxiosRequestConfig {
    meta?: {
      excludeAuth?: boolean;
    };
  }
}
