// Placeholder exports for shared utilities
export const VERSION = "0.0.1";

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};
