import { beforeEach, expect, mock, test } from "bun:test";
import { TicketCategory, TicketStatus } from "@prisma/client";

const prismaMock = {
  ticket: {
    findMany: mock(async () => []),
    findUnique: mock(async () => null),
    create: mock(async () => null)
  },
  ticketMessage: {
    findUnique: mock(async () => null)
  }
};

mock.module("../db/prisma", () => ({
  prisma: prismaMock
}));

const { ticketsRouter } = await import("./tickets");
const router = ticketsRouter as unknown as {
  handle: (
    request: unknown,
    response: unknown,
    next: (error?: unknown) => void
  ) => void;
};

beforeEach(() => {
  prismaMock.ticket.findMany.mockClear();
  prismaMock.ticket.findUnique.mockClear();
  prismaMock.ticket.create.mockClear();
  prismaMock.ticketMessage.findUnique.mockClear();
});

type ApiResponse = {
  body: unknown;
  status: number;
};

async function apiRequest(path: string) {
  return new Promise<ApiResponse>((resolve, reject) => {
    const url = new URL(path, "http://localhost");
    const request = {
      body: undefined,
      headers: {},
      method: "GET",
      originalUrl: url.pathname + url.search,
      params: {},
      query: Object.fromEntries(url.searchParams.entries()),
      url: url.pathname + url.search
    };
    const response = {
      statusCode: 200,
      getHeader: () => undefined,
      setHeader: () => response,
      status(code: number) {
        response.statusCode = code;
        return response;
      },
      json(payload: unknown) {
        resolve({
          body: payload,
          status: response.statusCode
        });
        return response;
      }
    };

    router.handle(request, response, (error: unknown) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        body: undefined,
        status: response.statusCode
      });
    });
  });
}

test("filters tickets by status query", async () => {
  await apiRequest(`/?status=${TicketStatus.resolved}`);

  expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { status: TicketStatus.resolved }
    })
  );
});

test("filters tickets by category query", async () => {
  await apiRequest(`/?category=${TicketCategory.refund_request}`);

  expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { category: TicketCategory.refund_request }
    })
  );
});

test("filters tickets by AI resolution query", async () => {
  await apiRequest("/?status=resolved&aiResolved=true");

  expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        aiSuggestions: {
          some: {
            summary: {
              startsWith: "Auto-resolved using KB article:"
            }
          }
        },
        status: TicketStatus.resolved
      }
    })
  );
});

test("ignores unknown ticket filter values", async () => {
  await apiRequest("/?status=waiting&category=unknown");

  expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {}
    })
  );
});
