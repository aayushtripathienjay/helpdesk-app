import { MessageDirection, TicketCategory, TicketStatus } from "@prisma/client";
import { prisma } from "../db/prisma";

const sampleTickets = [
  {
    id: "sample_ticket_login_access",
    body: "I cannot access the course dashboard after resetting my password.",
    category: TicketCategory.technical_question,
    createdAt: new Date("2026-07-03T10:00:00.000Z"),
    requesterEmail: "student.access@example.com",
    status: TicketStatus.open,
    subject: "Cannot access my course"
  },
  {
    id: "sample_ticket_refund",
    body: "I purchased the wrong course and would like help with a refund.",
    category: TicketCategory.refund_request,
    createdAt: new Date("2026-07-03T09:00:00.000Z"),
    requesterEmail: "billing.student@example.com",
    status: TicketStatus.resolved,
    subject: "Refund request for course purchase"
  },
  {
    id: "sample_ticket_certificate",
    body: "My certificate is not showing my updated name.",
    category: TicketCategory.general_question,
    createdAt: new Date("2026-07-03T08:00:00.000Z"),
    requesterEmail: "certificate.student@example.com",
    status: TicketStatus.open,
    subject: "Certificate name is incorrect"
  }
];

export async function seedSampleTickets() {
  for (const ticket of sampleTickets) {
    await prisma.ticket.upsert({
      where: { id: ticket.id },
      create: {
        id: ticket.id,
        category: ticket.category,
        createdAt: ticket.createdAt,
        messages: {
          create: {
            body: ticket.body,
            direction: MessageDirection.inbound,
            senderEmail: ticket.requesterEmail
          }
        },
        requesterEmail: ticket.requesterEmail,
        status: ticket.status,
        subject: ticket.subject,
        updatedAt: ticket.createdAt
      },
      update: {
        category: ticket.category,
        requesterEmail: ticket.requesterEmail,
        status: ticket.status,
        subject: ticket.subject,
        updatedAt: ticket.createdAt
      }
    });
  }
}
