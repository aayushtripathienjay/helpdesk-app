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
  assignedToId: string | null;
  assignedTo: AssignableAgent | null;
  aiSuggestions?: TicketAiSuggestion[];
  createdAt: string;
  updatedAt: string;
};

export type TicketAiSuggestion = {
  id: string;
  summary: string | null;
  createdAt: string;
};

export type AssignableAgent = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
  isActive: boolean;
};

export type TicketMessage = {
  id: string;
  direction: "inbound" | "outbound";
  senderEmail: string;
  body: string;
  externalId: string | null;
  createdAt: string;
};

export type TicketDetails = Ticket & {
  messages: TicketMessage[];
};

export type TicketFilters = {
  aiResolved?: boolean;
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

    if (filters.aiResolved) {
      params.set("aiResolved", "true");
    }

    const response = await axios.get<{ data: Ticket[] }>("/api/tickets", {
      params
    });
    return response.data.data;
  } catch {
    throw new Error("Failed to load tickets");
  }
}

export async function getTicket(ticketId: string): Promise<TicketDetails> {
  try {
    const response = await axios.get<{ data: TicketDetails }>(
      `/api/tickets/${ticketId}`
    );
    return response.data.data;
  } catch {
    throw new Error("Failed to load ticket");
  }
}

export async function listAssignableAgents(): Promise<AssignableAgent[]> {
  try {
    const response = await axios.get<{ data: AssignableAgent[] }>(
      "/api/tickets/agents"
    );
    return response.data.data;
  } catch {
    throw new Error("Failed to load agents");
  }
}

export async function assignTicket(ticketId: string, assignedToId: string | null) {
  try {
    const response = await axios.patch<{ data: TicketDetails }>(
      `/api/tickets/${ticketId}`,
      { assignedToId }
    );
    return response.data.data;
  } catch {
    throw new Error("Failed to assign ticket");
  }
}

export type TicketUpdatePayload = {
  assignedToId?: string | null;
  status?: TicketStatus;
  category?: TicketCategory | null;
};

export async function updateTicket(
  ticketId: string,
  payload: TicketUpdatePayload
) {
  try {
    const response = await axios.patch<{ data: TicketDetails }>(
      `/api/tickets/${ticketId}`,
      payload
    );
    return response.data.data;
  } catch {
    throw new Error("Failed to update ticket");
  }
}

export async function replyToTicket(ticketId: string, body: string) {
  try {
    const response = await axios.post<{ data: TicketDetails }>(
      `/api/tickets/${ticketId}/messages`,
      { body }
    );
    return response.data.data;
  } catch {
    throw new Error("Failed to send reply");
  }
}

export async function polishTicketReply(ticketId: string, body: string) {
  try {
    const response = await axios.post<{ data: { body: string } }>(
      `/api/tickets/${ticketId}/polish-reply`,
      { body }
    );
    return response.data.data.body;
  } catch (error) {
    if (axios.isAxiosError<{ error?: string }>(error) && error.response?.data.error) {
      throw new Error(error.response.data.error);
    }

    throw new Error("Failed to polish reply");
  }
}

export async function summarizeTicketConversation(ticketId: string) {
  try {
    const response = await axios.post<{ data: { summary: string } }>(
      `/api/tickets/${ticketId}/summary`
    );
    return response.data.data.summary;
  } catch (error) {
    if (axios.isAxiosError<{ error?: string }>(error) && error.response?.data.error) {
      throw new Error(error.response.data.error);
    }

    throw new Error("Failed to summarize ticket");
  }
}
