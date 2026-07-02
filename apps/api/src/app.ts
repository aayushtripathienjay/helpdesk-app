import cors from "cors";
import express from "express";
import { config } from "./config";
import { healthRouter } from "./routes/health";
import { ticketsRouter } from "./routes/tickets";

export const app = express();

app.use(
  cors({
    origin: config.webOrigin,
    credentials: true
  })
);
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
app.use("/tickets", ticketsRouter);
app.use("/api/health", healthRouter);
app.use("/api/tickets", ticketsRouter);

app.use((_request, response) => {
  response.status(404).json({ error: "Not found" });
});
