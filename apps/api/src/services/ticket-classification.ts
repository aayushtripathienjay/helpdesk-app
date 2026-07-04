import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { Prisma, TicketCategory } from "@prisma/client";
import { config } from "../config";
import { prisma } from "../db/prisma";

const ticketAiSelect = {
  subject: true,
  requesterEmail: true,
  messages: {
    orderBy: { createdAt: "asc" },
    select: {
      direction: true,
      senderEmail: true,
      body: true,
      createdAt: true
    }
  }
} satisfies Prisma.TicketSelect;

type TicketAiContext = Prisma.TicketGetPayload<{ select: typeof ticketAiSelect }>;

function readTicketCategory(value: unknown) {
  return typeof value === "string" &&
    Object.values(TicketCategory).includes(value as TicketCategory)
    ? (value as TicketCategory)
    : undefined;
}

export function formatTicketConversation(ticket: TicketAiContext) {
  return ticket.messages
    .map((message) => {
      const role = message.direction === "inbound" ? "Customer" : "Support";
      return `${role} (${message.senderEmail}, ${message.createdAt.toISOString()}):\n${message.body}`;
    })
    .join("\n\n");
}

function parseClassificationResponse(value: string) {
  const jsonMatch = value.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch?.[0] ?? value;
  const parsed = JSON.parse(jsonText) as {
    category?: unknown;
    confidence?: unknown;
  };
  const category = readTicketCategory(parsed.category);

  if (!category) {
    return null;
  }

  const confidence =
    typeof parsed.confidence === "number" &&
    Number.isFinite(parsed.confidence) &&
    parsed.confidence >= 0 &&
    parsed.confidence <= 1
      ? parsed.confidence
      : null;

  return {
    category,
    confidence
  };
}

export async function classifyTicket(ticketId: string) {
  if (!config.googleGenerativeAiApiKey) {
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: ticketAiSelect
  });

  if (!ticket || ticket.messages.length === 0) {
    return;
  }

  const { text } = await generateText({
    model: google(config.geminiModel),
    system:
      "You classify student support tickets. Use exactly one category from this enum: general_question, technical_question, refund_request. Return only compact JSON with category and confidence from 0 to 1.",
    prompt: [
      "Category definitions:",
      "- general_question: course content, certificates, account questions, scheduling, or general support questions.",
      "- technical_question: login failures, access problems, bugs, errors, broken pages, downloads, video playback, app issues, or other technical troubleshooting.",
      "- refund_request: refunds, billing reversals, duplicate charges, cancellations, invoices, receipts, payment disputes, or purchase issues.",
      `Ticket subject: ${ticket.subject}`,
      `Customer email: ${ticket.requesterEmail}`,
      "Conversation:",
      formatTicketConversation(ticket),
      'Return JSON like {"category":"technical_question","confidence":0.82}.'
    ].join("\n\n"),
    temperature: 0
  });

  const classification = parseClassificationResponse(text.trim());

  if (!classification) {
    return;
  }

  await prisma.$transaction([
    prisma.aiSuggestion.create({
      data: {
        ticketId,
        category: classification.category,
        confidence: classification.confidence
      }
    }),
    prisma.ticket.updateMany({
      where: {
        id: ticketId,
        category: null
      },
      data: {
        category: classification.category
      }
    })
  ]);
}

export { ticketAiSelect };
