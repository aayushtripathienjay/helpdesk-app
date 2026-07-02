import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { UserRole } from "@prisma/client";
import { prisma } from "../db/prisma";

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminName = process.env.ADMIN_NAME ?? "Admin";

if (!adminEmail || !adminPassword) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set.");
  process.exit(1);
}

if (adminPassword.length < 8) {
  console.error("ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const passwordHash = await hashPassword(adminPassword);

const user = await prisma.user.upsert({
  where: { email: adminEmail },
  create: {
    email: adminEmail,
    name: adminName,
    emailVerified: true,
    role: UserRole.admin,
    isActive: true
  },
  update: {
    name: adminName,
    emailVerified: true,
    role: UserRole.admin,
    isActive: true
  }
});

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
} else {
  await prisma.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: passwordHash
    }
  });
}

await prisma.$disconnect();

console.log(`Seeded admin user: ${adminEmail}`);
