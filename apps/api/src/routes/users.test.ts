import { beforeEach, expect, mock, test } from "bun:test";
import { UserRole } from "@prisma/client";

const getSession = mock(async () => ({
  user: {
    id: "admin-1",
    isActive: true,
    role: UserRole.admin
  }
}));

const transactionMock = {
  account: {
    create: mock(async () => undefined),
    findFirst: mock(async (): Promise<unknown> => null),
    update: mock(async () => undefined)
  },
  session: {
    deleteMany: mock(async () => ({ count: 1 }))
  },
  user: {
    findFirst: mock(async (): Promise<unknown> => null),
    update: mock(async (): Promise<unknown> => null)
  }
};

const prismaMock = {
  account: {
    create: mock(async () => undefined),
    findFirst: mock(async (): Promise<unknown> => null),
    update: mock(async () => undefined)
  },
  session: {
    deleteMany: mock(async () => ({ count: 1 }))
  },
  user: {
    create: mock(async (): Promise<unknown> => null),
    findMany: mock(async () => []),
    update: mock(async (): Promise<unknown> => null)
  },
  $transaction: mock(async (callback: (transaction: typeof transactionMock) => unknown) =>
    callback(transactionMock)
  )
};

mock.module("../auth", () => ({
  auth: {
    api: {
      getSession
    }
  }
}));

mock.module("../db/prisma", () => ({
  prisma: prismaMock
}));

const { usersRouter } = await import("./users");
const router = usersRouter as unknown as {
  handle: (
    request: unknown,
    response: unknown,
    next: (error?: unknown) => void
  ) => void;
};

beforeEach(() => {
  getSession.mockClear();
  prismaMock.$transaction.mockClear();
  prismaMock.account.create.mockClear();
  prismaMock.account.findFirst.mockClear();
  prismaMock.account.update.mockClear();
  prismaMock.user.create.mockClear();
  prismaMock.user.findMany.mockClear();
  prismaMock.user.update.mockClear();
  transactionMock.session.deleteMany.mockClear();
  transactionMock.user.findFirst.mockClear();
  transactionMock.user.update.mockClear();
});

type ApiResponse = {
  body: unknown;
  status: number;
};

async function apiRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>
) {
  return new Promise<ApiResponse>((resolve, reject) => {
    const routerPath = path.replace(/^\/api\/users/, "") || "/";
    const request = {
      body,
      headers: {},
      method,
      originalUrl: routerPath,
      url: routerPath
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

test("lists only non-deleted users", async () => {
  prismaMock.user.findMany.mockResolvedValueOnce([]);

  const response = await apiRequest("GET", "/api/users");

  expect(response.status).toBe(200);
  expect(prismaMock.user.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { deletedAt: null }
    })
  );
});

test("deactivating a user sets isActive false and clears sessions", async () => {
  transactionMock.user.findFirst.mockResolvedValueOnce({ id: "agent-1" });
  transactionMock.user.update.mockResolvedValueOnce({
    id: "agent-1",
    email: "agent@example.com",
    isActive: false,
    role: UserRole.agent
  });

  const response = await apiRequest("PATCH", "/api/users/agent-1", {
    isActive: false
  });

  expect(response.status).toBe(200);
  expect(transactionMock.user.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: { isActive: false },
      where: { id: "agent-1" }
    })
  );
  expect(transactionMock.session.deleteMany).toHaveBeenCalledWith({
    where: { userId: "agent-1" }
  });
});

test("deleting an agent soft deletes the user and clears sessions", async () => {
  transactionMock.user.findFirst.mockResolvedValueOnce({
    id: "agent-1",
    email: "agent@example.com",
    role: UserRole.agent
  });
  transactionMock.user.update.mockResolvedValueOnce({
    id: "agent-1",
    email: "deleted-agent-1@deleted.local",
    isActive: false,
    role: UserRole.agent
  });

  const response = await apiRequest("DELETE", "/api/users/agent-1");

  expect(response.status).toBe(200);
  expect(transactionMock.user.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
        deletedEmail: "agent@example.com",
        email: "deleted-agent-1@deleted.local",
        isActive: false
      }),
      where: { id: "agent-1" }
    })
  );
  expect(transactionMock.session.deleteMany).toHaveBeenCalledWith({
    where: { userId: "agent-1" }
  });
});

test("deleting an admin is rejected", async () => {
  transactionMock.user.findFirst.mockResolvedValueOnce({
    id: "admin-2",
    email: "admin2@example.com",
    role: UserRole.admin
  });

  const response = await apiRequest("DELETE", "/api/users/admin-2");

  expect(response.body).toEqual({
    error: "Admin users cannot be deleted"
  });
  expect(response.status).toBe(400);
  expect(transactionMock.user.update).not.toHaveBeenCalled();
  expect(transactionMock.session.deleteMany).not.toHaveBeenCalled();
});

test("creating a user with a deleted user's original email succeeds", async () => {
  prismaMock.user.create.mockResolvedValueOnce({
    id: "agent-2",
    name: "New Agent",
    email: "agent@example.com",
    emailVerified: true,
    role: UserRole.agent,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const response = await apiRequest("POST", "/api/users", {
    email: "agent@example.com",
    name: "New Agent",
    password: "password@123",
    role: "agent"
  });

  expect(response.status).toBe(201);
  expect(prismaMock.user.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        email: "agent@example.com"
      })
    })
  );
  expect(prismaMock.account.create).toHaveBeenCalled();
});
