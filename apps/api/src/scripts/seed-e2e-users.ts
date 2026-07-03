import { hashPassword } from "better-auth/crypto";
import { UserRole, type User } from "@prisma/client";
import { prisma } from "../db/prisma";
import { seedSampleTickets } from "./sample-tickets";

type SeedUserInput = {
  email: string;
  name: string;
  password: string;
  role: UserRole;
};

async function upsertCredentialAccount(user: User, password: string) {
  const passwordHash = await hashPassword(password);
  const existingCredentialAccount = await prisma.account.findFirst({
    where: {
      userId: user.id,
      providerId: "credential"
    }
  });

  if (existingCredentialAccount) {
    await prisma.account.update({
      where: { id: existingCredentialAccount.id },
      data: {
        accountId: user.id,
        password: passwordHash
      }
    });
    return;
  }

  await prisma.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: passwordHash
    }
  });
}

async function seedUser(input: SeedUserInput) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    create: {
      email: input.email,
      name: input.name,
      emailVerified: true,
      role: input.role,
      isActive: true
    },
    update: {
      name: input.name,
      emailVerified: true,
      role: input.role,
      isActive: true
    }
  });

  await upsertCredentialAccount(user, input.password);
}

const testDatabaseUrl = process.env.DATABASE_URL;

if (!testDatabaseUrl?.includes("helpdesk_test")) {
  console.error(
    "Refusing to seed e2e users because DATABASE_URL does not point to helpdesk_test."
  );
  process.exit(1);
}

await seedUser({
  email: process.env.ADMIN_EMAIL ?? "admin@example.com",
  name: process.env.ADMIN_NAME ?? "Admin",
  password: process.env.ADMIN_PASSWORD ?? "test-admin-password-123",
  role: UserRole.admin
});

await seedUser({
  email: process.env.AGENT_EMAIL ?? "agent@example.com",
  name: process.env.AGENT_NAME ?? "Agent",
  password: process.env.AGENT_PASSWORD ?? "test-agent-password-123",
  role: UserRole.agent
});

await seedSampleTickets();
await prisma.$disconnect();

console.log("Seeded e2e admin, agent, and sample tickets.");
