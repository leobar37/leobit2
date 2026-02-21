import { Elysia } from "elysia";
import { auth } from "../lib/auth";
import { RequestContext } from "../context/request-context";

export const contextPlugin = new Elysia({ name: "context" })
  .resolve({ as: "scoped" }, async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      set.status = 401;
      throw new Error("No autorizado");
    }

    const ctx = await RequestContext.fromAuth(session);

    if (!ctx.isActive) {
      set.status = 403;
      throw new Error("Usuario inactivo en este negocio");
    }

    return { ctx };
  });
