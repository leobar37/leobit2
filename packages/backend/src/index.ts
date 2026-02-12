import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { authRoutes } from "./api/auth";
import { profileRoutes } from "./api/profile";
import { businessRoutes } from "./api/businesses";
import { invitationRoutes, publicInvitationRoutes } from "./api/invitations";

const app = new Elysia()
  .use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Cache-Control",
        "Accept",
        "Accept-Language",
      ],
    })
  )
  .use(authRoutes)
  .use(profileRoutes)
  .use(businessRoutes)
  .use(invitationRoutes)
  .use(publicInvitationRoutes)
  .get("/", () => ({
    message: "Avileo Backend API",
    version: "1.0.0",
    status: "running",
  }))
  .get("/health", () => ({
    status: "healthy",
    timestamp: new Date().toISOString(),
  }))
  .listen({
    port: Number(process.env.PORT) || 3000,
    hostname: "0.0.0.0",
  });

console.log(
  `🦊 Avileo backend running at http://${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
