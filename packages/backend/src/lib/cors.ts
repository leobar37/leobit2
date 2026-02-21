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
  // Allow Tailscale IPs (100.x.x.x) for cross-device development
  const tailscaleFrontend = process.env.FRONTEND_URL;
  
  if (isProduction) {
    return [baseURL, frontendURL, tailscaleFrontend].filter(
      (origin, index, self) => origin && self.indexOf(origin) === index
    ) as string[];
  }
  return [baseURL, frontendURL, tailscaleFrontend, ...DEV_ORIGINS].filter(
    (origin, index, self) => origin && self.indexOf(origin) === index
  ) as string[];
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

  // Allow localhost
  if (requestOrigin.startsWith("http://localhost:") || requestOrigin.startsWith("https://localhost:")) {
    return requestOrigin;
  }

  // Allow Tailscale IPs (100.x.x.x) for cross-device development
  if (requestOrigin.match(/^https?:\/\/100\./)) {
    return requestOrigin;
  }

  // Allow Tailscale DNS names (*.ts.net) with HTTPS
  if (requestOrigin.match(/^https:\/\/[^\/]+\.tail[0-9a-z]+\.ts\.net/)) {
    return requestOrigin;
  }

  return allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];
}
