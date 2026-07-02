import axios from "axios";

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
  try {
    const response = await axios.get<{ data: Ticket[] }>("/api/tickets");
    return response.data.data;
  } catch {
    throw new Error("Failed to load tickets");
  }
}
