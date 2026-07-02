import {
  type ReactNode,
  useMemo,
  useState
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Headphones, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Navigate, Route, Routes, useNavigate } from "react-router";
import { z } from "zod";
import { authClient } from "../api/auth";
import { listTickets } from "../api/tickets";
import {
  createUser,
  deactivateUser,
  listUsers,
  updateUser,
  type HelpdeskUser,
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

const queryKeys = {
  tickets: ["tickets"],
  users: ["users"]
} as const;

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

type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
};

const emptyUserForm: UserFormState = {
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
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#d7f4ee_0,_transparent_34rem),linear-gradient(180deg,_#f8fbfb_0%,_#eef3f5_100%)] px-4 py-8">
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
    error,
    isLoading
  } = useQuery({
    queryKey: queryKeys.tickets,
    queryFn: listTickets
  });

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
                <Select defaultValue="all">
                  <SelectTrigger className="mt-2" id="status-filter">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category-filter">Category</Label>
                <Select defaultValue="all">
                  <SelectTrigger className="mt-2" id="category-filter">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="general_question">General question</SelectItem>
                    <SelectItem value="technical_question">
                      Technical question
                    </SelectItem>
                    <SelectItem value="refund_request">Refund request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-base">Tickets</CardTitle>
            </CardHeader>

            {isLoading ? (
              <TicketListSkeleton />
            ) : error ? (
              <StateMessage message={getErrorMessage(error, "Something went wrong")} />
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
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const user = getSessionUser(session);
  const [form, setForm] = useState<UserFormState>(emptyUserForm);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
  const isSaving = createUserMutation.isPending || updateUserMutation.isPending;
  const isDeactivating = deactivateUserMutation.isPending;
  const loadError = getErrorMessage(usersError, "Failed to load users");

  function updateForm<Value extends keyof UserFormState>(
    key: Value,
    value: UserFormState[Value]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function resetForm() {
    setForm(emptyUserForm);
    setEditingUserId(null);
    setError(null);
  }

  function editUser(selectedUser: HelpdeskUser) {
    setEditingUserId(selectedUser.id);
    setForm({
      name: selectedUser.name,
      email: selectedUser.email,
      password: "",
      role: selectedUser.role,
      isActive: selectedUser.isActive
    });
    setError(null);
    setMessage(null);
  }

  async function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      if (editingUserId) {
        const payload = {
          name: form.name,
          email: form.email,
          role: form.role,
          isActive: form.isActive,
          ...(form.password ? { password: form.password } : {})
        };
        await updateUserMutation.mutateAsync({
          userId: editingUserId,
          payload
        });
      } else {
        await createUserMutation.mutateAsync({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          isActive: true
        });
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Failed to save user"
      );
    }
  }

  async function handleDeactivate(selectedUser: HelpdeskUser) {
    if (selectedUser.id === user?.id) {
      setError("You cannot deactivate your own account.");
      return;
    }

    setError(null);
    setMessage(null);

    try {
      await deactivateUserMutation.mutateAsync(selectedUser.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to deactivate user"
      );
    }
  }

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
            <form autoComplete="off" onSubmit={saveUser}>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <Label htmlFor="user-name">Name</Label>
                  <Input
                    autoComplete="off"
                    id="user-name"
                    name="helpdesk-user-display-name"
                    onChange={(event) => updateForm("name", event.target.value)}
                    required
                    value={form.name}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-email">Email</Label>
                  <Input
                    autoComplete="off"
                    id="user-email"
                    name="helpdesk-user-email"
                    onChange={(event) => updateForm("email", event.target.value)}
                    required
                    type="email"
                    value={form.email}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-password">
                    {editingUserId ? "New password" : "Password"}
                  </Label>
                  <Input
                    autoComplete="new-password"
                    id="user-password"
                    minLength={8}
                    name="helpdesk-user-new-password"
                    onChange={(event) =>
                      updateForm("password", event.target.value)
                    }
                    placeholder={editingUserId ? "Leave blank to keep current" : ""}
                    required={!editingUserId}
                    type="password"
                    value={form.password}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-role">Role</Label>
                  <Select
                    onValueChange={(value) => updateForm("role", value as UserRole)}
                    value={form.role}
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
                      checked={form.isActive}
                      disabled={editingUserId === user?.id}
                      onChange={(event) =>
                        updateForm("isActive", event.target.checked)
                      }
                      type="checkbox"
                    />
                    Active account
                  </label>
                ) : null}

                {error ? (
                  <Alert variant="destructive">
                    <AlertTitle>User action failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
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
              <div className="divide-y">
                {users.map((teamMember) => (
                  <article
                    className="grid gap-4 px-4 py-4 xl:grid-cols-[1fr_auto] xl:items-center"
                    key={teamMember.id}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-medium">{teamMember.name}</h2>
                        {teamMember.id === user?.id ? (
                          <Badge variant="secondary">You</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {teamMember.email}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Added {new Date(teamMember.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <Badge variant="secondary">
                        {teamMember.role === "admin" ? "Admin" : "Agent"}
                      </Badge>
                      <Badge variant={teamMember.isActive ? "outline" : "destructive"}>
                        {teamMember.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        onClick={() => editUser(teamMember)}
                        type="button"
                        variant="outline"
                      >
                        Edit
                      </Button>
                      <Button
                        disabled={
                          !teamMember.isActive ||
                          teamMember.id === user?.id ||
                          isDeactivating
                        }
                        onClick={() => handleDeactivate(teamMember)}
                        type="button"
                        variant="destructive"
                      >
                        Deactivate
                      </Button>
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
    <nav className="sticky top-4 z-50 flex flex-col gap-4 rounded-lg border border-slate-800 bg-[#172026] px-4 py-3 text-white shadow-lg shadow-slate-900/10 sm:flex-row sm:items-center sm:justify-between">
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#d7f4ee_0,_transparent_34rem),linear-gradient(180deg,_#f8fbfb_0%,_#eef3f5_100%)] px-4 py-6 sm:px-6 lg:px-8">
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
