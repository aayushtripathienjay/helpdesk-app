export const ticketStatuses = ["open", "resolved", "closed"] as const;
export const ticketCategories = [
  "general_question",
  "technical_question",
  "refund_request"
] as const;

export type TicketStatus = (typeof ticketStatuses)[number];
export type TicketCategory = (typeof ticketCategories)[number];

export type Ticket = {
  id: string;
  subject: string;
  requesterEmail: string;
  status: TicketStatus;
  category: TicketCategory;
  createdAt: string;
  updatedAt: string;
};

export const demoTickets: Ticket[] = [
  {
    id: "ticket_001",
    subject: "I cannot access my course",
    requesterEmail: "student@example.com",
    status: "open",
    category: "technical_question",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
