import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { config } from "./config";
import { requireAuth } from "./middleware/auth";
import { healthRouter } from "./routes/health";
import { ticketsRouter } from "./routes/tickets";
import { userRoutes } from "./routes/users";

export const app = express();

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
      users: "/api/users",
      me: "/api/me"
    }
  });
});

app.use("/health", healthRouter);
app.use("/tickets", requireAuth, ticketsRouter);
app.use("/api/health", healthRouter);
app.use("/api/tickets", requireAuth, ticketsRouter);
app.use(userRoutes);

app.use((_request, response) => {
  response.status(404).json({ error: "Not found" });
});
