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

Seed the initial admin user from `.env`:

```sh
bun --filter @helpdesk/api db:seed
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

## Auth Checks

Public email/password sign-up is disabled. Users should be created intentionally, starting with the seeded admin user.

Check that Better Auth is mounted:

```sh
curl http://localhost:3000/api/auth/ok
```

Check that public sign-up is blocked:

```sh
curl -i -H 'Content-Type: application/json' \
  -X POST http://localhost:3000/api/auth/sign-up/email \
  -d '{"email":"blocked@example.com","password":"password123","name":"Blocked"}'
```

Sign in as the seeded admin and save the session cookie:

```sh
curl -i -c /tmp/helpdesk-admin-cookies.txt \
  -H 'Content-Type: application/json' \
  -X POST http://localhost:3000/api/auth/sign-in/email \
  -d '{"email":"admin@example.com","password":"password123"}'
```

Check the current session:

```sh
curl -b /tmp/helpdesk-admin-cookies.txt http://localhost:3000/api/me
```
