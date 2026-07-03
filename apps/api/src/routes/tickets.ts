import { Router } from "express";
import { Prisma, TicketCategory, TicketStatus } from "@prisma/client";
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
  createdAt: true,
  updatedAt: true
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

ticketsRouter.get("/:ticketId", async (request, response) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: request.params.ticketId },
    select: {
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
    }
  });

  if (!ticket) {
    response.status(404).json({ error: "Ticket not found" });
    return;
  }

  response.json({ data: ticket });
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
