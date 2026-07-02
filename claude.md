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
