import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { App } from "./App";
import {
  getTicket,
  listAssignableAgents,
  listTickets,
  polishTicketReply,
  replyToTicket,
  summarizeTicketConversation,
  TicketCategoryValue,
  TicketStatusValue,
  type Ticket,
  type TicketDetails,
  type TicketFilters,
  updateTicket
} from "../api/tickets";
import { renderWithQuery } from "../test/render-with-query";

const mocks = vi.hoisted(() => ({
  getTicket: vi.fn(),
  listAssignableAgents: vi.fn(),
  listTickets: vi.fn(),
  polishTicketReply: vi.fn(),
  replyToTicket: vi.fn(),
  summarizeTicketConversation: vi.fn(),
  signOut: vi.fn(),
  updateTicket: vi.fn()
}));

vi.mock("../api/auth", () => ({
  authClient: {
    signOut: mocks.signOut,
    useSession: () => ({
      data: {
        user: {
          id: "admin-1",
          email: "admin@example.com",
          name: "Admin User",
          role: "admin",
          isActive: true
        }
      },
      isPending: false
    })
  }
}));

vi.mock("../api/tickets", () => {
  const TicketStatusValue = {
    Closed: "closed",
    Open: "open",
    Resolved: "resolved"
  } as const;
  const TicketCategoryValue = {
    GeneralQuestion: "general_question",
    RefundRequest: "refund_request",
    TechnicalQuestion: "technical_question"
  } as const;

  return {
    getTicket: mocks.getTicket,
    listAssignableAgents: mocks.listAssignableAgents,
    listTickets: mocks.listTickets,
    polishTicketReply: mocks.polishTicketReply,
    replyToTicket: mocks.replyToTicket,
    summarizeTicketConversation: mocks.summarizeTicketConversation,
    TicketCategoryValue,
    ticketCategories: Object.values(TicketCategoryValue),
    ticketCategoryLabels: {
      [TicketCategoryValue.GeneralQuestion]: "General question",
      [TicketCategoryValue.TechnicalQuestion]: "Technical question",
      [TicketCategoryValue.RefundRequest]: "Refund request"
    },
    ticketStatusLabels: {
      [TicketStatusValue.Open]: "Open",
      [TicketStatusValue.Resolved]: "Resolved",
      [TicketStatusValue.Closed]: "Closed"
    },
    ticketStatuses: Object.values(TicketStatusValue),
    TicketStatusValue,
    updateTicket: mocks.updateTicket
  };
});

const tickets: Ticket[] = [
  {
    id: "ticket-newest",
    subject: "Cannot access my course",
    requesterEmail: "student.access@example.com",
    status: TicketStatusValue.Open,
    category: TicketCategoryValue.TechnicalQuestion,
    assignedToId: null,
    assignedTo: null,
    aiSuggestions: [],
    createdAt: "2026-07-03T10:00:00.000Z",
    updatedAt: "2026-07-03T10:00:00.000Z"
  },
  {
    id: "ticket-middle",
    subject: "Refund request for course purchase",
    requesterEmail: "billing.student@example.com",
    status: TicketStatusValue.Resolved,
    category: TicketCategoryValue.RefundRequest,
    assignedToId: "agent-1",
    assignedTo: {
      id: "agent-1",
      name: "Agent User",
      email: "agent@example.com",
      role: "agent",
      isActive: true
    },
    aiSuggestions: [
      {
        id: "ai-resolution-1",
        summary: "Auto-resolved using KB article: Refund policy",
        createdAt: "2026-07-04T10:30:00.000Z"
      }
    ],
    createdAt: "2026-07-03T09:00:00.000Z",
    updatedAt: "2026-07-03T09:00:00.000Z"
  },
  {
    id: "ticket-oldest",
    subject: "Certificate name is incorrect",
    requesterEmail: "certificate.student@example.com",
    status: TicketStatusValue.Open,
    category: TicketCategoryValue.GeneralQuestion,
    assignedToId: null,
    assignedTo: null,
    aiSuggestions: [],
    createdAt: "2026-07-03T08:00:00.000Z",
    updatedAt: "2026-07-03T08:00:00.000Z"
  }
];

