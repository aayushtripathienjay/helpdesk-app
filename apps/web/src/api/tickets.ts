export type TicketStatus = "open" | "resolved" | "closed";
export type TicketCategory =
  | "general_question"
  | "technical_question"
  | "refund_request";

export type Ticket = {
  id: string;
  subject: string;
  requesterEmail: string;
  status: TicketStatus;
  category: TicketCategory;
  createdAt: string;
  updatedAt: string;
};

export async function listTickets(): Promise<Ticket[]> {
  const response = await fetch("/api/tickets");

  if (!response.ok) {
    throw new Error("Failed to load tickets");
  }

  const payload = (await response.json()) as { data: Ticket[] };
  return payload.data;
}
