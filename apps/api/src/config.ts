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

export const config = {
  port: Number(process.env.API_PORT ?? 3000),
  webOrigins: Array.from(
    new Set([
      ...configuredWebOrigins,
      ...(process.env.NODE_ENV === "production" ? [] : localWebOrigins)
    ])
  )
};
