import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { auth } from "./auth";
import { config } from "./config";
import { requireAuth } from "./middleware/auth";
import { healthRouter } from "./routes/health";
import { inboundEmailRouter, ticketsRouter } from "./routes/tickets";
import { userRoutes } from "./routes/users";

export const app = express();
const apiDistDir = dirname(fileURLToPath(import.meta.url));
const webDistDir = resolve(apiDistDir, "../../web/dist");

app.use(
  cors({
    origin: config.webOrigins,
    credentials: true
  })
);

app.all("/api/auth/{*authRoute}", toNodeHandler(auth));

app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    ok: true,
    service: "helpdesk-api",
    endpoints: {
      health: "/api/health",
      tickets: "/api/tickets",
      inboundEmail: "/api/inbound-email",
      users: "/api/users",
      me: "/api/me"
    }
  });
});

app.use("/health", healthRouter);
app.use("/tickets", requireAuth, ticketsRouter);
app.use("/api/health", healthRouter);
app.use("/api/inbound-email", inboundEmailRouter);
app.use("/api/tickets", requireAuth, ticketsRouter);
app.use(userRoutes);

if (config.isProduction && existsSync(webDistDir)) {
  app.use(express.static(webDistDir));

  app.get("{*spaRoute}", (request, response, next) => {
    if (request.path.startsWith("/api/") || !request.accepts("html")) {
      return next();
    }

    response.sendFile(resolve(webDistDir, "index.html"));
  });
}

app.use((_request, response) => {
  response.status(404).json({ error: "Not found" });
});