const ticketDetails: TicketDetails = {
  ...tickets[0],
  messages: [
    {
      id: "message-1",
      body: "I cannot access the course dashboard after resetting my password.",
      createdAt: "2026-07-03T10:01:00.000Z",
      direction: "inbound",
      externalId: null,
      senderEmail: "student.access@example.com"
    }
  ]
};

function createTicket(index: number): Ticket {
  return {
    id: `ticket-${index}`,
    subject: `Generated ticket ${String(index).padStart(2, "0")}`,
    requesterEmail: `student.${index}@example.com`,
    status:
      index % 3 === 0
        ? TicketStatusValue.Closed
        : index % 2 === 0
          ? TicketStatusValue.Resolved
          : TicketStatusValue.Open,
    category:
      index % 3 === 0
        ? TicketCategoryValue.RefundRequest
        : index % 2 === 0
          ? TicketCategoryValue.GeneralQuestion
          : TicketCategoryValue.TechnicalQuestion,
    assignedToId: null,
    assignedTo: null,
    aiSuggestions: [],
    createdAt: new Date(Date.UTC(2026, 6, 3, 12 - index)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 6, 3, 12 - index)).toISOString()
  };
}

function filterTickets(filters: TicketFilters = {}) {
  return tickets.filter((ticket) => {
    const matchesStatus =
      !filters.status || filters.status === "all" || ticket.status === filters.status;
    const matchesCategory =
      !filters.category ||
      filters.category === "all" ||
      ticket.category === filters.category;

    return matchesStatus && matchesCategory;
  });
}

function renderAppAt(path: string) {
  return renderWithQuery(<App />, {
    initialEntries: [path]
  });
}

