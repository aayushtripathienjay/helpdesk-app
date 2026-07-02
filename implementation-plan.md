# Implementation Plan

## Phase 1: Project Foundation

Goal: Set up the application structure, database, and development workflow.

- Create the React, TypeScript, frontend app
- Create the Node.js, Express, and TypeScript backend app
- Configure shared formatting and linting
- Add environment variable management for local development
- Add Docker setup for local PostgreSQL
- Install and configure Prisma
- Create the initial database connection health check
- Add basic API error handling and request logging

## Phase 2: Data Model and Authentication

Goal: Define the core system entities and allow users to sign in securely.

- Create Prisma models for users, sessions, tickets, ticket messages, and AI suggestions
- Add user roles for admin and agent
- Add database-backed session authentication
- Create login and logout endpoints
- Create middleware to require authentication
- Create middleware to require admin access
- Add an initial admin seed script for deployment
- Add password hashing and password validation
- Add authenticated current-user endpoint

## Phase 3: Admin User Management

Goal: Let the initial admin create and manage support agents.

- Build admin user list API
- Build create-agent API
- Build update-agent API
- Build deactivate-agent API
- Build admin user management screen
- Add form validation for creating agents
- Prevent non-admin users from accessing user management

## Phase 4: Ticket Core

Goal: Let agents view, filter, sort, and manage support tickets.

- Create ticket status values: open, resolved, closed
- Create ticket category values: general question, technical question, refund request
- Build create-ticket API
- Build ticket list API with filtering by status and category
- Build ticket list API with sorting by newest, oldest, and last updated
- Build ticket detail API
- Build update-ticket-status API
- Build update-ticket-category API
- Build ticket list screen
- Build ticket detail screen
- Add internal ticket metadata such as requester email, subject, and timestamps

## Phase 5: Email Ingestion

Goal: Convert inbound support emails into tickets.

- Choose the first email provider integration: SendGrid inbound parse, Mailgun routes, or another webhook source
- Create inbound email webhook endpoint
- Parse sender, recipient, subject, body, and message ID
- Create a new ticket from the first inbound email in a thread
- Add replies to an existing ticket when the email belongs to a known thread
- Store inbound email content as ticket messages
- Add basic duplicate message protection
- Add webhook signature verification if supported by the provider

## Phase 6: Ticket Replies

Goal: Let agents reply to students from inside the helpdesk.

- Create outbound reply API
- Send outbound email through SendGrid or Mailgun
- Store outbound replies as ticket messages
- Show full ticket conversation history
- Add reply composer to the ticket detail screen
- Allow agents to mark a ticket as resolved after replying
- Handle outbound email failures and show clear error states

## Phase 7: AI Classification and Summaries

Goal: Use AI to reduce manual triage work.

- Add AI provider abstraction for Codex/OpenAI or Claude
- Create classification prompt for the three ticket categories
- Create summary prompt for ticket conversations
- Run classification when a new ticket is created
- Store AI category, confidence, and reasoning if available
- Store AI-generated ticket summary
- Show AI classification and summary on the ticket detail screen
- Allow agents to override the AI-selected category
- Log AI failures without blocking ticket creation

## Phase 8: AI-Suggested Replies and Knowledge Base

Goal: Help agents respond faster while keeping humans in control.

- Create knowledge base article model
- Build admin knowledge base CRUD APIs
- Build admin knowledge base management screen
- Add AI prompt for suggested replies using ticket content and knowledge base articles
- Generate a suggested reply for open tickets
- Store suggested replies separately from sent replies
- Show suggested reply in the reply composer
- Let agents edit suggested replies before sending
- Add a fallback behavior when the knowledge base does not contain enough information

## Phase 9: Dashboard and Reporting

Goal: Give admins and agents visibility into support workload.

- Build dashboard summary API
- Show open, resolved, and closed ticket counts
- Show ticket counts by category
- Show newest open tickets
- Show recently updated tickets
- Show basic response metrics if timestamps are available
- Add dashboard screen as the authenticated landing page

## Phase 10: Production Readiness

Goal: Make the system safe enough to deploy and operate.

- Add production Dockerfile
- Add database migration workflow
- Add deployment environment variable documentation
- Add server-side input validation across APIs
- Add rate limiting for auth and webhooks
- Add audit logging for ticket status, category, and reply actions
- Add Sentry or equivalent error monitoring
- Add structured logs for email and AI processing
- Add backup strategy for PostgreSQL
- Add smoke test checklist for deployment

## Suggested MVP Cut

The smallest useful version should include:

- Phase 1: Project Foundation
- Phase 2: Data Model and Authentication
- Phase 3: Admin User Management
- Phase 4: Ticket Core
- Phase 5: Email Ingestion
- Phase 6: Ticket Replies
- Phase 7: AI Classification and Summaries

AI-suggested replies, knowledge base management, and reporting can follow once the core ticket workflow is reliable.
