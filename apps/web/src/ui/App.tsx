import {
  type ReactNode,
  useEffect,
  useMemo,
  useState
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type PaginationState,
  type SortingState
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Bot,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  Eye,
  EyeOff,
  Headphones,
  LogOut,
  LockKeyhole,
  Mail,
  MoreHorizontal,
  Pencil,
  Search,
  ShieldCheck,
  Sparkles,
  TicketIcon,
  TextSearch,
  Trash2,
  TrendingUp,
  UserX
} from "lucide-react";
import { useForm } from "react-hook-form";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams
} from "react-router";
import { z } from "zod";
import { authClient } from "../api/auth";
import {
  getTicket,
  listTickets,
  listAssignableAgents,
  polishTicketReply,
  replyToTicket,
  summarizeTicketConversation,
  ticketCategories,
  ticketCategoryLabels,
  ticketStatusLabels,
  ticketStatuses,
  TicketStatusValue,
  updateTicket,
  type Ticket,
  type TicketCategory,
  type TicketDetails,
  type TicketStatus,
  type TicketUpdatePayload
} from "../api/tickets";
import {
  createUser,
  deactivateUser,
  deleteUser,
  listUsers,
  updateUser,
  type HelpdeskUser,
  UserApiError,
  type UserRole
} from "../api/users";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const queryKeys = {
  agents: ["ticket-agents"],
  ticket: (ticketId: string) => ["ticket", ticketId],
  tickets: (filters?: { category?: string; status?: string }) => [
    "tickets",
    filters ?? {}
  ],
  users: ["users"]
} as const;

const pageSizeOptions = [10, 25, 50];
const appShellClass =
  "min-h-screen bg-[radial-gradient(circle_at_top_left,_#d7f4ee_0,_transparent_34rem),linear-gradient(180deg,_#f8fbfb_0%,_#eef3f5_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18)_0,_transparent_34rem),linear-gradient(180deg,_#0f172a_0%,_#111827_100%)]";
const panelClass = "border-border bg-card text-card-foreground shadow-sm";
type ThemeMode = "dark" | "light";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password")
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SessionUser = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  role?: UserRole | null;
  isActive?: boolean | null;
};

const baseUserFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a name"),
  email: z.email("Enter a valid email address"),
  password: z
    .string()
    .refine(
      (value) => value.length === 0 || value.length >= 8,
      "Password must be at least 8 characters"
    ),
  role: z.enum(["admin", "agent"]),
  isActive: z.boolean()
});

const createUserFormSchema = baseUserFormSchema.extend({
  password: z.string().min(8, "Minimum 8 characters")
});

const editUserFormSchema = baseUserFormSchema;

type UserFormValues = z.infer<typeof baseUserFormSchema>;

const emptyUserForm: UserFormValues = {
  name: "",
  email: "",
  password: "",
  role: "agent",
  isActive: true
};

function getSessionUser(session: unknown): SessionUser | null {
  if (!session || typeof session !== "object" || !("user" in session)) {
    return null;
  }

  return (session as { user?: SessionUser }).user ?? null;
}

function isAdminSession(session: unknown) {
  return getSessionUser(session)?.role === "admin";
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem("helpdesk-theme");

  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("helpdesk-theme", theme);
  }, [theme]);

  return {
    theme,
    toggleTheme: () =>
      setTheme((currentTheme) =>
        currentTheme === "dark" ? "light" : "dark"
      )
  };
}

function readTicketStatusFilter(value: string | null): TicketStatus | "all" {
  return ticketStatuses.includes(value as TicketStatus)
    ? (value as TicketStatus)
    : "all";
}

function readTicketCategoryFilter(value: string | null): TicketCategory | "all" {
  return ticketCategories.includes(value as TicketCategory)
    ? (value as TicketCategory)
    : "all";
}

function readBooleanFilter(value: string | null) {
  return value === "true";
}

