import "dotenv/config";

export const config = {
  port: Number(process.env.API_PORT ?? 3000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173"
};
