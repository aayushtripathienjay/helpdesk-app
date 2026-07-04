import { PgBoss, type Job } from "pg-boss";
import { config } from "../config";
import { autoResolveTicket } from "../services/ticket-auto-resolution";
import { classifyTicket } from "../services/ticket-classification";

const autoResolveTicketQueue = "ticket-auto-resolution";
const classifyTicketQueue = "ticket-classification";

type ClassifyTicketJob = {
  ticketId: string;
};

type AutoResolveTicketJob = {
  ticketId: string;
};

let boss: PgBoss | null = null;
let startPromise: Promise<PgBoss> | null = null;

function getBoss() {
  if (!boss) {
    boss = new PgBoss(config.databaseUrl);
    boss.on("error", (error) => {
      console.error("pg-boss error", error);
    });
  }

  return boss;
}

export async function startTicketQueues() {
  if (!startPromise) {
    startPromise = (async () => {
      const queueBoss = getBoss();
      await queueBoss.start();
      await queueBoss.createQueue(classifyTicketQueue, {
        retryLimit: 3,
        retryBackoff: true
      });
      await queueBoss.createQueue(autoResolveTicketQueue, {
        retryLimit: 3,
        retryBackoff: true
      });
      await queueBoss.work<ClassifyTicketJob>(
        classifyTicketQueue,
        { batchSize: 1 },
        async ([job]: Job<ClassifyTicketJob>[]) => {
          if (!job?.data.ticketId) {
            return;
          }

          await classifyTicket(job.data.ticketId);
        }
      );
      await queueBoss.work<AutoResolveTicketJob>(
        autoResolveTicketQueue,
        { batchSize: 1 },
        async ([job]: Job<AutoResolveTicketJob>[]) => {
          if (!job?.data.ticketId) {
            return;
          }

          await autoResolveTicket(job.data.ticketId);
        }
      );
      return queueBoss;
    })().catch((error) => {
      startPromise = null;
      throw error;
    });
  }

  return startPromise;
}

export async function stopTicketQueues() {
  if (!boss) {
    return;
  }

  await boss.stop();
  boss = null;
  startPromise = null;
}

export async function enqueueTicketClassification(ticketId: string) {
  const queueBoss = await startTicketQueues();
  await queueBoss.send(
    classifyTicketQueue,
    { ticketId },
    {
      retryLimit: 3,
      retryBackoff: true
    }
  );
}

export async function enqueueTicketAutoResolution(ticketId: string) {
  const queueBoss = await startTicketQueues();
  await queueBoss.send(
    autoResolveTicketQueue,
    { ticketId },
    {
      retryLimit: 3,
      retryBackoff: true,
      startAfter: 5
    }
  );
}
