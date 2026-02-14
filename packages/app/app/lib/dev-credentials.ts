export const DEV_CREDENTIALS = {
  email: "demo@avileo.com",
  password: "demo123456",
} as const;

export function isDevelopment(): boolean {
  return import.meta.env.DEV === true;
}
