import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipInterceptors?: boolean;
    _retryAfterRefresh?: boolean;
  }
}
