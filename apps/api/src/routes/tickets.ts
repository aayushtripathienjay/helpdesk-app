import { Router } from "express";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { fromNodeHeaders } from "better-auth/node";
import { Prisma, TicketCategory, TicketStatus, UserRole } from "@prisma/client";
import { auth } from "../auth";
import { config } from "../config";
import { ticketCategories, ticketStatuses } from "../domain/tickets";
import { prisma } from "../db/prisma";
import {
  enqueueTicketAutoResolution,
  enqueueTicketClassification
} from "../queues/tickets";
import {
  formatTicketConversation,
  ticketAiSelect
} from "../services/ticket-classification";

export const ticketsRouter = Router();
export const inboundEmailRouter = Router();

const ticketSelect = {
  id: true,
  subject: true,
  requesterEmail: true,
  status: true,
  category: true,
  assignedToId: true,
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true
    }
  },
  aiSuggestions: {
    where: {
      summary: {
        startsWith: "Auto-resolved using KB article:"
      }
    },
    orderBy: { createdAt: "asc" },
    take: 1,
    select: {
      id: true,
      summary: true,
      createdAt: true
    }
  },
  createdAt: true,
  updatedAt: true
} satisfies Prisma.TicketSelect;

const assignableAgentSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true
} satisfies Prisma.UserSelect;

const ticketDetailsSelect = {
  ...ticketSelect,
  messages: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      direction: true,
      senderEmail: true,
      body: true,
      externalId: true,
      createdAt: true
    }
  }
} satisfies Prisma.TicketSelect;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" ? value.trim() : undefined;
}

function normalizeEmail(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

function readRecipients(value: unknown) {
  if (typeof value === "string") {
    return value
      .split(",")
      .map(normalizeEmail)
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map(normalizeEmail)
      .filter(Boolean);
  }

  return [];
}

function readTicketStatus(value: unknown) {
  return typeof value === "string" &&
    Object.values(TicketStatus).includes(value as TicketStatus)
    ? (value as TicketStatus)
    : undefined;
}

function readTicketCategory(value: unknown) {
  return typeof value === "string" &&
    Object.values(TicketCategory).includes(value as TicketCategory)
    ? (value as TicketCategory)
    : undefined;
}

function readBoolean(value: unknown) {
  return value === "true" || value === true;
}

ticketsRouter.get("/", async (request, response) => {
  const status = readTicketStatus(request.query.status);
  const category = readTicketCategory(request.query.category);
  const aiResolved = readBoolean(request.query.aiResolved);
  const where: Prisma.TicketWhereInput = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(aiResolved
      ? {
          aiSuggestions: {
            some: {
              summary: {
                startsWith: "Auto-resolved using KB article:"
              }
            }
          }
        }
      : {})
  };
  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: ticketSelect
  });

  response.json({
    data: tickets,
    meta: {
      statuses: ticketStatuses,
      categories: ticketCategories
    }
  });
});

ticketsRouter.get("/agents", async (_request, response) => {
  const agents = await prisma.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      role: { in: [UserRole.admin, UserRole.agent] }
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: assignableAgentSelect
  });

  response.json({ data: agents });
});

ticketsRouter.get("/:ticketId", async (request, response) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: request.params.ticketId },
    select: ticketDetailsSelect
  });

  if (!ticket) {
    response.status(404).json({ error: "Ticket not found" });
    return;
  }

  response.json({ data: ticket });
});

ticketsRouter.patch("/:ticketId", async (request, response) => {
  if (!isObject(request.body)) {
    response.status(400).json({ error: "Request body is required" });
    return;
  }

  const assignedToId = readString(request.body, "assignedToId");
  const status = readTicketStatus(request.body.status);
  const category = readTicketCategory(request.body.category);
  const shouldUpdateAssignment = "assignedToId" in request.body;
  const shouldUnassign = request.body.assignedToId === null || assignedToId === "";
  const shouldUpdateCategory = "category" in request.body;
  const shouldClearCategory = request.body.category === null || request.body.category === "";

  if (shouldUpdateAssignment && !shouldUnassign && !assignedToId) {
    response.status(400).json({ error: "assignedToId is required" });
    return;
  }

  if ("status" in request.body && !status) {
    response.status(400).json({ error: "Invalid ticket status" });
    return;
  }

  if (shouldUpdateCategory && !shouldClearCategory && !category) {
    response.status(400).json({ error: "Invalid ticket category" });
    return;
  }

  if (assignedToId && shouldUpdateAssignment && !shouldUnassign) {
    const agent = await prisma.user.findFirst({
      where: {
        id: assignedToId,
        deletedAt: null,
        isActive: true,
        role: { in: [UserRole.admin, UserRole.agent] }
      },
      select: { id: true }
    });

    if (!agent) {
      response.status(400).json({ error: "Assigned user must be an active agent" });
      return;
    }
  }

  try {
    const data: Prisma.TicketUpdateInput = {};

    if (shouldUpdateAssignment) {
      data.assignedTo = shouldUnassign
        ? { disconnect: true }
        : { connect: { id: assignedToId } };
    }

    if (status) {
      data.status = status;
    }

    if (shouldUpdateCategory) {
      data.category = shouldClearCategory ? null : category;
    }

    const ticket = await prisma.ticket.update({
      where: { id: request.params.ticketId },
      data,
      select: ticketDetailsSelect
    });

    response.json({ data: ticket });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      response.status(404).json({ error: "Ticket not found" });
      return;
    }

    throw error;
  }
});

