import { Router } from "express";
import { demoTickets, ticketCategories, ticketStatuses } from "../domain/tickets";

export const ticketsRouter = Router();

ticketsRouter.get("/", (_request, response) => {
  response.json({
    data: demoTickets,
    meta: {
      statuses: ticketStatuses,
      categories: ticketCategories
    }
  });
});

ticketsRouter.get("/:ticketId", (request, response) => {
  const ticket = demoTickets.find((item) => item.id === request.params.ticketId);

  if (!ticket) {
    response.status(404).json({ error: "Ticket not found" });
    return;
  }

  response.json({ data: ticket });
});
