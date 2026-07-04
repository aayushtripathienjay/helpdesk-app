# Helpdesk Project Context

## Purpose
AI-powered Helpdesk Ticketing System for managing customer support tickets, users, SLAs, notifications, and reports.

## Tech Stack
- Laravel
- PHP 8+
- MySQL
- Redis (Queue/Cache)
- Bootstrap + jQuery
- REST API
- Docker (optional)

## Core Modules
- Authentication
- Dashboard
- Tickets
- Users & Roles
- Departments & Categories
- SLA & Escalation
- Email Notifications
- Reports
- Knowledge Base
- Settings

## Ticket Flow
New → Assigned → In Progress → Waiting → Resolved → Closed

## Coding Rules
- Follow Laravel conventions.
- Keep controllers thin.
- Business logic in Services.
- Use Form Requests for validation.
- Prefer Eloquent relationships.
- Write clean, reusable code.
- Avoid duplicate queries (N+1).

## Database
Main entities:
Users, Tickets, Comments, Attachments, Departments, Categories, Priorities, SLAs, Notifications.

## API
RESTful endpoints.
Use authentication middleware.
Return consistent JSON responses.

## Security
- Validate all input.
- Authorize every action.
- Prevent SQL Injection & XSS.
- Never commit secrets.

## Performance
- Cache heavy queries.
- Queue emails/jobs.
- Paginate large lists.
- Add indexes where needed.

## Troubleshooting
- Check logs first.
- Verify queue workers.
- Verify mail configuration.
- Check migrations and permissions.

## AI Assistant Instructions
- Understand existing architecture before changing code.
- Reuse existing services/components.
- Make minimal, production-safe changes.
- Preserve backward compatibility.
- Update related tests/docs when needed.
- Explain why a change is required before major refactoring.