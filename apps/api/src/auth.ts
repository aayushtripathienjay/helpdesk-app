import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { UserRole } from "@prisma/client";
import { config } from "./config";
import { prisma } from "./db/prisma";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.SESSION_SECRET,
  trustedOrigins: config.webOrigins,
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  rateLimit: {
    enabled: config.isProduction
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: UserRole.agent,
        input: false
      },
      isActive: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: false
      }
    }
  }
});
