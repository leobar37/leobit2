import { Elysia } from "elysia";
import { auth } from "../lib/auth";

export const authMiddleware = new Elysia()
  .derive({ as: "scoped" }, async (context) => {
    const { request } = context;
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return {
        user: null as any,
        session: null as any,
        isAuthenticated: false,
      };
    }

    return {
      user: session.user as any,
      session: session.session as any,
      isAuthenticated: true,
    };
  });

export const requireAuth = new Elysia()
  .use(authMiddleware)
  .onBeforeHandle(({ isAuthenticated, set }: any) => {
    if (!isAuthenticated) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
  });
