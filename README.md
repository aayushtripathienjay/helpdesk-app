# Helpdesk

AI-powered ticket management system for support teams.

## Stack

- Bun workspaces
- React, TypeScript, Vite, Tailwind CSS
- Express and TypeScript API
- PostgreSQL and Prisma for persistence
- Better Auth with email/password and database-backed sessions
- Docker Compose for local PostgreSQL

## App Structure

- `apps/web` - React/Vite frontend
- `apps/api` - Express API
- `apps/api/prisma/schema.prisma` - Prisma schema
- `apps/api/prisma/migrations` - database migrations
- `apps/api/src/auth.ts` - Better Auth configuration
- `apps/web/src/api/auth.ts` - Better Auth frontend client

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

Use a strong `ADMIN_PASSWORD`. Known example passwords such as `password123`
are rejected by default. For local-only throwaway development, you can set
`ALLOW_INSECURE_BOOTSTRAP_PASSWORD=true`, but do not use that in shared or
deployed environments.

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

## Manually Restarting the App

If the app stops, start it again from the project root:

```sh
cd /var/www/mosh-code/helpdesk
docker compose up -d
```

Use two terminals for the app servers:

```sh
bun run dev:api
```

```sh
bun run dev:web
```

Or run both together:

```sh
bun run dev
```

If `bun` is not found, add Bun to your shell path:

```sh
export PATH=/home/enjay/.bun/bin:$PATH
```

If Node version issues appear, switch to Node 22:

```sh
nvm use 22
```

Vite normally starts the web app on `http://localhost:5173`, but if that port is busy it may choose another port such as `http://127.0.0.1:5176`. Open the URL printed by Vite in the terminal.

If browser auth fails on a new frontend port, add that exact origin to `WEB_ORIGIN`, `WEB_ORIGINS`, or the local dev origins in `apps/api/src/config.ts`.

## Environment Variables

The main local variables are defined in `.env.example`:

- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Better Auth secret
- `BETTER_AUTH_URL` - API base URL for Better Auth
- `ADMIN_EMAIL` - seeded admin email
- `ADMIN_PASSWORD` - seeded admin password
- `ALLOW_INSECURE_BOOTSTRAP_PASSWORD` - optional local-only override for weak seed passwords
- `ADMIN_NAME` - seeded admin name
- `API_PORT` - Express API port
- `WEB_ORIGIN` - allowed frontend origin
- `WEB_ORIGINS` - optional comma-separated allowed frontend origins

## Database

Local PostgreSQL runs in Docker and is exposed on `localhost:5432`.

Use these settings in DataGrip or another database client:

```txt
Host: localhost
Port: 5432
Database: helpdesk
User: helpdesk
Password: helpdesk
```

The app tables are under the `helpdesk` database, `public` schema:

- `User`
- `Account`
- `Session`
- `Verification`
- `Ticket`
- `TicketMessage`
- `AiSuggestion`

User roles are stored in the `User.role` column using the Prisma `UserRole` enum.

Useful query:

```sql
SELECT id, email, name, role, "emailVerified", "isActive", "createdAt"
FROM public."User";
```

## Migrations

The project currently has:

- Initial schema migration
- Better Auth migration for `User`, `Account`, `Session`, and `Verification`

Run migrations with:

```sh
bun --filter @helpdesk/api db:migrate
```

## Auth Checks

Public email/password sign-up is disabled. Users should be created intentionally, starting with the seeded admin user. The seeded admin credentials come from `.env`.

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
