import { MessageDirection, Prisma, TicketStatus } from "@prisma/client";
import { config } from "../config";
import { prisma } from "../db/prisma";

const autoResolveTicketSelect = {
  id: true,
  subject: true,
  requesterEmail: true,
  status: true,
  messages: {
    orderBy: { createdAt: "asc" },
    select: {
      body: true,
      direction: true
    }
  }
} satisfies Prisma.TicketSelect;

type AutoResolveTicket = Prisma.TicketGetPayload<{
  select: typeof autoResolveTicketSelect;
}>;

type KnowledgeBaseArticle = {
  id: string;
  title: string;
  requiredTerms: string[];
  optionalTerms: string[];
  minimumOptionalMatches: number;
  reply: string;
};

const knowledgeBaseArticles: KnowledgeBaseArticle[] = [
  {
    id: "certificate-availability",
    title: "Certificate availability after course completion",
    requiredTerms: ["certificate"],
    optionalTerms: ["completed", "finished", "available", "availability", "course"],
    minimumOptionalMatches: 1,
    reply:
      "Thanks for reaching out. Certificates are available from your student profile after the course is fully completed. Please refresh your profile, confirm every required lesson is marked complete, and then open the Certificates section again. If it still does not appear after that, reply here and we can take another look."
  },
  {
    id: "next-course-recommendation",
    title: "Finding the next course",
    requiredTerms: ["course"],
    optionalTerms: ["next", "recommend", "recommendation", "roadmap", "after"],
    minimumOptionalMatches: 1,
    reply:
      "Thanks for asking. The best next course depends on your goal, but the course roadmap in your account is the recommended path after finishing a course. Open your dashboard, choose the completed course, and check the recommended next steps shown there. If you are choosing between two specific courses, reply with those titles and we can help compare them."
  },
  {
    id: "mobile-video-playback",
    title: "Mobile video playback troubleshooting",
    requiredTerms: ["video"],
    optionalTerms: ["mobile", "app", "freezes", "freezing", "playback", "load", "loading"],
    minimumOptionalMatches: 2,
    reply:
      "Thanks for the details. For mobile video playback issues, please update the app, fully close and reopen it, switch networks if possible, and try the lesson again. If the issue continues, clear the app cache or reinstall the app before retrying. Reply here with your device model and app version if playback still fails."
  },
  {
    id: "download-resources",
    title: "Downloading course resources",
    requiredTerms: ["download"],
    optionalTerms: ["resource", "resources", "file", "files", "exercise", "starter"],
    minimumOptionalMatches: 1,
    reply:
      "Thanks for reaching out. Course resources are available from the lesson resources area below the video. Open the lesson, look for the Resources or Downloads section, and download the starter files from there. If a specific lesson is missing files, reply with the course and lesson name."
  }
];

function normalize(value: string) {
  return value.toLowerCase();
}

function ticketText(ticket: AutoResolveTicket) {
  return normalize(
    [
      ticket.subject,
      ...ticket.messages
        .filter((message) => message.direction === MessageDirection.inbound)
        .map((message) => message.body)
    ].join("\n")
  );
}

function matchesArticle(text: string, article: KnowledgeBaseArticle) {
  const hasRequiredTerms = article.requiredTerms.every((term) =>
    text.includes(term)
  );

  if (!hasRequiredTerms) {
    return false;
  }

  const optionalMatches = article.optionalTerms.filter((term) =>
    text.includes(term)
  ).length;

  return optionalMatches >= article.minimumOptionalMatches;
}

function findMatchingArticle(ticket: AutoResolveTicket) {
  const text = ticketText(ticket);
  return knowledgeBaseArticles.find((article) => matchesArticle(text, article));
}

export async function autoResolveTicket(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: autoResolveTicketSelect
  });

  if (!ticket || ticket.status !== TicketStatus.open) {
    return null;
  }

  const article = findMatchingArticle(ticket);

  if (!article) {
    return null;
  }

  const reply = `${article.reply}\n\nI am marking this ticket as resolved based on our help center guidance. You can reply to reopen the conversation if you still need help.`;

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        ticketId,
        direction: MessageDirection.outbound,
        senderEmail: config.supportEmail,
        body: reply
      }
    }),
    prisma.aiSuggestion.create({
      data: {
        ticketId,
        summary: `Auto-resolved using KB article: ${article.title}`,
        reply,
        confidence: 1
      }
    }),
    prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.resolved,
        updatedAt: new Date()
      }
    })
  ]);

  return {
    articleId: article.id,
    articleTitle: article.title,
    reply
  };
}

export async function autoResolveOpenTickets(limit = 50) {
  const tickets = await prisma.ticket.findMany({
    where: {
      status: TicketStatus.open
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true }
  });
  const resolvedTickets: Array<{
    articleId: string;
    articleTitle: string;
    ticketId: string;
  }> = [];

  for (const ticket of tickets) {
    const result = await autoResolveTicket(ticket.id);

    if (result) {
      resolvedTickets.push({
        articleId: result.articleId,
        articleTitle: result.articleTitle,
        ticketId: ticket.id
      });
    }
  }

  return resolvedTickets;
}
