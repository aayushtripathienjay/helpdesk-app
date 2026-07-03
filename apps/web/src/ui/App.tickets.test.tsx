import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { App } from "./App";
import {
  listTickets,
  TicketCategoryValue,
  TicketStatusValue,
  type Ticket,
  type TicketFilters
} from "../api/tickets";
import { renderWithQuery } from "../test/render-with-query";

const mocks = vi.hoisted(() => ({
  listTickets: vi.fn(),
  signOut: vi.fn()
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
    listTickets: mocks.listTickets,
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
    TicketStatusValue
  };
});

const tickets: Ticket[] = [
  {
    id: "ticket-newest",
    subject: "Cannot access my course",
    requesterEmail: "student.access@example.com",
    status: TicketStatusValue.Open,
    category: TicketCategoryValue.TechnicalQuestion,
    createdAt: "2026-07-03T10:00:00.000Z",
    updatedAt: "2026-07-03T10:00:00.000Z"
  },
  {
    id: "ticket-middle",
    subject: "Refund request for course purchase",
    requesterEmail: "billing.student@example.com",
    status: TicketStatusValue.Resolved,
    category: TicketCategoryValue.RefundRequest,
    createdAt: "2026-07-03T09:00:00.000Z",
    updatedAt: "2026-07-03T09:00:00.000Z"
  },
  {
    id: "ticket-oldest",
    subject: "Certificate name is incorrect",
    requesterEmail: "certificate.student@example.com",
    status: TicketStatusValue.Open,
    category: TicketCategoryValue.GeneralQuestion,
    createdAt: "2026-07-03T08:00:00.000Z",
    updatedAt: "2026-07-03T08:00:00.000Z"
  }
];

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
    vi.mocked(listTickets).mockReset();
    vi.mocked(listTickets).mockImplementation((filters?: TicketFilters) =>
      Promise.resolve(filterTickets(filters))
    );
  });

  test("dashboard has navbar access and clickable filtered scorecards", async () => {
    renderAppAt("/");

    expect(await screen.findByRole("heading", { name: "Ticket Dashboard" })).toBeVisible();
    expect(screen.getByRole("link", { name: /^Tickets$/ })).toHaveAttribute(
      "href",
      "/tickets"
    );
    expect(await screen.findByRole("link", { name: /Total tickets/ })).toHaveAttribute(
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
