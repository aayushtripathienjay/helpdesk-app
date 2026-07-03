import axios from "axios";

export const TicketStatusValue = {
  Closed: "closed",
  Open: "open",
  Resolved: "resolved"
} as const;

export const TicketCategoryValue = {
  GeneralQuestion: "general_question",
  RefundRequest: "refund_request",
  TechnicalQuestion: "technical_question"
} as const;

export const ticketStatuses = Object.values(TicketStatusValue);
export const ticketCategories = Object.values(TicketCategoryValue);

export const ticketStatusLabels = {
  [TicketStatusValue.Open]: "Open",
  [TicketStatusValue.Resolved]: "Resolved",
  [TicketStatusValue.Closed]: "Closed"
} as const;

export const ticketCategoryLabels = {
  [TicketCategoryValue.GeneralQuestion]: "General question",
  [TicketCategoryValue.TechnicalQuestion]: "Technical question",
  [TicketCategoryValue.RefundRequest]: "Refund request"
} as const;

export type TicketStatus =
  (typeof TicketStatusValue)[keyof typeof TicketStatusValue];
export type TicketCategory =
  (typeof TicketCategoryValue)[keyof typeof TicketCategoryValue];

export type Ticket = {
  id: string;
  subject: string;
  requesterEmail: string;
  status: TicketStatus;
  category: TicketCategory | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketFilters = {
  category?: TicketCategory | "all";
  status?: TicketStatus | "all";
};

export async function listTickets(filters: TicketFilters = {}): Promise<Ticket[]> {
  try {
    const params = new URLSearchParams();

    if (filters.status && filters.status !== "all") {
      params.set("status", filters.status);
    }

    if (filters.category && filters.category !== "all") {
      params.set("category", filters.category);
    }

    const response = await axios.get<{ data: Ticket[] }>("/api/tickets", {
      params
    });
    return response.data.data;
  } catch {
    throw new Error("Failed to load tickets");
  }
}
