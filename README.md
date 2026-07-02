# Helpdesk

AI-powered ticket management system for support teams.

## Stack

- Bun workspaces
- React, TypeScript, Vite, Tailwind CSS
- Express and TypeScript API
- PostgreSQL and Prisma planned for persistence
- Database-backed sessions planned for authentication

## Getting Started

Install Bun, then install dependencies:

```sh
bun install
```

Copy the environment file:

```sh
cp .env.example .env
```

Start Postgres:

```sh
docker compose up -d
```

Generate the Prisma client and run migrations:

```sh
bun --filter @helpdesk/api db:generate
bun --filter @helpdesk/api db:migrate
```

Start both apps:

```sh
bun run dev
```

Or start them separately:

```sh
bun run dev:api
bun run dev:web
```

The API runs on `http://localhost:3000`.
The web app runs on `http://localhost:5173`.
