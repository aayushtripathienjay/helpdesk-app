import { useEffect, useMemo, useState } from "react";
import { listTickets, type Ticket } from "../api/tickets";

const categoryLabels = {
  general_question: "General question",
  technical_question: "Technical question",
  refund_request: "Refund request"
};

const statusLabels = {
  open: "Open",
  resolved: "Resolved",
  closed: "Closed"
};

export function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTickets()
      .then((data) => {
        setTickets(data);
        setError(null);
      })
      .catch((caughtError: unknown) => {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Something went wrong"
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  const openTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status === "open").length,
    [tickets]
  );

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-accent">
              Helpdesk
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-ink">
              Ticket Dashboard
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-72">
            <Metric label="Open" value={openTickets} />
            <Metric label="Total" value={tickets.length} />
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-base font-semibold text-ink">Filters</h2>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Status
                </span>
                <select className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option>All statuses</option>
                  <option>Open</option>
                  <option>Resolved</option>
                  <option>Closed</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Category
                </span>
                <select className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option>All categories</option>
                  <option>General question</option>
                  <option>Technical question</option>
                  <option>Refund request</option>
                </select>
              </label>
            </div>
          </aside>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-ink">Tickets</h2>
            </div>

            {isLoading ? (
              <StateMessage message="Loading tickets..." />
            ) : error ? (
              <StateMessage message={error} />
            ) : (
              <div className="divide-y divide-slate-100">
                {tickets.map((ticket) => (
                  <article
                    className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                    key={ticket.id}
                  >
                    <div>
                      <h3 className="font-medium text-ink">{ticket.subject}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {ticket.requesterEmail}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <Badge>{statusLabels[ticket.status]}</Badge>
                      <Badge>{categoryLabels[ticket.category]}</Badge>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function StateMessage({ message }: { message: string }) {
  return <p className="px-4 py-8 text-sm text-slate-600">{message}</p>;
}
