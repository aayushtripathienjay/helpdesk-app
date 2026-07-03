# Project Memory

## Project

This is an AI-powered ticket management system for handling student support emails.

The product should help support agents receive, classify, summarize, respond to, and manage tickets faster while keeping responses human-friendly.

## Scope

Core features:

- Receive support emails and create tickets
- Ticket list with filtering, searching, sorting, and pagination
- Ticket detail view with editable properties and reply thread
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

## Ticket Module Memory

Implemented ticket features:

- Dashboard scorecards link to the ticket queue using React Router `Link`, so navigation is smooth and does not reload the whole page.
- Ticket queue supports server-backed status/category filtering and client-side search.
- Ticket search matches subject, From email, status label, category label, assignee name, and assignee email.
- Ticket queue uses TanStack Table for sorting and pagination.
- Ticket queue defaults to 10 rows per page and supports 10, 25, and 50 row page sizes.
- Ticket and user tables use an internal scroll region with sticky headers so larger page sizes do not push the whole page down.
- Ticket queue column label for the requester email is `From`, not `Requester`.
- Ticket subjects are clickable and route to `/tickets/:ticketId`.
- Ticket details show subject, From email, status, category, assignee, timestamps, ticket ID, and full message thread.
- Ticket details include editable `Assigned to`, `Status`, and `Category` selectors.
- Ticket details include a reply thread and a reply form below the messages.
- Support replies are persisted as `TicketMessage` rows with `direction = outbound`.
- Customer inbound messages are persisted as `TicketMessage` rows with `direction = inbound`.
- Ticket assignment is persisted with nullable `Ticket.assignedToId`, related to `User`.
- Ticket assignment can be cleared by selecting `Unassigned`.
- Status values are `open`, `resolved`, and `closed`.
- Category values are `general_question`, `technical_question`, and `refund_request`; category can also be cleared to uncategorized.
- Sample ticket seed creates exactly 100 deterministic realistic sample tickets, in addition to any existing tickets.

Ticket frontend files:

- `apps/web/src/api/tickets.ts` - ticket list/detail/update/reply API helpers and shared ticket types.
- `apps/web/src/ui/App.tsx` - ticket queue, ticket detail page, search, table pagination, property updates, and reply UI.
- `apps/web/src/ui/App.tickets.test.tsx` - component coverage for list, filters, search, sorting, pagination, details, assignment, status/category updates, and replies.

Ticket API files:

- `apps/api/src/routes/tickets.ts` - ticket list/detail routes, assignable agents route, ticket update route, inbound email route, and reply route.
- `apps/api/src/scripts/sample-tickets.ts` - deterministic realistic sample ticket seed.
- `apps/api/prisma/schema.prisma` - `Ticket`, `TicketMessage`, and ticket assignee relation.
- `apps/api/prisma/migrations/20260704000000_add_ticket_assignee/migration.sql` - ticket assignee migration.

Ticket API behavior:

- `GET /api/tickets` returns tickets ordered newest first and supports `status` and `category` query filters.
- `GET /api/tickets/agents` returns active admins/agents that can be assigned tickets.
- `GET /api/tickets/:ticketId` returns ticket details including ordered messages.
- `PATCH /api/tickets/:ticketId` updates `assignedToId`, `status`, and/or `category`.
- `POST /api/tickets/:ticketId/messages` creates an outbound support reply and returns the updated ticket details.
- `POST /api/inbound-email` creates inbound customer tickets/messages.

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
- Ticket list/detail data uses TanStack Query cache keys in `apps/web/src/ui/App.tsx`; invalidate the `["tickets"]` query family after ticket updates/replies.
- Do not add component-level `useEffect` fetch flows for API data when the data can be represented as a query.
- After create, update, or delete actions, invalidate the related query key instead of manually re-fetching and storing duplicate local state.
- Keep Better Auth session handling on the Better Auth client hooks unless the auth flow itself needs a dedicated API helper.
- Use React Hook Form with Zod schemas for forms, including adding or editing users.

## Component Tests

Frontend component tests use Vitest, React Testing Library, jsdom, and
`@testing-library/jest-dom`.

Test files should live near the component or route they cover, using the
`*.test.tsx` suffix. For component tests that need React Router and TanStack
Query, use `apps/web/src/test/render-with-query.tsx` instead of creating a new
`QueryClientProvider` wrapper in each test file.

Component testing rules:

- Prefer user-visible queries such as `getByRole`, `findByText`, and
  `within(...)` over implementation details.
- Mock API helpers from `apps/web/src/api/*`; do not call the real backend from
  component tests.
- Keep TanStack Query retries disabled in tests by using `renderWithQuery`.
- Use `userEvent` for user interactions.
- Cover loading, error, empty, and success states when a component reads server
  state.
- For mutations, assert the API helper was called with the expected payload and
  assert the visible post-action state.

Run component tests from the project root:

- `bun run test:web`

Run component tests directly from the web workspace:

- `bun --filter @helpdesk/web test`
- `bun --filter @helpdesk/web test:watch`

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
