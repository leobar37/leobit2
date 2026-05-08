export const DEV_CREDENTIALS = {
  email: "demo@avileo.com",
  password: "demo123456",
} as const;

export const WATER_DEV_CREDENTIALS = {
  email: "agua@avileo.com",
  password: "agua123456",
} as const;

export function isDevelopment(): boolean {
  return import.meta.env.DEV === true;
}
