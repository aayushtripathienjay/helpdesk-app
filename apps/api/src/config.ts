import "dotenv/config";

const localWebOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5176"
];

function parseOrigins(value: string | undefined) {
  return value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const configuredWebOrigins = [
  process.env.WEB_ORIGIN,
  ...(parseOrigins(process.env.WEB_ORIGINS) ?? [])
].filter(Boolean) as string[];

const isProduction = process.env.NODE_ENV === "production";

export const config = {
  inboundEmailToken:
    process.env.INBOUND_EMAIL_TOKEN ??
    (isProduction ? undefined : "dev-inbound-email-token"),
  isProduction,
  port: Number(process.env.API_PORT ?? 3000),
  supportEmail: process.env.SUPPORT_EMAIL ?? "support@example.com",
  webOrigins: Array.from(
    new Set([
      ...configuredWebOrigins,
      ...(isProduction ? [] : localWebOrigins)
    ])
  )
};
