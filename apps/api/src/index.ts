import { app } from "./app";
import { config } from "./config";
import { startTicketQueues, stopTicketQueues } from "./queues/tickets";

await startTicketQueues();

const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`API listening on http://localhost:${config.port}`);
});

async function shutdown() {
  server.close();
  await stopTicketQueues();
}

process.on("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});
