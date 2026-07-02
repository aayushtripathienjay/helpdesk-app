# Project Memory

## Project

This is an AI-powered ticket management system for handling student support emails.

The product should help support agents receive, classify, summarize, respond to, and manage tickets faster while keeping responses human-friendly.

## Scope

Core features:

- Receive support emails and create tickets
- Ticket list with filtering and sorting
- Ticket detail view
- AI-powered ticket classification
- AI summaries
- AI-suggested replies
- Knowledge-base-assisted response generation
- Admin-only user management
- Dashboard for viewing and managing tickets

Ticket statuses:

- Open
- Resolved
- Closed

Ticket categories:

- General question
- Technical question
- Refund request

Users and roles:

- The app is deployed with an initial admin user
- Admins can create additional agent users
- Agents manage tickets

## Tech Stack

- Bun workspaces
- React, TypeScript, Vite, Tailwind CSS
- React Router
- Axios for frontend HTTP calls
- TanStack Query for frontend server-state fetching, caching, and mutations
- Node.js, Express, TypeScript
- PostgreSQL
- Prisma
- Database-backed sessions for authentication
- Codex/OpenAI API or Claude API for AI features
- SendGrid or Mailgun for email
- Docker for local PostgreSQL

## Current App Structure

- `apps/web` - React/Vite frontend
- `apps/api` - Express API
- `apps/api/prisma/schema.prisma` - database schema
- `project-scope.md` - product scope
- `tech-stack.md` - chosen stack
- `implementation-plan.md` - phased implementation plan

## Local Development

Use Bun as the package manager.

Common commands:

- `bun install`
- `bun run dev`
- `bun run dev:api`
- `bun run dev:web`
- `bun run typecheck`
- `bun --filter @helpdesk/api db:generate`
- `bun --filter @helpdesk/api db:migrate`

Local services:

- API: `http://localhost:3000`
- Web: `http://localhost:5173`
- API health: `http://localhost:3000/api/health`

Manual restart flow:

- From the project root, run `docker compose up -d` to ensure PostgreSQL is running.
- Start the API with `bun run dev:api`.
- Start the web app with `bun run dev:web`.
- Alternatively, start both with `bun run dev`.
- If `bun` is not found, run `export PATH=/home/enjay/.bun/bin:$PATH`.
- If Node version problems appear, run `nvm use 22`.
- Vite may choose a fallback URL such as `http://127.0.0.1:5176` when `5173` is busy. Use the exact URL printed by Vite.
- If auth fails on a new frontend port, add that exact origin to `WEB_ORIGIN`, `WEB_ORIGINS`, or `apps/api/src/config.ts`.

## Authentication

The app uses Better Auth with email/password sign-in and Prisma-backed
database sessions.

Important files:

- `apps/api/src/auth.ts` - Better Auth server config
- `apps/api/src/config.ts` - allowed frontend origins for CORS and Better Auth
- `apps/web/src/api/auth.ts` - Better Auth React client
- `apps/api/src/scripts/seed-admin.ts` - initial admin seed script

Auth behavior:

- Public email/password sign-up is disabled.
- The initial admin user is seeded from `.env`.
- The seed script rejects known weak bootstrap passwords by default.
- Use `ALLOW_INSECURE_BOOTSTRAP_PASSWORD=true` only for local throwaway development.
- Better Auth is mounted under `/api/auth`.
- The frontend uses `window.location.origin` with `basePath: "/api/auth"`, so local browser auth calls go through the Vite proxy.
- Sessions are stored in the database and sent via the `better-auth.session_token` cookie.

Local auth endpoints:

- API auth health: `http://localhost:3000/api/auth/ok`
- Vite-proxied auth health: `http://localhost:5173/api/auth/ok`
- Current session: `/api/auth/get-session`
- Email sign-in: `/api/auth/sign-in/email`

Trusted local frontend origins:

- `http://localhost:5173`
- `http://localhost:5174`
- `http://127.0.0.1:5176`

When running the web app on a different host or port, add that exact origin to
`WEB_ORIGIN`, `WEB_ORIGINS`, or the local dev origins in `apps/api/src/config.ts`.
If it is missing, Better Auth rejects browser sign-in with `Invalid origin`.

## Frontend API And Server State

- Use `axios` for frontend HTTP requests from `apps/web/src/api/*`.
- Use TanStack Query (`useQuery`, `useMutation`, and query invalidation) for server state in React components.
- Do not add component-level `useEffect` fetch flows for API data when the data can be represented as a query.
- After create, update, or delete actions, invalidate the related query key instead of manually re-fetching and storing duplicate local state.
- Keep Better Auth session handling on the Better Auth client hooks unless the auth flow itself needs a dedicated API helper.

## Documentation Rule

Use Context7 to fetch up-to-date documentation before making framework, library, or API decisions.

Use Context7 especially for:

- Bun
- React
- Vite
- Express
- Prisma
- Tailwind CSS
- React Router
- OpenAI/Codex APIs
- Claude/Anthropic APIs
- SendGrid or Mailgun

If Context7 is unavailable, say so clearly and fall back to official documentation.