function searchTickets(tickets: Ticket[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return tickets;
  }

  return tickets.filter((ticket) => {
    const category = ticket.category ? ticketCategoryLabels[ticket.category] : "";
    const status = ticketStatusLabels[ticket.status];
    const assignee = ticket.assignedTo
      ? `${ticket.assignedTo.name} ${ticket.assignedTo.email}`
      : "unassigned";

    return [
      ticket.subject,
      ticket.requesterEmail,
      status,
      category,
      assignee
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  });
}

function getAiResolution(ticket: Ticket) {
  return ticket.aiSuggestions?.find((suggestion) =>
    suggestion.summary?.startsWith("Auto-resolved using KB article:")
  );
}

function formatPercent(numerator: number, denominator: number) {
  if (denominator === 0) {
    return "0%";
  }

  return `${Math.round((numerator / denominator) * 100)}%`;
}

function formatDuration(milliseconds: number | null) {
  if (milliseconds === null) {
    return "N/A";
  }

  const minutes = Math.max(1, Math.round(milliseconds / 60000));
  const days = Math.floor(minutes / 1440);
  const remainingMinutesAfterDays = minutes % 1440;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (days > 0) {
    const remainingHours = Math.floor(remainingMinutesAfterDays / 60);

    if (remainingHours === 0) {
      return `${days}d`;
    }

    return `${days}d ${remainingHours}h`;
  }

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTicketVolumeByDay(tickets: Ticket[]) {
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const countsByDate = new Map<string, number>();

  tickets.forEach((ticket) => {
    const createdAt = new Date(ticket.createdAt);

    if (!Number.isFinite(createdAt.getTime())) {
      return;
    }

    const dateKey = getLocalDateKey(createdAt);
    countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
  });

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(startOfToday);
    date.setDate(startOfToday.getDate() - (29 - index));

    return {
      date,
      key: getLocalDateKey(date),
      count: countsByDate.get(getLocalDateKey(date)) ?? 0
    };
  });
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
      <Route
        path="/tickets"
        element={
          <RequireAuth>
            <TicketsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/tickets/:ticketId"
        element={
          <RequireAuth>
            <TicketDetailsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/users"
        element={
          <RequireAdmin>
            <UsersPage />
          </RequireAdmin>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <FullPageSkeleton />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <FullPageSkeleton />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminSession(session)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function LoginPage() {
  const navigate = useNavigate();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
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
    return <FullPageSkeleton />;
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  async function signIn(values: LoginFormValues) {
    setAuthError(null);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email: values.email,
        password: values.password
      });

      if (signInError) {
        setAuthError(
          signInError.message === "Unable to sign in"
            ? "Check your email and password, then try again."
            : (signInError.message ?? "Check your email and password, then try again.")
        );
        return;
      }
    } catch {
      setAuthError("The auth server is not reachable. Make sure the API is running.");
      return;
    }

    navigate("/", { replace: true });
  }

  return (
    <main className={cn(appShellClass, "flex items-center justify-center px-4 py-8")}>
      <Card className="grid w-full max-w-5xl overflow-hidden border-slate-200 shadow-xl shadow-slate-900/10 lg:grid-cols-[1fr_420px]">
        <section className="flex min-h-72 flex-col justify-between bg-[#172026] p-6 text-white sm:p-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-lg bg-teal-700 text-white shadow-sm ring-1 ring-white/15">
                <Headphones className="size-5" />
              </span>
              <div>
                <p className="text-lg font-semibold leading-5">Helpdesk</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-teal-100/80">
                  Support console
                </p>
              </div>
            </div>

            <div className="mt-12 max-w-md">
              <p className="text-sm font-medium uppercase tracking-wide text-teal-100/80">
                Agent workspace
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Sign in to manage support work.
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-200">
                Access tickets, user management, and team workflows from one
                secure dashboard.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-md border border-white/10 bg-white/10 p-3">
              <p className="font-medium">Tickets</p>
              <p className="mt-1 text-xs text-slate-300">Triage queue</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/10 p-3">
              <p className="font-medium">Agents</p>
              <p className="mt-1 text-xs text-slate-300">Role access</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/10 p-3">
              <p className="font-medium">Sessions</p>
              <p className="mt-1 text-xs text-slate-300">Protected</p>
            </div>
          </div>
        </section>

        <section className="bg-card">
          <CardHeader className="space-y-2 px-6 pt-8 sm:px-8">
            <div className="flex size-11 items-center justify-center rounded-lg border bg-muted">
              <ShieldCheck className="size-5 text-teal-700" />
            </div>
            <div>
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Use your helpdesk account to continue.
              </CardDescription>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit(signIn)}>
            <CardContent className="space-y-5 px-6 sm:px-8">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoComplete="email"
                    aria-invalid={errors.email ? "true" : "false"}
                    className={cn(
                      "pl-9",
                      errors.email &&
                        "border-destructive/80 focus-visible:ring-1 focus-visible:ring-destructive/80 focus-visible:ring-offset-0"
                    )}
                    id="email"
                    {...register("email")}
                    type="email"
                  />
                </div>
                {errors.email ? (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoComplete="current-password"
                    aria-invalid={errors.password ? "true" : "false"}
                    className={cn(
                      "pl-9 pr-10",
                      errors.password &&
                        "border-destructive/80 focus-visible:ring-1 focus-visible:ring-destructive/80 focus-visible:ring-offset-0"
                    )}
                    id="password"
                    {...register("password")}
                    type={isPasswordVisible ? "text" : "password"}
                  />
                  <Button
                    aria-label={
                      isPasswordVisible ? "Hide password" : "Show password"
                    }
                    className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsPasswordVisible((current) => !current)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    {isPasswordVisible ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </div>
                {errors.password ? (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              {authError ? (
                <Alert variant="destructive">
                  <AlertTitle>Sign-in failed</AlertTitle>
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>

            <CardFooter className="px-6 pb-8 sm:px-8">
              <Button className="h-11 w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </CardFooter>
          </form>
        </section>
      </Card>
    </main>
  );
}

function DashboardPage() {
  const { data: session } = authClient.useSession();
  const user = getSessionUser(session);
  const {
    data: tickets = [],
    isLoading
  } = useQuery({
    queryKey: queryKeys.tickets(),
    queryFn: () => listTickets()
  });

  const openTickets = useMemo(
    () =>
      tickets.filter((ticket) => ticket.status === TicketStatusValue.Open).length,
    [tickets]
  );
  const resolvedTickets = useMemo(
    () =>
      tickets.filter((ticket) => ticket.status === TicketStatusValue.Resolved)
        .length,
    [tickets]
  );
  const aiResolvedTickets = useMemo(
    () =>
      tickets.filter(
        (ticket) =>
          ticket.status === TicketStatusValue.Resolved && getAiResolution(ticket)
      ),
    [tickets]
  );
  const averageAiResolutionTime = useMemo(() => {
    const durations = aiResolvedTickets
      .map((ticket) => {
        const aiResolution = getAiResolution(ticket);

        if (!aiResolution) {
          return null;
        }

        const createdAt = new Date(ticket.createdAt).getTime();
        const resolvedAt = new Date(aiResolution.createdAt).getTime();
        const duration = resolvedAt - createdAt;

        return Number.isFinite(duration) && duration >= 0 ? duration : null;
      })
      .filter((duration): duration is number => duration !== null);

    if (durations.length === 0) {
      return null;
    }

    return durations.reduce((total, duration) => total + duration, 0) / durations.length;
  }, [aiResolvedTickets]);
  const ticketVolumeByDay = useMemo(
    () => getTicketVolumeByDay(tickets),
    [tickets]
  );

  return (
    <main className={appShellClass}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Nav isAdmin={isAdminSession(session)} userName={user?.name ?? "User"} />

        <header className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Helpdesk
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Ticket Dashboard
            </h1>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric
            href="/tickets"
            icon={<TicketIcon className="size-3.5" />}
            label="Total Tickets"
            loading={isLoading}
            value={tickets.length}
          />
          <Metric
            href={`/tickets?status=${TicketStatusValue.Open}`}
            icon={<CircleDot className="size-3.5" />}
            label="Open Tickets"
            loading={isLoading}
            value={openTickets}
          />
          <Metric
            href={`/tickets?status=${TicketStatusValue.Resolved}&aiResolved=true`}
            icon={<Bot className="size-3.5" />}
            label="Resolved by AI"
            loading={isLoading}
            value={aiResolvedTickets.length}
          />
          <Metric
            href={`/tickets?status=${TicketStatusValue.Resolved}&aiResolved=true`}
            icon={<TrendingUp className="size-3.5" />}
            label="AI Resolution Rate"
            loading={isLoading}
            value={formatPercent(aiResolvedTickets.length, resolvedTickets)}
          />
          <Metric
            href={`/tickets?status=${TicketStatusValue.Resolved}&aiResolved=true`}
            icon={<Clock3 className="size-3.5" />}
            label="Avg Resolution Time"
            loading={isLoading}
            value={formatDuration(averageAiResolutionTime)}
          />
        </section>

        <TicketVolumeChart data={ticketVolumeByDay} loading={isLoading} />
      </div>
    </main>
  );
}

function TicketsPage() {
  const { data: session } = authClient.useSession();
  const user = getSessionUser(session);
  const [searchParams, setSearchParams] = useSearchParams();
  const [ticketSearch, setTicketSearch] = useState("");
  const status = readTicketStatusFilter(searchParams.get("status"));
  const category = readTicketCategoryFilter(searchParams.get("category"));
  const aiResolved = readBooleanFilter(searchParams.get("aiResolved"));
  const filters = { aiResolved, category, status };
  const {
    data: tickets = [],
    error,
    isFetching,
    isLoading
  } = useQuery({
    queryKey: queryKeys.tickets(filters),
    queryFn: () => listTickets(filters)
  });
  const searchedTickets = useMemo(
    () => searchTickets(tickets, ticketSearch),
    [ticketSearch, tickets]
  );
  const visibleSearchedOpenTickets = searchedTickets.filter(
    (ticket) => ticket.status === TicketStatusValue.Open
  ).length;

  function updateFilter(key: "category" | "status", value: string) {
    const nextParams = new URLSearchParams(searchParams);

    if (value === "all") {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }

    if (key === "status" && value !== TicketStatusValue.Resolved) {
      nextParams.delete("aiResolved");
    }

    setSearchParams(nextParams);
  }

  function scoreHref(nextStatus: TicketStatus | "all") {
    const nextParams = new URLSearchParams(searchParams);

    if (nextStatus === "all") {
      nextParams.delete("status");
      nextParams.delete("aiResolved");
    } else {
      nextParams.set("status", nextStatus);

      if (nextStatus !== TicketStatusValue.Resolved) {
        nextParams.delete("aiResolved");
      }
    }

    const query = nextParams.toString();
    return query ? `/tickets?${query}` : "/tickets";
  }

  return (
    <main className={appShellClass}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Nav isAdmin={isAdminSession(session)} userName={user?.name ?? "User"} />

        <header className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Tickets
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Ticket Queue
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Review customer requests from newest to oldest and narrow the queue
              by status or category.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">Dashboard</Link>
          </Button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric
            active={status === "all"}
            href={scoreHref("all")}
            label="Visible tickets"
            loading={isLoading}
            value={tickets.length}
          />
          {ticketStatuses.map((ticketStatus) => (
            <Metric
              active={status === ticketStatus}
              href={scoreHref(ticketStatus)}
              key={ticketStatus}
              label={ticketStatusLabels[ticketStatus]}
              loading={isLoading}
              value={tickets.filter((ticket) => ticket.status === ticketStatus).length}
            />
          ))}
        </section>

        <Card className="overflow-hidden border-border bg-card shadow-sm">
          <CardHeader className="border-b bg-card px-4 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-base">All tickets</CardTitle>
                <CardDescription>
                  Newest first. {visibleSearchedOpenTickets} open in the current view.
                  {aiResolved ? " Showing AI-resolved tickets only." : ""}
                </CardDescription>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[44rem]">
                <div>
                  <Label htmlFor="ticket-search">Search</Label>
                  <div className="relative mt-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      id="ticket-search"
                      onChange={(event) => setTicketSearch(event.target.value)}
                      placeholder="Subject, from, status..."
                      value={ticketSearch}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="ticket-status-filter">Status</Label>
                  <Select
                    onValueChange={(value) => updateFilter("status", value)}
                    value={status}
                  >
                    <SelectTrigger className="mt-2" id="ticket-status-filter">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {ticketStatuses.map((ticketStatus) => (
                        <SelectItem key={ticketStatus} value={ticketStatus}>
                          {ticketStatusLabels[ticketStatus]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ticket-category-filter">Category</Label>
                  <Select
                    onValueChange={(value) => updateFilter("category", value)}
                    value={category}
                  >
                    <SelectTrigger className="mt-2" id="ticket-category-filter">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {ticketCategories.map((ticketCategory) => (
                        <SelectItem key={ticketCategory} value={ticketCategory}>
                          {ticketCategoryLabels[ticketCategory]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>

          {isLoading ? (
            <TicketListSkeleton />
          ) : error ? (
            <StateMessage message={getErrorMessage(error, "Something went wrong")} />
          ) : searchedTickets.length === 0 ? (
            <StateMessage message="No tickets found." />
          ) : (
            <TicketList tickets={searchedTickets} />
          )}
          {isFetching && !isLoading ? (
            <p className="border-t px-4 py-2 text-xs text-muted-foreground">
              Refreshing tickets...
            </p>
          ) : null}
        </Card>
      </div>
    </main>
  );
}

function TicketDetailsPage() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const user = getSessionUser(session);
  const { ticketId } = useParams();
  const {
    data: ticket,
    error,
    isLoading
  } = useQuery({
    enabled: Boolean(ticketId),
    queryKey: queryKeys.ticket(ticketId ?? ""),
    queryFn: () => getTicket(ticketId ?? "")
  });
  const {
    data: agents = [],
    error: agentsError,
    isLoading: isAgentsLoading
  } = useQuery({
    queryKey: queryKeys.agents,
    queryFn: listAssignableAgents
  });
  const assignTicketMutation = useMutation({
    mutationFn: (payload: TicketUpdatePayload) =>
      updateTicket(ticketId ?? "", payload),
    onSuccess: async (updatedTicket) => {
      queryClient.setQueryData(queryKeys.ticket(updatedTicket.id), updatedTicket);
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    }
  });
  const replyMutation = useMutation({
    mutationFn: (body: string) => replyToTicket(ticketId ?? "", body),
    onSuccess: async (updatedTicket) => {
      queryClient.setQueryData(queryKeys.ticket(updatedTicket.id), updatedTicket);
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    }
  });
  const polishReplyMutation = useMutation({
    mutationFn: (body: string) => polishTicketReply(ticketId ?? "", body)
  });
  const summaryMutation = useMutation({
    mutationFn: () => summarizeTicketConversation(ticketId ?? "")
  });

  return (
    <main className={appShellClass}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <Nav isAdmin={isAdminSession(session)} userName={user?.name ?? "User"} />

        <header className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Ticket
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Ticket Details
            </h1>
          </div>
          <Button asChild variant="outline">
            <Link to="/tickets">
              <ArrowLeft className="mr-2 size-4" />
              Tickets
            </Link>
          </Button>
        </header>

        {isLoading ? (
          <TicketDetailsSkeleton />
        ) : error || !ticket ? (
          <Card className="border-slate-200 shadow-sm">
            <StateMessage message={getErrorMessage(error, "Ticket not found")} />
          </Card>
        ) : (
          <TicketDetailsContent
            agents={agents}
            assignmentError={getErrorMessage(
              assignTicketMutation.error ?? agentsError,
              "Unable to update assignment"
            )}
            isAgentsLoading={isAgentsLoading}
            isPolishingReply={polishReplyMutation.isPending}
            isSavingTicket={assignTicketMutation.isPending}
            isSendingReply={replyMutation.isPending}
            isSummarizingTicket={summaryMutation.isPending}
            onPolishReply={(body) => polishReplyMutation.mutateAsync(body)}
            onReply={(body) => replyMutation.mutateAsync(body)}
            onSummarizeTicket={() => summaryMutation.mutate()}
            onUpdateTicket={(payload) => assignTicketMutation.mutate(payload)}
            showAssignmentError={Boolean(assignTicketMutation.error ?? agentsError)}
            showPolishError={Boolean(polishReplyMutation.error)}
            showReplyError={Boolean(replyMutation.error)}
            showSummaryError={Boolean(summaryMutation.error)}
            summary={summaryMutation.data ?? null}
            summaryError={getErrorMessage(
              summaryMutation.error,
              "Unable to summarize ticket"
            )}
            ticket={ticket}
            ticketUpdateError={getErrorMessage(
              assignTicketMutation.error ?? agentsError,
              "Unable to update ticket"
            )}
            polishError={getErrorMessage(
              polishReplyMutation.error,
              "Unable to polish reply"
            )}
            replyError={getErrorMessage(replyMutation.error, "Unable to send reply")}
          />
        )}
      </div>
    </main>
  );
}

function TicketDetailsContent({
  agents,
  assignmentError,
  isAgentsLoading,
  isPolishingReply,
  isSavingTicket,
  isSendingReply,
  isSummarizingTicket,
  onPolishReply,
  onReply,
  onSummarizeTicket,
  onUpdateTicket,
  showAssignmentError,
  showPolishError,
  showReplyError,
  showSummaryError,
  summary,
  summaryError,
  ticket,
  ticketUpdateError,
  polishError,
  replyError
}: {
  agents: Array<{ id: string; name: string; email: string }>;
  assignmentError: string;
  isAgentsLoading: boolean;
  isPolishingReply: boolean;
  isSavingTicket: boolean;
  isSendingReply: boolean;
  isSummarizingTicket: boolean;
  onPolishReply: (body: string) => Promise<string>;
  onReply: (body: string) => Promise<unknown>;
  onSummarizeTicket: () => void;
  onUpdateTicket: (payload: TicketUpdatePayload) => void;
  showAssignmentError: boolean;
  showPolishError: boolean;
  showReplyError: boolean;
  showSummaryError: boolean;
  summary: string | null;
  summaryError: string;
  ticket: TicketDetails;
  ticketUpdateError: string;
  polishError: string;
  replyError: string;
}) {
  const [replyBody, setReplyBody] = useState("");

  async function handleReplySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextReply = replyBody.trim();

    if (!nextReply) {
      return;
    }

    await onReply(nextReply);
    setReplyBody("");
  }

  async function handlePolishReply() {
    const nextReply = replyBody.trim();

    if (!nextReply) {
      return;
    }

    const polishedReply = await onPolishReply(nextReply);
    setReplyBody(polishedReply);
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="overflow-hidden border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="border-b bg-card px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-xl leading-7">{ticket.subject}</CardTitle>
              <CardDescription className="mt-2">
                From {ticket.requesterEmail}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={
                  ticket.status === TicketStatusValue.Open ? "outline" : "secondary"
                }
              >
                {ticketStatusLabels[ticket.status]}
              </Badge>
              <Badge variant="secondary">
                {ticket.category
                  ? ticketCategoryLabels[ticket.category]
                  : "Uncategorized"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Reply thread</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Customer messages and support replies for this ticket.
              </p>
            </div>
            <Button
              disabled={isSummarizingTicket || ticket.messages.length === 0}
              onClick={onSummarizeTicket}
              type="button"
              variant="outline"
            >
              <TextSearch className="mr-2 size-4" />
              {isSummarizingTicket ? "Summarizing..." : "Summarize"}
            </Button>
          </div>
          {summary ? (
            <section
              aria-label="Ticket summary"
              className="rounded-md border border-teal-200 bg-teal-50 p-4"
            >
              <h3 className="text-sm font-semibold text-teal-950">Summary</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-teal-900">
                {summary}
              </p>
            </section>
          ) : null}
          {showSummaryError ? (
            <p className="text-xs text-destructive">{summaryError}</p>
          ) : null}
          {ticket.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            ticket.messages.map((message) => (
              <article
                className="rounded-md border bg-muted/45 p-4"
                key={message.id}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        message.direction === "inbound" ? "outline" : "secondary"
                      }
                    >
                      {message.direction === "inbound" ? "Customer" : "Support"}
                    </Badge>
                    <p className="text-sm font-medium">{message.senderEmail}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(message.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {message.body}
                </p>
              </article>
            ))
          )}
          <form className="rounded-md border bg-card p-4" onSubmit={handleReplySubmit}>
            <Label htmlFor="ticket-reply">Reply</Label>
            <textarea
              className="mt-2 min-h-32 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSendingReply}
              id="ticket-reply"
              onChange={(event) => setReplyBody(event.target.value)}
              placeholder="Write a support reply..."
              value={replyBody}
            />
            {showReplyError ? (
              <p className="mt-2 text-xs text-destructive">{replyError}</p>
            ) : null}
            {showPolishError ? (
              <p className="mt-2 text-xs text-destructive">{polishError}</p>
            ) : null}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                disabled={
                  isSendingReply ||
                  isPolishingReply ||
                  replyBody.trim().length === 0
                }
                onClick={handlePolishReply}
                type="button"
                variant="outline"
              >
                <Sparkles className="mr-2 size-4" />
                {isPolishingReply ? "Polishing..." : "Polish"}
              </Button>
              <Button
                disabled={
                  isSendingReply ||
                  isPolishingReply ||
                  replyBody.trim().length === 0
                }
                type="submit"
              >
                {isSendingReply ? "Sending..." : "Send reply"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="h-fit border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="border-b bg-card px-4 py-4">
          <CardTitle className="text-base">Properties</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 bg-card p-4 text-sm">
          <div className="space-y-2">
            <Label htmlFor="ticket-assignee">Assigned to</Label>
            <Select
              disabled={isAgentsLoading || isSavingTicket}
              onValueChange={(value) =>
                onUpdateTicket({
                  assignedToId: value === "unassigned" ? null : value
                })
              }
              value={ticket.assignedToId ?? "unassigned"}
            >
              <SelectTrigger id="ticket-assignee">
                <SelectValue placeholder="Assign ticket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ticket.assignedTo ? (
              <p className="text-xs text-muted-foreground">
                {ticket.assignedTo.email}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-status">Status</Label>
            <Select
              disabled={isSavingTicket}
              onValueChange={(value) =>
                onUpdateTicket({ status: value as TicketStatus })
              }
              value={ticket.status}
            >
              <SelectTrigger id="ticket-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {ticketStatuses.map((ticketStatus) => (
                  <SelectItem key={ticketStatus} value={ticketStatus}>
                    {ticketStatusLabels[ticketStatus]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-category">Category</Label>
            <Select
              disabled={isSavingTicket}
              onValueChange={(value) =>
                onUpdateTicket({
                  category: value === "uncategorized" ? null : (value as TicketCategory)
                })
              }
              value={ticket.category ?? "uncategorized"}
            >
              <SelectTrigger id="ticket-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uncategorized">Uncategorized</SelectItem>
                {ticketCategories.map((ticketCategory) => (
                  <SelectItem key={ticketCategory} value={ticketCategory}>
                    {ticketCategoryLabels[ticketCategory]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isSavingTicket ? (
            <p className="text-xs text-muted-foreground">Saving ticket...</p>
          ) : null}
          {showAssignmentError ? (
            <p className="text-xs text-destructive">
              {ticketUpdateError || assignmentError}
            </p>
          ) : null}
          <TicketProperty label="From" value={ticket.requesterEmail} />
          <TicketProperty label="Created" value={new Date(ticket.createdAt).toLocaleString()} />
          <TicketProperty label="Updated" value={new Date(ticket.updatedAt).toLocaleString()} />
          <TicketProperty label="Ticket ID" value={ticket.id} />
        </CardContent>
      </Card>
    </section>
  );
}

function TicketProperty({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-foreground">{value}</p>
    </div>
  );
}

function UsersPage() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const user = getSessionUser(session);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<HelpdeskUser | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const {
    formState: { errors: userFormErrors },
    handleSubmit: handleUserSubmit,
    register: registerUserField,
    reset: resetUserForm,
    setError: setUserFormError,
    setValue: setUserFormValue,
    watch: watchUserForm
  } = useForm<UserFormValues>({
    resolver: (...resolverArgs) =>
      zodResolver(editingUserId ? editUserFormSchema : createUserFormSchema)(
        ...resolverArgs
      ),
    defaultValues: emptyUserForm
  });
  const selectedRole = watchUserForm("role");
  const isActiveValue = watchUserForm("isActive");
  const {
    data: users = [],
    error: usersError,
    isFetching: isUsersFetching,
    isLoading: isUsersLoading,
    refetch: refetchUsers
  } = useQuery({
    queryKey: queryKeys.users,
    queryFn: listUsers
  });
  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users });
      setMessage("User created.");
      resetForm();
    }
  });
  const updateUserMutation = useMutation({
    mutationFn: ({
      userId,
      payload
    }: {
      userId: string;
      payload: Parameters<typeof updateUser>[1];
    }) => updateUser(userId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users });
      setMessage("User updated.");
      resetForm();
    }
  });
  const deactivateUserMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users });
      setMessage("User deactivated.");
    }
  });
  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async (_deletedUser, userId) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users });
      if (editingUserId === userId) {
        resetForm();
      }
      setDeleteCandidate(null);
      setMessage("User deleted.");
    }
  });
  const isSaving = createUserMutation.isPending || updateUserMutation.isPending;
  const isDeactivating = deactivateUserMutation.isPending;
  const isDeleting = deleteUserMutation.isPending;
  const loadError = getErrorMessage(usersError, "Failed to load users");

  function resetForm() {
    resetUserForm(emptyUserForm);
    setEditingUserId(null);
    setActionError(null);
  }

  function editUser(selectedUser: HelpdeskUser) {
    setEditingUserId(selectedUser.id);
    resetUserForm({
      name: selectedUser.name,
      email: selectedUser.email,
      password: "",
      role: selectedUser.role,
      isActive: selectedUser.isActive
    });
    setActionError(null);
    setMessage(null);
  }

  async function saveUser(values: UserFormValues) {
    setActionError(null);
    setMessage(null);

    try {
      if (editingUserId) {
        const payload = {
          name: values.name,
          email: values.email,
          role: values.role,
          isActive: values.isActive,
          ...(values.password ? { password: values.password } : {})
        };
        await updateUserMutation.mutateAsync({
          userId: editingUserId,
          payload
        });
      } else {
        await createUserMutation.mutateAsync({
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role,
          isActive: true
        });
      }
    } catch (caughtError) {
      if (caughtError instanceof UserApiError && caughtError.field) {
        setUserFormError(caughtError.field, {
          message: caughtError.message
        });
        return;
      }

      setActionError(
        caughtError instanceof Error ? caughtError.message : "Failed to save user"
      );
    }
  }

  async function handleDeactivate(selectedUser: HelpdeskUser) {
    if (selectedUser.id === user?.id) {
      setActionError("You cannot deactivate your own account.");
      return;
    }

    setActionError(null);
    setMessage(null);

    try {
      await deactivateUserMutation.mutateAsync(selectedUser.id);
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to deactivate user"
      );
    }
  }

  async function handleDelete() {
    if (!deleteCandidate) {
      return;
    }

    setActionError(null);
    setMessage(null);

    try {
      await deleteUserMutation.mutateAsync(deleteCandidate.id);
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error ? caughtError.message : "Failed to delete user"
      );
    }
  }

  return (
    <main className={appShellClass}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Nav isAdmin userName={user?.name ?? "Admin"} />

        <header className="flex flex-col gap-2 border-b pb-5">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Admin
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Manage helpdesk access for admins and support agents.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="h-fit">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">
                {editingUserId ? "Edit User" : "Create User"}
              </CardTitle>
              <CardDescription>
                {editingUserId
                  ? "Update access and account details."
                  : "Add an admin or support agent."}
              </CardDescription>
            </CardHeader>
            <form autoComplete="off" onSubmit={handleUserSubmit(saveUser)}>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <Label htmlFor="user-name">Name</Label>
                  <Input
                    autoComplete="off"
                    aria-invalid={userFormErrors.name ? "true" : "false"}
                    className={cn(
                      userFormErrors.name &&
                        "border-destructive/80 focus-visible:ring-1 focus-visible:ring-destructive/80 focus-visible:ring-offset-0"
                    )}
                    id="user-name"
                    placeholder="Full name"
                    {...registerUserField("name")}
                  />
                  {userFormErrors.name ? (
                    <p className="text-sm text-destructive">
                      {userFormErrors.name.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-email">Email</Label>
                  <Input
                    autoComplete="off"
                    aria-invalid={userFormErrors.email ? "true" : "false"}
                    className={cn(
                      userFormErrors.email &&
                        "border-destructive/80 focus-visible:ring-1 focus-visible:ring-destructive/80 focus-visible:ring-offset-0"
                    )}
                    id="user-email"
                    placeholder="user@example.com"
                    type="email"
                    {...registerUserField("email")}
                  />
                  {userFormErrors.email ? (
                    <p className="text-sm text-destructive">
                      {userFormErrors.email.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-password">
                    {editingUserId ? "New password" : "Password"}
                  </Label>
                  <Input
                    autoComplete="new-password"
                    aria-invalid={userFormErrors.password ? "true" : "false"}
                    className={cn(
                      userFormErrors.password &&
                        "border-destructive/80 focus-visible:ring-1 focus-visible:ring-destructive/80 focus-visible:ring-offset-0"
                    )}
                    id="user-password"
                    placeholder={
                      editingUserId
                        ? "Leave blank to keep current"
                        : "Minimum 8 characters"
                    }
                    type="password"
                    {...registerUserField("password")}
                  />
                  {userFormErrors.password ? (
                    <p className="text-sm text-destructive">
                      {userFormErrors.password.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-role">Role</Label>
                  <Select
                    onValueChange={(value) =>
                      setUserFormValue("role", value as UserRole, {
                        shouldDirty: true,
                        shouldValidate: true
                      })
                    }
                    value={selectedRole}
                  >
                    <SelectTrigger id="user-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editingUserId ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      checked={isActiveValue}
                      disabled={editingUserId === user?.id}
                      onChange={(event) =>
                        setUserFormValue("isActive", event.target.checked, {
                          shouldDirty: true,
                          shouldValidate: true
                        })
                      }
                      type="checkbox"
                    />
                    Active account
                  </label>
                ) : null}

                {actionError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Unable to save user</AlertTitle>
                    <AlertDescription>{actionError}</AlertDescription>
                  </Alert>
                ) : null}

                {message ? (
                  <Alert>
                    <AlertTitle>Saved</AlertTitle>
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                ) : null}
              </CardContent>
              <CardFooter className="flex gap-2 px-4 pb-4">
                <Button disabled={isSaving} type="submit">
                  {isSaving
                    ? "Saving..."
                    : editingUserId
                      ? "Save changes"
                      : "Create user"}
                </Button>
                {editingUserId ? (
                  <Button onClick={resetForm} type="button" variant="outline">
                    Cancel
                  </Button>
                ) : null}
              </CardFooter>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Team Members</CardTitle>
                <CardDescription>
                  Manage helpdesk admins and support agents.
                </CardDescription>
              </div>
              <Button
                disabled={isUsersFetching}
                onClick={() => void refetchUsers()}
                type="button"
                variant="outline"
              >
                {isUsersFetching ? "Refreshing..." : "Refresh"}
              </Button>
            </CardHeader>
            {isUsersLoading ? (
              <UserListSkeleton />
            ) : usersError ? (
              <StateMessage message={loadError} />
            ) : users.length === 0 ? (
              <StateMessage message="No users found." />
            ) : (
              <UserList
                currentUserId={user?.id}
                isDeactivating={isDeactivating}
                isDeleting={isDeleting}
                onDeactivate={handleDeactivate}
                onDelete={(teamMember) => {
                  setActionError(null);
                  setMessage(null);
                  setDeleteCandidate(teamMember);
                }}
                onEdit={editUser}
                users={users}
              />
            )}
          </Card>
        </section>
      </div>
      {deleteCandidate ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-lg border bg-background p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Delete user?</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Delete {deleteCandidate.name} ({deleteCandidate.email})? The user
              will be removed from the active list, sessions will be cleared, and
              the email can be reused.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                disabled={isDeleting}
                onClick={() => setDeleteCandidate(null)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={isDeleting}
                onClick={() => {
                  void handleDelete();
                }}
                type="button"
                variant="destructive"
              >
                {isDeleting ? "Deleting..." : "Delete user"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function TicketList({ tickets }: { tickets: Ticket[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true }
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10
  });
  const columns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        accessorKey: "subject",
        header: "Subject"
      },
      {
        accessorKey: "requesterEmail",
        header: "From"
      },
      {
        accessorKey: "status",
        header: "Status"
      },
      {
        accessorKey: "category",
        header: "Category",
        sortingFn: (rowA, rowB) => {
          const first = rowA.original.category
            ? ticketCategoryLabels[rowA.original.category]
            : "Uncategorized";
          const second = rowB.original.category
            ? ticketCategoryLabels[rowB.original.category]
            : "Uncategorized";

          return first.localeCompare(second);
        }
      },
      {
        accessorFn: (ticket) => new Date(ticket.createdAt).getTime(),
        id: "createdAt",
        header: "Created"
      }
    ],
    []
  );
  const table = useReactTable({
    columns,
    data: tickets,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: { pagination, sorting }
  });

  return (
    <>
      <div className="max-h-[62vh] overflow-auto bg-card">
        <div className="min-w-[58rem]">
          {table.getHeaderGroups().map((headerGroup) => (
            <div
              className="sticky top-0 z-10 grid grid-cols-[minmax(16rem,1.5fr)_minmax(13rem,1fr)_9rem_12rem_11rem] gap-3 border-b bg-muted px-4 py-2 shadow-sm"
              key={headerGroup.id}
            >
              {headerGroup.headers.map((header) => (
                <SortableHeader
                  column={header.column}
                  key={header.id}
                  label={String(
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                />
              ))}
            </div>
          ))}
          <div className="divide-y divide-border">
            {table.getRowModel().rows.map((row) => {
              const ticket = row.original;

              return (
                <article
                  className="grid grid-cols-[minmax(16rem,1.5fr)_minmax(13rem,1fr)_9rem_12rem_11rem] gap-3 px-4 py-4 text-foreground transition-colors hover:bg-muted/70"
                  key={ticket.id}
                >
                  <div className="min-w-0">
                    <Link
                      className="block truncate font-medium text-foreground underline-offset-4 hover:text-teal-700 hover:underline focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 dark:hover:text-teal-300"
                      to={`/tickets/${ticket.id}`}
                    >
                      {ticket.subject}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {new Date(ticket.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {ticket.requesterEmail}
                  </p>
                  <div>
                    <Badge
                      variant={
                        ticket.status === TicketStatusValue.Open
                          ? "outline"
                          : "secondary"
                      }
                    >
                      {ticketStatusLabels[ticket.status]}
                    </Badge>
                  </div>
                  <div>
                    <Badge variant="secondary">
                      {ticket.category
                        ? ticketCategoryLabels[ticket.category]
                        : "Uncategorized"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
      <PaginationControls
        itemLabel="tickets"
        pageIndex={table.getState().pagination.pageIndex}
        pageSize={table.getState().pagination.pageSize}
        pageSizeOptions={pageSizeOptions}
        pageCount={table.getPageCount()}
        totalItems={tickets.length}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
        onPreviousPage={() => table.previousPage()}
        onNextPage={() => table.nextPage()}
        onPageSizeChange={(pageSize) => table.setPageSize(pageSize)}
      />
    </>
  );
}

function UserList({
  currentUserId,
  isDeactivating,
  isDeleting,
  onDeactivate,
  onDelete,
  onEdit,
  users
}: {
  currentUserId?: string | null;
  isDeactivating: boolean;
  isDeleting: boolean;
  onDeactivate: (selectedUser: HelpdeskUser) => Promise<void>;
  onDelete: (selectedUser: HelpdeskUser) => void;
  onEdit: (selectedUser: HelpdeskUser) => void;
  users: HelpdeskUser[];
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true }
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10
  });
  const columns = useMemo<ColumnDef<HelpdeskUser>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name"
      },
      {
        accessorKey: "email",
        header: "Email"
      },
      {
        accessorKey: "role",
        header: "Role"
      },
      {
        accessorFn: (teamMember) => (teamMember.isActive ? "Active" : "Inactive"),
        id: "isActive",
        header: "Status"
      },
      {
        accessorFn: (teamMember) => new Date(teamMember.createdAt).getTime(),
        id: "createdAt",
        header: "Added"
      }
    ],
    []
  );
  const table = useReactTable({
    columns,
    data: users,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: { pagination, sorting }
  });

  return (
    <>
      <div className="max-h-[62vh] overflow-auto bg-card">
        <div className="min-w-[58rem]">
          {table.getHeaderGroups().map((headerGroup) => (
            <div
              className="sticky top-0 z-10 grid grid-cols-[minmax(12rem,1.1fr)_minmax(14rem,1.2fr)_8rem_8rem_9rem_3rem] gap-3 border-b bg-muted px-4 py-2 shadow-sm"
              key={headerGroup.id}
            >
              {headerGroup.headers.map((header) => (
                <SortableHeader
                  column={header.column}
                  key={header.id}
                  label={String(
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                />
              ))}
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Actions
              </span>
            </div>
          ))}
          <div className="divide-y divide-border">
            {table.getRowModel().rows.map((row) => {
              const teamMember = row.original;

              return (
                <article
                  className="grid grid-cols-[minmax(12rem,1.1fr)_minmax(14rem,1.2fr)_8rem_8rem_9rem_3rem] items-center gap-3 px-4 py-4 text-foreground transition-colors hover:bg-muted/70"
                  key={teamMember.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-medium">{teamMember.name}</h2>
                      {teamMember.id === currentUserId ? (
                        <Badge variant="secondary">You</Badge>
                      ) : null}
                    </div>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {teamMember.email}
                  </p>
                  <div>
                    <Badge variant="secondary">
                      {teamMember.role === "admin" ? "Admin" : "Agent"}
                    </Badge>
                  </div>
                  <div>
                    <Badge variant={teamMember.isActive ? "outline" : "destructive"}>
                      {teamMember.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(teamMember.createdAt).toLocaleDateString()}
                  </p>
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label={`Open actions for ${teamMember.name}`}
                          className="size-8 p-0"
                          type="button"
                          variant="outline"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEdit(teamMember)}>
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        {teamMember.isActive && teamMember.id !== currentUserId ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={isDeactivating}
                              onSelect={() => {
                                void onDeactivate(teamMember);
                              }}
                            >
                              <UserX className="mr-2 size-4" />
                              Deactivate
                            </DropdownMenuItem>
                          </>
                        ) : null}
                        {teamMember.role === "agent" ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={isDeleting}
                              onSelect={() => onDelete(teamMember)}
                            >
                              <Trash2 className="mr-2 size-4" />
                              Delete user
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
      <PaginationControls
        itemLabel="users"
        pageIndex={table.getState().pagination.pageIndex}
        pageSize={table.getState().pagination.pageSize}
        pageSizeOptions={pageSizeOptions}
        pageCount={table.getPageCount()}
        totalItems={users.length}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
        onPreviousPage={() => table.previousPage()}
        onNextPage={() => table.nextPage()}
        onPageSizeChange={(pageSize) => table.setPageSize(pageSize)}
      />
    </>
  );
}

function PaginationControls({
  canNextPage,
  canPreviousPage,
  itemLabel,
  onNextPage,
  onPageSizeChange,
  onPreviousPage,
  pageCount,
  pageIndex,
  pageSize,
  pageSizeOptions,
  totalItems
}: {
  canNextPage: boolean;
  canPreviousPage: boolean;
  itemLabel: string;
  onNextPage: () => void;
  onPageSizeChange: (pageSize: number) => void;
  onPreviousPage: () => void;
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  pageSizeOptions: number[];
  totalItems: number;
}) {
  const firstItem = totalItems === 0 ? 0 : pageIndex * pageSize + 1;
  const lastItem = Math.min(totalItems, (pageIndex + 1) * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t bg-card px-4 py-3 text-card-foreground sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-muted-foreground">
        Showing {firstItem}-{lastItem} of {totalItems} {itemLabel}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium text-muted-foreground" htmlFor={`${itemLabel}-page-size`}>
            Rows
          </Label>
          <Select
            onValueChange={(value) => onPageSizeChange(Number(value))}
            value={String(pageSize)}
          >
            <SelectTrigger
              className="h-9 w-20 border-border bg-background text-foreground shadow-sm dark:bg-slate-950"
              id={`${itemLabel}-page-size`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="min-w-24 text-sm font-medium text-muted-foreground">
          Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
        </p>
        <div className="flex gap-2">
          <Button
            aria-label={`Previous ${itemLabel} page`}
            disabled={!canPreviousPage}
            onClick={onPreviousPage}
            size="icon"
            type="button"
            variant="outline"
            className="border-border bg-background text-foreground shadow-sm hover:bg-muted disabled:opacity-50 dark:bg-slate-950"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            aria-label={`Next ${itemLabel} page`}
            disabled={!canNextPage}
            onClick={onNextPage}
            size="icon"
            type="button"
            variant="outline"
            className="border-border bg-background text-foreground shadow-sm hover:bg-muted disabled:opacity-50 dark:bg-slate-950"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SortableHeader<TData>({
  column,
  label
}: {
  column: Column<TData, unknown>;
  label: string;
}) {
  const sorted = column.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <Button
      aria-label={`Sort by ${label}`}
      className="h-8 justify-start gap-1 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
      onClick={column.getToggleSortingHandler()}
      type="button"
      variant="ghost"
    >
      <span className="truncate">{label}</span>
      <Icon className="size-3.5 shrink-0" />
    </Button>
  );
}

function Nav({ isAdmin, userName }: { isAdmin: boolean; userName: string }) {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { theme, toggleTheme } = useThemeMode();
  const isDarkTheme = theme === "dark";

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
    <nav className="sticky top-0 z-50 flex flex-col gap-4 border border-slate-800 bg-[#172026]/95 px-4 py-3 text-white shadow-lg shadow-slate-900/15 backdrop-blur dark:border-white/10 dark:bg-slate-950/90 sm:top-4 sm:rounded-lg sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-4">
        <Link className="flex items-center gap-3 text-white" to="/">
          <span className="grid size-10 place-items-center rounded-lg bg-teal-700 text-base font-semibold text-white shadow-sm ring-1 ring-white/15">
            H
          </span>
          <span>
            <span className="block text-lg font-semibold leading-5">Helpdesk</span>
            <span className="mt-0.5 block text-xs font-medium uppercase tracking-wide text-teal-100/80">
              Support console
            </span>
          </span>
        </Link>
        <div className="h-6 w-px bg-white/15" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <Button
            asChild
            className="h-8 border-transparent bg-transparent px-2 text-xs text-slate-300 shadow-none hover:bg-white/10 hover:text-white"
            variant="ghost"
          >
            <Link to="/tickets">Tickets</Link>
          </Button>
          {isAdmin ? (
            <Button
              asChild
              className="h-8 border-transparent bg-transparent px-2 text-xs text-slate-300 shadow-none hover:bg-white/10 hover:text-white"
              variant="ghost"
            >
              <Link to="/users">Users</Link>
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <div className="flex items-center gap-2">
          <Button
            aria-label={isDarkTheme ? "Switch to light view" : "Switch to dark view"}
            className="size-8 border-transparent bg-transparent p-0 text-sm text-slate-300 shadow-none hover:bg-white/10 hover:text-white"
            onClick={toggleTheme}
            title={isDarkTheme ? "Light view" : "Dark view"}
            type="button"
            variant="ghost"
          >
            {isDarkTheme ? "☀️" : "🌙"}
          </Button>
          <Badge className="gap-1.5 border-transparent bg-transparent px-2 py-1 text-xs font-medium text-slate-300 shadow-none hover:bg-transparent">
            {isAdmin ? (
              <ShieldCheck className="size-3.5 text-slate-400" />
            ) : (
              <span className="size-1.5 rounded-full bg-slate-400" />
            )}
            <span className="max-w-40 truncate">
              {isAdmin ? "Admin" : userName}
            </span>
          </Badge>
          <Button
            className="h-8 gap-1.5 border-transparent bg-transparent px-2 text-xs text-slate-300 shadow-none hover:bg-white/10 hover:text-white"
            disabled={isSigningOut}
            onClick={handleSignOut}
            type="button"
            variant="ghost"
          >
            <LogOut className="size-3.5" />
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </div>
    </nav>
  );
}

function Metric({
  active = false,
  href,
  icon,
  label,
  loading = false,
  value
}: {
  active?: boolean;
  href: string;
  icon?: ReactNode;
  label: string;
  loading?: boolean;
  value: number | string;
}) {
  return (
    <Link
      className={cn(
        "block rounded-lg border bg-card text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-teal-700/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 dark:border-white/10 dark:bg-[#161618] dark:shadow-black/20 dark:hover:border-white/20",
        active && "border-teal-700 bg-teal-50 dark:border-teal-300/70 dark:bg-teal-950/50"
      )}
      to={href}
    >
      <CardContent className="flex min-h-28 flex-col justify-between px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            {label}
          </p>
          {icon ? (
            <span className="grid size-6 shrink-0 place-items-center rounded-md border bg-muted text-muted-foreground shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              {icon}
            </span>
          ) : null}
        </div>
        <p className="text-2xl font-semibold tracking-tight text-foreground dark:text-slate-50">
          {loading ? "..." : value}
        </p>
      </CardContent>
    </Link>
  );
}

function TicketVolumeChart({
  data,
  loading
}: {
  data: Array<{ count: number; date: Date; key: string }>;
  loading: boolean;
}) {
  const maxCount = Math.max(...data.map((day) => day.count), 1);
  const totalTickets = data.reduce((total, day) => total + day.count, 0);
  const firstDay = data[0]?.date;
  const lastDay = data[data.length - 1]?.date;
  const dateRange =
    firstDay && lastDay
      ? `${firstDay.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric"
        })} - ${lastDay.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric"
        })}`
      : "Past 30 days";

  return (
    <section className={cn("rounded-lg border p-4", panelClass, "dark:bg-slate-900/80")}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Tickets per day
          </h2>
          <p className="text-sm text-muted-foreground">
            Total ticket volume over the past 30 days.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-2xl font-semibold">
            {loading ? "..." : totalTickets}
          </p>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {dateRange}
          </p>
        </div>
      </div>

      <div
        aria-label="Total number of tickets per day over the past 30 days"
        className="mt-6 flex h-56 items-stretch gap-1 border-b border-l border-border px-2 pb-2 pt-4"
        role="img"
      >
        {data.map((day, index) => {
          const height = day.count === 0 ? 4 : Math.max(10, (day.count / maxCount) * 100);
          const label = day.date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric"
          });
          const showDateLabel = index === 0 || index === data.length - 1;

          return (
            <div
              className="group flex min-w-0 flex-1 flex-col items-center gap-2"
              key={day.key}
            >
              <div className="relative flex min-h-0 w-full flex-1 items-end justify-center">
                <div
                  className="relative flex w-full max-w-5 justify-center"
                  style={{ height: `${height}%` }}
                >
                  <div
                    aria-label={`${label}: ${day.count} tickets`}
                    className="h-full w-full rounded-t bg-teal-700 transition group-hover:bg-teal-900 dark:bg-teal-400 dark:group-hover:bg-teal-300"
                    title={`${label}: ${day.count} tickets`}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 min-w-max -translate-x-1/2 rounded-md bg-slate-950 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 transition group-hover:opacity-100 dark:bg-white dark:text-slate-950">
                    {day.count} {day.count === 1 ? "ticket" : "tickets"}
                    <span className="ml-1 text-white/70 dark:text-slate-500">
                      {label}
                    </span>
                  </div>
                </div>
              </div>
              <span className="h-4 text-[10px] font-medium text-muted-foreground">
                {showDateLabel ? label : ""}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StateMessage({ message }: { message: string }) {
  return <p className="px-4 py-8 text-sm text-muted-foreground">{message}</p>;
}

function TicketListSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
          key={index}
        >
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4 max-w-md" />
            <Skeleton className="h-4 w-52" />
          </div>
          <div className="flex gap-2 sm:justify-end">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TicketDetailsSkeleton() {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="overflow-hidden border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="border-b bg-card px-4 py-4">
          <Skeleton className="h-7 w-3/4 max-w-2xl" />
          <Skeleton className="mt-3 h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4 bg-card p-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div className="rounded-md border bg-muted/45 p-4" key={index}>
              <div className="flex justify-between gap-3">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-5/6" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="h-fit border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="border-b bg-card px-4 py-4">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-4 bg-card p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </section>
  );
}

function UserListSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          className="grid gap-4 px-4 py-4 xl:grid-cols-[1fr_auto] xl:items-center"
          key={index}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-9 w-14" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FullPageSkeleton() {
  return (
    <main className={cn(appShellClass, "px-4 py-6 sm:px-6 lg:px-8")}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="rounded-lg border border-slate-800 bg-[#172026] px-4 py-3 shadow-lg shadow-slate-900/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 bg-white/15" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-28 bg-white/15" />
                <Skeleton className="h-3 w-36 bg-white/15" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 bg-white/15" />
              <Skeleton className="h-8 w-28 bg-white/15" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-64" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-72">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card>
            <CardHeader className="p-4 pb-0">
              <Skeleton className="h-5 w-20" />
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b px-4 py-3">
              <Skeleton className="h-5 w-20" />
            </CardHeader>
            <TicketListSkeleton />
          </Card>
        </section>
      </div>
    </main>
  );
}
