import cors from "cors";
import express from "express";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { config } from "./config";
import { requireAuth } from "./middleware/auth";
import { healthRouter } from "./routes/health";
import { ticketsRouter } from "./routes/tickets";

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
      tickets: "/api/tickets"
    }
  });
});

app.use("/health", healthRouter);
app.use("/tickets", requireAuth, ticketsRouter);
app.use("/api/health", healthRouter);
app.use("/api/tickets", requireAuth, ticketsRouter);

app.get("/api/me", async (request, response) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers)
  });

  response.json({ data: session });
});

app.use((_request, response) => {
  response.status(404).json({ error: "Not found" });
});
