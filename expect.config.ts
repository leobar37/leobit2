import { defineConfig } from "expect-cli";

export default defineConfig({
  project: "avileo",

  servers: {
    frontend: {
      url: "http://localhost:5174",
      timeout: 30000,
    },
    backend: {
      url: "http://localhost:5201",
      timeout: 10000,
    },
  },

  flows: {
    dir: "./.agents/skills/expect/flows",
  },

  testUsers: {
    admin: {
      email: "admin@avileo.com",
      password: "admin123",
    },
    vendor: {
      email: "vendedor@avileo.com",
      password: "vendor123",
    },
  },

  viewport: {
    mobile: { width: 375, height: 812, isMobile: true },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 720 },
  },

  browser: {
    type: "chromium",
    headless: process.env.CI === "true",
  },

  timeouts: {
    action: 5000,
    navigation: 15000,
    expect: 10000,
  },

  cookies: {
    extractFromChrome: true,
    profiles: ["Default", "Profile 1"],
  },

  reporting: {
    outputDir: "./reports/expect",
    formats: ["html", "json"],
  },
});