ticketsRouter.post("/:ticketId/messages", async (request, response) => {
  if (!isObject(request.body)) {
    response.status(400).json({ error: "Request body is required" });
    return;
  }

  const body = readString(request.body, "body");

  if (!body) {
    response.status(400).json({ error: "Reply body is required" });
    return;
  }

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers)
  });
  const senderEmail = session?.user.email ?? config.supportEmail;

  try {
    await prisma.ticketMessage.create({
      data: {
        ticketId: request.params.ticketId,
        direction: "outbound",
        senderEmail,
        body
      }
    });

    const ticket = await prisma.ticket.update({
      where: { id: request.params.ticketId },
      data: { updatedAt: new Date() },
      select: ticketDetailsSelect
    });

    response.status(201).json({ data: ticket });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2025")
    ) {
      response.status(404).json({ error: "Ticket not found" });
      return;
    }

    throw error;
  }
});

ticketsRouter.post("/:ticketId/polish-reply", async (request, response) => {
  if (!isObject(request.body)) {
    response.status(400).json({ error: "Request body is required" });
    return;
  }

  const body = readString(request.body, "body");

  if (!body) {
    response.status(400).json({ error: "Reply body is required" });
    return;
  }

  if (!config.googleGenerativeAiApiKey) {
    response.status(503).json({
      error: "Gemini API key is not configured"
    });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: request.params.ticketId },
    select: ticketAiSelect
  });

  if (!ticket) {
    response.status(404).json({ error: "Ticket not found" });
    return;
  }

  const conversation = formatTicketConversation(ticket);

  let polishedReply = "";

  try {
    const { text } = await generateText({
      model: google(config.geminiModel),
      system:
        "You polish support agent replies for a student helpdesk. Improve clarity, tone, empathy, and grammar while preserving the agent's meaning and any concrete commitments. Do not invent policy, refunds, timelines, links, or troubleshooting steps. Return only the rewritten reply text with no markdown.",
      prompt: [
        `Ticket subject: ${ticket.subject}`,
        `Customer email: ${ticket.requesterEmail}`,
        "Conversation:",
        conversation || "No prior messages.",
        "Agent draft reply:",
        body
      ].join("\n\n"),
      temperature: 0.3
    });

    polishedReply = text.trim();
  } catch {
    response.status(502).json({ error: "Failed to polish reply with Gemini" });
    return;
  }

  if (!polishedReply) {
    response.status(502).json({ error: "Gemini returned an empty reply" });
    return;
  }

  response.json({ data: { body: polishedReply } });
});

ticketsRouter.post("/:ticketId/summary", async (request, response) => {
  if (!config.googleGenerativeAiApiKey) {
    response.status(503).json({
      error: "Gemini API key is not configured"
    });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: request.params.ticketId },
    select: ticketAiSelect
  });

  if (!ticket) {
    response.status(404).json({ error: "Ticket not found" });
    return;
  }

  if (ticket.messages.length === 0) {
    response.status(400).json({ error: "Ticket has no messages to summarize" });
    return;
  }

  let summary = "";

  try {
    const { text } = await generateText({
      model: google(config.geminiModel),
      system:
        "You summarize student support ticket conversations for helpdesk agents. Be concise, factual, and action-oriented. Do not invent information. Return plain text only.",
      prompt: [
        `Ticket subject: ${ticket.subject}`,
        `Customer email: ${ticket.requesterEmail}`,
        "Conversation:",
        formatTicketConversation(ticket),
        "Write a compact summary with: issue, relevant context, what support has already done, and suggested next step if clear."
      ].join("\n\n"),
      temperature: 0.2
    });

    summary = text.trim();
  } catch {
    response.status(502).json({ error: "Failed to summarize ticket with Gemini" });
    return;
  }

  if (!summary) {
    response.status(502).json({ error: "Gemini returned an empty summary" });
    return;
  }

  response.json({ data: { summary } });
});

inboundEmailRouter.post("/", async (request, response) => {
  const inboundToken = request.header("x-inbound-email-token");

  if (!config.inboundEmailToken || inboundToken !== config.inboundEmailToken) {
    response.status(401).json({ error: "Invalid inbound email token" });
    return;
  }

  if (!isObject(request.body)) {
    response.status(400).json({ error: "Request body is required" });
    return;
  }

  const from = readString(request.body, "from");
  const subject = readString(request.body, "subject");
  const text = readString(request.body, "text");
  const html = readString(request.body, "html");
  const messageId = readString(request.body, "messageId");
  const recipients = readRecipients(request.body.to);
  const supportEmail = config.supportEmail.toLowerCase();

  if (!from || !subject || (!text && !html)) {
    response.status(400).json({
      error: "From, subject, and text or html are required"
    });
    return;
  }

  if (!recipients.includes(supportEmail)) {
    response.status(400).json({ error: "Email was not sent to the support address" });
    return;
  }

  if (messageId) {
    const existingMessage = await prisma.ticketMessage.findUnique({
      where: { externalId: messageId },
      select: {
        ticket: {
          select: ticketSelect
        }
      }
    });

    if (existingMessage) {
      response.json({ data: existingMessage.ticket });
      return;
    }
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject,
      requesterEmail: normalizeEmail(from),
      messages: {
        create: {
          direction: "inbound",
          senderEmail: normalizeEmail(from),
          body: text || html || "",
          externalId: messageId
        }
      }
    },
    select: ticketSelect
  });

  response.status(201).json({ data: ticket });
  void enqueueTicketClassification(ticket.id).catch((error) => {
    console.error("Failed to enqueue ticket classification", {
      error,
      ticketId: ticket.id
    });
  });
  void enqueueTicketAutoResolution(ticket.id).catch((error) => {
    console.error("Failed to enqueue ticket auto-resolution", {
      error,
      ticketId: ticket.id
    });
  });
});
