import type { RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";

export const requireAuth: RequestHandler = async (request, response, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers)
  });

  if (!session) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }

  if (session.user.isActive === false) {
    response.status(403).json({ error: "User account is inactive" });
    return;
  }

  next();
};
