import { Elysia } from "elysia";
import { auth } from "../lib/auth";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .all("/*", async (context) => {
    const { request } = context;

    const response = await auth.handler(request);
    return response;
  });
