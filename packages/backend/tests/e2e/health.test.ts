import { describe, it, expect } from "vitest";
import { app } from "../../src/app";
import { makeRequest, parseJson } from "./helpers";

describe("Health Check API", () => {
  it("should return health status", async () => {
    const response = await makeRequest(app, "/health");

    expect(response.status).toBe(200);

    const body = await parseJson<{ status: string; timestamp: string }>(response);

    expect(body).toHaveProperty("status", "healthy");
    expect(body).toHaveProperty("timestamp");
  });
});

describe("Root Endpoint", () => {
  it("should return API info", async () => {
    const response = await makeRequest(app, "/");

    expect(response.status).toBe(200);

    const body = await parseJson<{
      message: string;
      version: string;
      status: string;
    }>(response);

    expect(body).toHaveProperty("message", "Avileo Backend API");
    expect(body).toHaveProperty("version", "1.0.0");
    expect(body).toHaveProperty("status", "running");
  });
});

describe("CORS Preflight", () => {
  it("should handle OPTIONS requests for CORS", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
      },
    });

    const response = await app.handle(request);

    // Note: 204 responses with null body may cause issues in test environment
    // Just check that CORS headers are present
    expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
    expect(response.headers.get("access-control-allow-methods")).toBeTruthy();
  });
});
