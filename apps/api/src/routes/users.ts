import { Router, type RequestHandler } from "express";
import { hashPassword } from "better-auth/crypto";
import { fromNodeHeaders } from "better-auth/node";
import { Prisma, UserRole } from "@prisma/client";
import { auth } from "../auth";
import { prisma } from "../db/prisma";

export const usersRouter = Router();
export const userRoutes = Router();

const userSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

const credentialProviderId = "credential";

const requireAdmin: RequestHandler = async (request, response, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers)
  });

  if (!session) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }

  if (session.user.isActive === false) {
    response.status(403).json({ error: "User account is inactive" });
    return;
  }

  if (session.user.role !== UserRole.admin) {
    response.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" ? value.trim() : undefined;
}

function readBoolean(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "boolean" ? value : undefined;
}

function readRole(body: Record<string, unknown>) {
  const role = readString(body, "role");

  if (role === UserRole.admin || role === UserRole.agent) {
    return role;
  }

  return undefined;
}

async function upsertCredentialAccount(userId: string, password: string) {
  const passwordHash = await hashPassword(password);
  const existingCredentialAccount = await prisma.account.findFirst({
    where: {
      userId,
      providerId: credentialProviderId
    }
  });

  if (existingCredentialAccount) {
    await prisma.account.update({
      where: { id: existingCredentialAccount.id },
      data: {
        accountId: userId,
        password: passwordHash
      }
    });
    return;
  }

  await prisma.account.create({
    data: {
      userId,
      accountId: userId,
      providerId: credentialProviderId,
      password: passwordHash
    }
  });
}

usersRouter.use(requireAdmin);

usersRouter.get("/", async (_request, response) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: userSelect
  });

  response.json({ data: users });
});

usersRouter.post("/", async (request, response) => {
  if (!isObject(request.body)) {
    response.status(400).json({ error: "Request body is required" });
    return;
  }

  const name = readString(request.body, "name");
  const email = readString(request.body, "email")?.toLowerCase();
  const password = readString(request.body, "password");
  const role = readRole(request.body) ?? UserRole.agent;

  if (!name || !email || !password) {
    response.status(400).json({ error: "Name, email, and password are required" });
    return;
  }

  if (password.length < 8) {
    response.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        emailVerified: true,
        role,
        isActive: true
      },
      select: userSelect
    });

    await upsertCredentialAccount(user.id, password);

    response.status(201).json({ data: user });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      response.status(409).json({
        error: "Email already exists",
        field: "email"
      });
      return;
    }

    throw error;
  }
});

usersRouter.patch("/:userId", async (request, response) => {
  if (!isObject(request.body)) {
    response.status(400).json({ error: "Request body is required" });
    return;
  }

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers)
  });
  const userId = request.params.userId;
  const name = readString(request.body, "name");
  const email = readString(request.body, "email")?.toLowerCase();
  const role = readRole(request.body);
  const isActive = readBoolean(request.body, "isActive");
  const password = readString(request.body, "password");

  if (password !== undefined && password.length > 0 && password.length < 8) {
    response.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  if (session?.user.id === userId && isActive === false) {
    response.status(400).json({ error: "You cannot deactivate your own account" });
    return;
  }

  const data: Prisma.UserUpdateInput = {};

  if (name !== undefined) {
    data.name = name;
  }

  if (email !== undefined) {
    data.email = email;
  }

  if (role !== undefined) {
    data.role = role;
  }

  if (isActive !== undefined) {
    data.isActive = isActive;
  }

  try {
    const user = await prisma.$transaction(async (transaction) => {
      const existingUser = await transaction.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: { id: true }
      });

      if (!existingUser) {
        return null;
      }

      const updatedUser = await transaction.user.update({
        where: { id: userId },
        data,
        select: userSelect
      });

      if (isActive === false) {
        await transaction.session.deleteMany({
          where: { userId }
        });
      }

      return updatedUser;
    });

    if (!user) {
      response.status(404).json({ error: "User not found" });
      return;
    }

    if (password) {
      await upsertCredentialAccount(user.id, password);
    }

    response.json({ data: user });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      response.status(404).json({ error: "User not found" });
      return;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      response.status(409).json({
        error: "Email already exists",
        field: "email"
      });
      return;
    }

    throw error;
  }
});

usersRouter.delete("/:userId", async (request, response) => {
  const userId = request.params.userId;

  try {
    const user = await prisma.$transaction(async (transaction) => {
      const existingUser = await transaction.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: {
          id: true,
          email: true,
          role: true
        }
      });

      if (!existingUser) {
        return null;
      }

      if (existingUser.role === UserRole.admin) {
        return "admin";
      }

      const deletedUser = await transaction.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          deletedEmail: existingUser.email,
          email: `deleted-${existingUser.id}@deleted.local`,
          isActive: false
        },
        select: userSelect
      });

      await transaction.session.deleteMany({
        where: { userId }
      });

      return deletedUser;
    });

    if (!user) {
      response.status(404).json({ error: "User not found" });
      return;
    }

    if (user === "admin") {
      response.status(400).json({ error: "Admin users cannot be deleted" });
      return;
    }

    response.json({ data: user });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      response.status(404).json({ error: "User not found" });
      return;
    }

    throw error;
  }
});

userRoutes.use("/users", usersRouter);
userRoutes.use("/api/users", usersRouter);

userRoutes.get("/api/me", async (request, response) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers)
  });

  response.json({ data: session });
});
