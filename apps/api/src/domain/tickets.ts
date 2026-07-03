import { TicketCategory, TicketStatus } from "@prisma/client";

export const ticketStatuses = Object.values(TicketStatus);
export const ticketCategories = Object.values(TicketCategory);
