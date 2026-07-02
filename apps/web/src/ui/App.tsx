import {
  type ReactNode,
  useEffect,
  useMemo,
  useState
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { Navigate, Route, Routes, useNavigate } from "react-router";
import { z } from "zod";
import { authClient } from "../api/auth";
import { listTickets, type Ticket } from "../api/tickets";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
type UserRole = "admin" | "agent";
type SessionUser = {
  email?: string | null;
  name?: string | null;
  role?: UserRole | null;
  isActive?: boolean | null;
};

const selectClassName =
  "mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function getSessionUser(session: unknown): SessionUser | null {
  if (!session || typeof session !== "object" || !("user" in session)) {
    return null;
  }

  return (session as { user?: SessionUser }).user ?? null;
}

function isAdminSession(session: unknown) {
  return getSessionUser(session)?.role === "admin";
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
    return <FullPageMessage message="Checking session..." />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <FullPageMessage message="Checking session..." />;
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
    return <FullPageMessage message="Checking session..." />;
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
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Use your helpdesk account to access the support dashboard.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(signIn)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                autoComplete="email"
                aria-invalid={errors.email ? "true" : "false"}
                className={cn(
                  errors.email &&
                    "border-destructive/80 focus-visible:ring-1 focus-visible:ring-destructive/80 focus-visible:ring-offset-0"
                )}
                id="email"
                {...register("email")}
                type="email"
              />
              {errors.email ? (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  autoComplete="current-password"
                  aria-invalid={errors.password ? "true" : "false"}
                  className={cn(
                    "pr-10",
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

          <CardFooter>
            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}

function DashboardPage() {
  const { data: session } = authClient.useSession();
  const user = getSessionUser(session);
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
          <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-72">
            <Metric label="Open" value={openTickets} />
            <Metric label="Total" value={tickets.length} />
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div>
                <Label htmlFor="status-filter">Status</Label>
                <select className={selectClassName} id="status-filter">
                  <option>All statuses</option>
                  <option>Open</option>
                  <option>Resolved</option>
                  <option>Closed</option>
                </select>
              </div>
              <div>
                <Label htmlFor="category-filter">Category</Label>
                <select className={selectClassName} id="category-filter">
                  <option>All categories</option>
                  <option>General question</option>
                  <option>Technical question</option>
                  <option>Refund request</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-base">Tickets</CardTitle>
            </CardHeader>

            {isLoading ? (
              <StateMessage message="Loading tickets..." />
            ) : error ? (
              <StateMessage message={error} />
            ) : (
              <div className="divide-y">
                {tickets.map((ticket) => (
                  <article
                    className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                    key={ticket.id}
                  >
                    <div>
                      <h3 className="font-medium">{ticket.subject}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {ticket.requesterEmail}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <Badge variant="secondary">
                        {statusLabels[ticket.status]}
                      </Badge>
                      <Badge variant="outline">
                        {categoryLabels[ticket.category]}
                      </Badge>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}

function UsersPage() {
  const { data: session } = authClient.useSession();
  const user = getSessionUser(session);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#d7f4ee_0,_transparent_34rem),linear-gradient(180deg,_#f8fbfb_0%,_#eef3f5_100%)]">
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
          <Card>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-base">Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 text-sm text-muted-foreground">
              <p>Only admins can view this page.</p>
              <Badge className="bg-teal-50 text-teal-800 hover:bg-teal-50">
                Admin only
              </Badge>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-base">Team Members</CardTitle>
              <CardDescription>
                User creation and role editing can be connected here next.
              </CardDescription>
            </CardHeader>
            <div className="divide-y">
              <article className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <h2 className="font-medium">{user?.name ?? "Admin"}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {user?.email ?? "admin@example.com"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Badge variant="secondary">Admin</Badge>
                  <Badge variant="outline">
                    {user?.isActive === false ? "Inactive" : "Active"}
                  </Badge>
                </div>
              </article>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}

function Nav({ isAdmin, userName }: { isAdmin: boolean; userName: string }) {
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
    <nav className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-[#172026] px-4 py-3 text-white shadow-lg shadow-slate-900/10 sm:flex-row sm:items-center sm:justify-between">
      <a className="flex items-center gap-3 text-white" href="/">
        <span className="grid size-10 place-items-center rounded-lg bg-teal-700 text-base font-semibold text-white shadow-sm ring-1 ring-white/15">
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
        {isAdmin ? (
          <Button
            asChild
            className="h-8 border-white/15 bg-white/10 px-3 text-sm text-white shadow-sm hover:bg-white/15 hover:text-white"
            variant="outline"
          >
            <a href="/users">Users</a>
          </Button>
        ) : null}
        <Badge className="border-white/10 bg-white/10 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-white/10">
          <span className="mr-2 inline-block size-2 rounded-full bg-emerald-300" />
          {userName}
        </Badge>
        <Button
          className="h-8 border-transparent bg-white px-3 text-sm text-[#172026] shadow-sm hover:bg-teal-50 hover:text-[#172026]"
          disabled={isSigningOut}
          onClick={handleSignOut}
          type="button"
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </Button>
      </div>
    </nav>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function StateMessage({ message }: { message: string }) {
  return <p className="px-4 py-8 text-sm text-muted-foreground">{message}</p>;
}

function FullPageMessage({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
