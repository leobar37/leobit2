const isProduction = process.env.NODE_ENV === "production";
const baseURL = process.env.BETTER_AUTH_BASE_URL || "http://localhost:5201";
const frontendURL = process.env.FRONTEND_URL || "http://localhost:5173";

const DEV_PORTS = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180];
const DEV_ORIGINS = DEV_PORTS.map((port) => `http://localhost:${port}`);

export interface CorsConfig {
  isProduction: boolean;
  allowedOrigins: string[];
  credentials: string;
  methods: string;
  headers: string;
  maxAge: string;
}

function getAllowedOrigins(): string[] {
  if (isProduction) {
    return [baseURL, frontendURL].filter(
      (origin, index, self) => self.indexOf(origin) === index
    );
  }
  return [baseURL, frontendURL, ...DEV_ORIGINS].filter(
    (origin, index, self) => self.indexOf(origin) === index
  );
}

export function getCorsConfig(): CorsConfig {
  const allowedOrigins = getAllowedOrigins();

  return {
    isProduction,
    allowedOrigins,
    credentials: "true",
    methods: "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    headers: "Content-Type, Authorization, Cache-Control, Accept, Accept-Language",
    maxAge: "86400",
  };
}

export function getCorsOrigin(requestOrigin: string | null): string {
  const allowedOrigins = getAllowedOrigins();

  if (!requestOrigin) {
    return allowedOrigins[0] || frontendURL;
  }

  if (isProduction) {
    return allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];
  }

  if (requestOrigin.startsWith("http://localhost:") || requestOrigin.startsWith("https://localhost:")) {
    return requestOrigin;
  }

  return allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];
}
