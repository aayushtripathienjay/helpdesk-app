# Tech Stack

## Frontend

- React with TypeScript - widely adopted, strong ecosystem for building dashboards and data-heavy UIs
- Tailwind CSS - fast styling without fighting a component library
- React Router - client-side routing

## Backend

- Node.js with Express and TypeScript - keeps the entire stack in one language and is simple to set up for REST APIs
- Database-backed sessions for authentication - stores authenticated sessions in the database instead of using stateless JWT-only auth

## Database

- PostgreSQL - relational data such as tickets, users, categories, and sessions fits naturally into tables with foreign keys. Good for filtering and sorting queries

## ORM

- Prisma - type-safe database access, easy migrations, and works well with TypeScript

## AI

- Codex/OpenAI API or Claude API - for ticket classification, summaries, and suggested replies. Both can follow instructions and return structured output

## Email

- SendGrid or Mailgun - for sending outbound replies. Inbound email can be handled via webhooks

## Deployment

- Docker and a cloud provider such as AWS, Railway, or Fly.io