describe("Tickets UI", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    window.localStorage.clear();
    vi.mocked(updateTicket).mockReset();
    vi.mocked(updateTicket).mockResolvedValue({
      ...ticketDetails,
      assignedToId: "agent-1",
      assignedTo: {
        id: "agent-1",
        name: "Agent User",
        email: "agent@example.com",
        role: "agent",
        isActive: true
      }
    });
    vi.mocked(replyToTicket).mockReset();
    vi.mocked(replyToTicket).mockResolvedValue({
      ...ticketDetails,
      messages: [
        ...ticketDetails.messages,
        {
          id: "message-2",
          body: "Thanks, I reset the course enrollment state for your account.",
          createdAt: "2026-07-03T10:05:00.000Z",
          direction: "outbound",
          externalId: null,
          senderEmail: "admin@example.com"
        }
      ]
    });
    vi.mocked(polishTicketReply).mockReset();
    vi.mocked(polishTicketReply).mockResolvedValue(
      "Thanks for reaching out. I reset the course enrollment state for your account, so please try opening the dashboard again."
    );
    vi.mocked(summarizeTicketConversation).mockReset();
    vi.mocked(summarizeTicketConversation).mockResolvedValue(
      "The student cannot access the course dashboard after resetting their password. No support action has been logged yet."
    );
    vi.mocked(getTicket).mockReset();
    vi.mocked(getTicket).mockResolvedValue(ticketDetails);
    vi.mocked(listAssignableAgents).mockReset();
    vi.mocked(listAssignableAgents).mockResolvedValue([
      {
        id: "agent-1",
        name: "Agent User",
        email: "agent@example.com",
        role: "agent",
        isActive: true
      }
    ]);
    vi.mocked(listTickets).mockReset();
    vi.mocked(listTickets).mockImplementation((filters?: TicketFilters) =>
      Promise.resolve(filterTickets(filters))
    );
  });

  test("dashboard has navbar access and clickable filtered scorecards", async () => {
    const user = userEvent.setup();

    renderAppAt("/");

    expect(await screen.findByRole("heading", { name: "Ticket Dashboard" })).toBeVisible();
    expect(screen.getByRole("link", { name: /^Tickets$/ })).toHaveAttribute(
      "href",
      "/tickets"
    );
    expect(await screen.findByRole("link", { name: /Total Tickets/ })).toHaveAttribute(
      "href",
      "/tickets"
    );
    expect(screen.getByRole("link", { name: /Open/ })).toHaveAttribute(
      "href",
      `/tickets?status=${TicketStatusValue.Open}`
    );
    expect(screen.getByRole("link", { name: /Resolved/ })).toHaveAttribute(
      "href",
      `/tickets?status=${TicketStatusValue.Resolved}`
    );
    expect(screen.getByRole("link", { name: /Resolved by AI/ })).toHaveTextContent("1");
    expect(screen.getByRole("link", { name: /AI Resolution Rate/ })).toHaveTextContent("100%");
    expect(screen.getByRole("link", { name: /Avg Resolution Time/ })).toHaveTextContent("1d 1h");
    expect(
      screen.getByRole("img", {
        name: "Total number of tickets per day over the past 30 days"
      })
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Switch to dark view" }));
    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByRole("button", { name: "Switch to light view" })).toBeVisible();
    expect(screen.queryByText("View tickets")).not.toBeInTheDocument();
  });

  test("tickets page renders returned tickets in newest-first order", async () => {
    renderAppAt("/tickets");

    expect(await screen.findByRole("heading", { name: "Ticket Queue" })).toBeVisible();
    expect(screen.getByText(/Newest first/)).toBeVisible();

    const ticketRows = await screen.findAllByRole("article");
    expect(ticketRows).toHaveLength(3);
    expect(ticketRows[0]).toHaveTextContent("Cannot access my course");
    expect(ticketRows[1]).toHaveTextContent("Refund request for course purchase");
    expect(ticketRows[2]).toHaveTextContent("Certificate name is incorrect");
  });

  test("ticket list can be sorted by subject", async () => {
    const user = userEvent.setup();
    renderAppAt("/tickets");

    expect(await screen.findByText("Cannot access my course")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Sort by Subject" }));

    const ticketRows = await screen.findAllByRole("article");
    expect(ticketRows[0]).toHaveTextContent("Cannot access my course");
    expect(ticketRows[1]).toHaveTextContent("Certificate name is incorrect");
    expect(ticketRows[2]).toHaveTextContent("Refund request for course purchase");
  });

  test("ticket list can be searched by subject and from email", async () => {
    const user = userEvent.setup();
    renderAppAt("/tickets");

    await screen.findByText("Cannot access my course");
    await user.type(screen.getByLabelText("Search"), "billing");

    const ticketRows = await screen.findAllByRole("article");
    expect(ticketRows).toHaveLength(1);
    expect(ticketRows[0]).toHaveTextContent("Refund request for course purchase");
  });

  test("clicking a ticket subject opens the ticket details page", async () => {
    const user = userEvent.setup();
    renderAppAt("/tickets");

    await user.click(await screen.findByRole("link", { name: "Cannot access my course" }));

    expect(await screen.findByRole("heading", { name: "Ticket Details" })).toBeVisible();
    expect(screen.getAllByText("student.access@example.com").length).toBeGreaterThan(0);
    expect(screen.getByText(/course dashboard after resetting/)).toBeVisible();
    expect(vi.mocked(getTicket)).toHaveBeenCalledWith("ticket-newest");
  });

  test("ticket details can assign a ticket to an agent", async () => {
    const user = userEvent.setup();
    renderAppAt("/tickets/ticket-newest");

    expect(await screen.findByRole("heading", { name: "Ticket Details" })).toBeVisible();
    await user.click(await screen.findByLabelText("Assigned to"));
    await user.click(await screen.findByRole("option", { name: "Agent User" }));

    await waitFor(() => {
      expect(vi.mocked(updateTicket)).toHaveBeenCalledWith("ticket-newest", {
        assignedToId: "agent-1"
      });
    });
  });

  test("ticket details can update status and category", async () => {
    const user = userEvent.setup();
    renderAppAt("/tickets/ticket-newest");

    expect(await screen.findByRole("heading", { name: "Ticket Details" })).toBeVisible();
    await user.click(await screen.findByLabelText("Status"));
    await user.click(await screen.findByRole("option", { name: "Resolved" }));

    await waitFor(() => {
      expect(vi.mocked(updateTicket)).toHaveBeenCalledWith("ticket-newest", {
        status: TicketStatusValue.Resolved
      });
    });

    await user.click(await screen.findByLabelText("Category"));
    await user.click(await screen.findByRole("option", { name: "Refund request" }));

    await waitFor(() => {
      expect(vi.mocked(updateTicket)).toHaveBeenCalledWith("ticket-newest", {
        category: TicketCategoryValue.RefundRequest
      });
    });
  });

  test("ticket details can send a support reply", async () => {
    const user = userEvent.setup();
    renderAppAt("/tickets/ticket-newest");

    expect(await screen.findByRole("heading", { name: "Ticket Details" })).toBeVisible();
    await user.type(
      await screen.findByLabelText("Reply"),
      "Thanks, I reset the course enrollment state for your account."
    );
    await user.click(screen.getByRole("button", { name: "Send reply" }));

    await waitFor(() => {
      expect(vi.mocked(replyToTicket)).toHaveBeenCalledWith(
        "ticket-newest",
        "Thanks, I reset the course enrollment state for your account."
      );
    });
  });

  test("ticket details can polish a support reply before sending", async () => {
    const user = userEvent.setup();
    renderAppAt("/tickets/ticket-newest");

    expect(await screen.findByRole("heading", { name: "Ticket Details" })).toBeVisible();
    const replyInput = await screen.findByLabelText("Reply");
    await user.type(replyInput, "fixed it try again");
    await user.click(screen.getByRole("button", { name: "Polish" }));

    await waitFor(() => {
      expect(vi.mocked(polishTicketReply)).toHaveBeenCalledWith(
        "ticket-newest",
        "fixed it try again"
      );
    });
    expect(replyInput).toHaveValue(
      "Thanks for reaching out. I reset the course enrollment state for your account, so please try opening the dashboard again."
    );
  });

  test("ticket details can summarize the conversation", async () => {
    const user = userEvent.setup();
    renderAppAt("/tickets/ticket-newest");

    expect(await screen.findByRole("heading", { name: "Ticket Details" })).toBeVisible();
    await user.click(await screen.findByRole("button", { name: "Summarize" }));

    await waitFor(() => {
      expect(vi.mocked(summarizeTicketConversation)).toHaveBeenCalledWith(
        "ticket-newest"
      );
    });
    expect(await screen.findByLabelText("Ticket summary")).toHaveTextContent(
      "The student cannot access the course dashboard after resetting their password."
    );
  });

  test("ticket list paginates longer result sets", async () => {
    const user = userEvent.setup();
    vi.mocked(listTickets).mockResolvedValue(Array.from({ length: 12 }, (_, index) =>
      createTicket(index + 1)
    ));

    renderAppAt("/tickets");

    expect(await screen.findByText("Showing 1-10 of 12 tickets")).toBeVisible();
    expect(screen.getByText("Generated ticket 01")).toBeVisible();
    expect(screen.queryByText("Generated ticket 11")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next tickets page" }));

    expect(await screen.findByText("Showing 11-12 of 12 tickets")).toBeVisible();
    expect(screen.getByText("Generated ticket 11")).toBeVisible();
    expect(screen.getByText("Generated ticket 12")).toBeVisible();
  });

  test("status filter narrows the ticket list", async () => {
    const user = userEvent.setup();
    renderAppAt("/tickets");

    await screen.findByText("Cannot access my course");
    await user.click(screen.getByLabelText("Status"));
    await user.click(await screen.findByRole("option", { name: "Resolved" }));

    await waitFor(() => {
      expect(vi.mocked(listTickets)).toHaveBeenLastCalledWith({
        category: "all",
        status: TicketStatusValue.Resolved
      });
    });
    const ticketRows = await screen.findAllByRole("article");
    expect(ticketRows).toHaveLength(1);
    expect(within(ticketRows[0]).getByText("Refund request for course purchase")).toBeVisible();
  });

  test("category filter narrows the ticket list", async () => {
    const user = userEvent.setup();
    renderAppAt("/tickets");

    await screen.findByText("Cannot access my course");
    await user.click(screen.getByLabelText("Category"));
    await user.click(await screen.findByRole("option", { name: "Refund request" }));

    await waitFor(() => {
      expect(vi.mocked(listTickets)).toHaveBeenLastCalledWith({
        category: TicketCategoryValue.RefundRequest,
        status: "all"
      });
    });
    const ticketRows = await screen.findAllByRole("article");
    expect(ticketRows).toHaveLength(1);
    expect(within(ticketRows[0]).getByText("Refund request for course purchase")).toBeVisible();
  });
});
