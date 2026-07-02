import {
  type ReactNode,
  useEffect,
  useMemo,
  useState
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Navigate, Route, Routes, useNavigate } from "react-router";
import { z } from "zod";
import { authClient } from "../api/auth";
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

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password")
});

type LoginFormValues = z.infer<typeof loginSchema>;

function inputClassName(hasError: boolean) {
  return [
    "mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:ring-2",
    hasError
      ? "border-red-500 focus:border-red-600 focus:ring-red-100"
      : "border-slate-300 focus:border-accent focus:ring-teal-100"
  ].join(" ");
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <FullPageMessage message="Checking session..." />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function LoginPage() {
  const navigate = useNavigate();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const [authError, setAuthError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  if (isSessionPending) {
    return <FullPageMessage message="Checking session..." />;
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  async function signIn(values: LoginFormValues) {
    setAuthError(null);
    const { error: signInError } = await authClient.signIn.email({
      email: values.email,
      password: values.password
    });

    if (signInError) {
      setAuthError(signInError.message ?? "Unable to sign in");
      return;
    }

    navigate("/", { replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
      <section className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-accent">
            Helpdesk
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Sign in</h1>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(signIn)}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              autoComplete="email"
              aria-invalid={errors.email ? "true" : "false"}
              className={inputClassName(Boolean(errors.email))}
              {...register("email")}
              type="email"
            />
            {errors.email ? (
              <p className="mt-1 text-sm text-red-700">
                {errors.email.message}
              </p>
            ) : null}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Password
            </span>
            <input
              autoComplete="current-password"
              aria-invalid={errors.password ? "true" : "false"}
              className={inputClassName(Boolean(errors.password))}
              {...register("password")}
              type="password"
            />
            {errors.password ? (
              <p className="mt-1 text-sm text-red-700">
                {errors.password.message}
              </p>
            ) : null}
          </label>

          {authError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {authError}
            </p>
          ) : null}

          <button
            className="w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

function DashboardPage() {
  const { data: session } = authClient.useSession();
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#d7f4ee_0,_transparent_34rem),linear-gradient(180deg,_#f8fbfb_0%,_#eef3f5_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Nav userName={session?.user.name ?? "User"} />

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

function Nav({ userName }: { userName: string }) {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate("/login", { replace: true });
        }
      }
    });

    setIsSigningOut(false);
  }

  return (
    <nav className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-ink px-4 py-3 shadow-lg shadow-slate-900/10 sm:flex-row sm:items-center sm:justify-between">
      <a className="flex items-center gap-3 text-white" href="/">
        <span className="grid size-10 place-items-center rounded-lg bg-accent text-base font-semibold text-white shadow-sm ring-1 ring-white/15">
          H
        </span>
        <span>
          <span className="block text-lg font-semibold leading-5">Helpdesk</span>
          <span className="mt-0.5 block text-xs font-medium uppercase tracking-wide text-teal-100/80">
            Support console
          </span>
        </span>
      </a>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-medium text-white shadow-sm">
          <span className="mr-2 inline-block size-2 rounded-full bg-emerald-300" />
          {userName}
        </span>
        <button
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSigningOut}
          onClick={handleSignOut}
          type="button"
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </nav>
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

function FullPageMessage({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <p className="text-sm text-slate-600">{message}</p>
    </main>
  );
}
