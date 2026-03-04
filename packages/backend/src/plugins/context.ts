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

    // Extract target business from header for multi-business support
    const targetBusinessId = request.headers.get("x-business-id");

    const ctx = await RequestContext.fromAuth(session, targetBusinessId);

    if (!ctx.isActive) {
      set.status = 403;
      throw new Error("Usuario inactivo en este negocio");
    }

    return { ctx };
  });
