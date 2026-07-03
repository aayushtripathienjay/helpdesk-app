import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { Prisma, TicketCategory, TicketStatus, UserRole } from "@prisma/client";
import { auth } from "../auth";
import { config } from "../config";
import { ticketCategories, ticketStatuses } from "../domain/tickets";
import { prisma } from "../db/prisma";

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

ticketsRouter.get("/", async (request, response) => {
  const status = readTicketStatus(request.query.status);
  const category = readTicketCategory(request.query.category);
  const where: Prisma.TicketWhereInput = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {})
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
      category: TicketCategory.general_question,
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
});
