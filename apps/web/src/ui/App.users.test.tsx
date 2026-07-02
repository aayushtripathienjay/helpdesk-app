import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { App } from "./App";
import {
  createUser,
  deactivateUser,
  listUsers,
  updateUser,
  UserApiError,
  type HelpdeskUser
} from "../api/users";
import { renderWithQuery } from "../test/render-with-query";

const mocks = vi.hoisted(() => {
  class MockUserApiError extends Error {
    field?: string;

    constructor(message: string, field?: string) {
      super(message);
      this.name = "UserApiError";
      this.field = field;
    }
  }

  return {
    createUser: vi.fn(),
    deactivateUser: vi.fn(),
    listUsers: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn(),
    UserApiError: MockUserApiError
  };
});

vi.mock("../api/auth", () => ({
  authClient: {
    signOut: mocks.signOut,
    useSession: () => ({
      data: {
        user: {
          id: "admin-1",
          email: "admin@example.com",
          name: "Admin User",
          role: "admin",
          isActive: true
        }
      },
      isPending: false
    })
  }
}));

vi.mock("../api/users", () => ({
  createUser: mocks.createUser,
  deactivateUser: mocks.deactivateUser,
  listUsers: mocks.listUsers,
  updateUser: mocks.updateUser,
  UserApiError: mocks.UserApiError
}));

const adminUser: HelpdeskUser = {
  id: "admin-1",
  name: "Admin User",
  email: "admin@example.com",
  emailVerified: true,
  role: "admin",
  isActive: true,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z"
};

const agentUser: HelpdeskUser = {
  id: "agent-1",
  name: "Agent User",
  email: "agent@example.com",
  emailVerified: true,
  role: "agent",
  isActive: true,
  createdAt: "2026-07-02T00:00:00.000Z",
  updatedAt: "2026-07-02T00:00:00.000Z"
};

function renderUsersPage() {
  return renderWithQuery(<App />, {
    initialEntries: ["/users"]
  });
}

describe("Users page", () => {
  beforeEach(() => {
    vi.mocked(createUser).mockReset();
    vi.mocked(deactivateUser).mockReset();
    vi.mocked(listUsers).mockReset();
    vi.mocked(updateUser).mockReset();
  });

  test("renders user rows returned by the users API", async () => {
    vi.mocked(listUsers).mockResolvedValue([adminUser, agentUser]);

    renderUsersPage();

    expect(await screen.findByRole("heading", { name: "Users" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Team Members" })).toBeVisible();
    expect(await screen.findByText("admin@example.com")).toBeVisible();
    expect(screen.getAllByText("Admin User").length).toBeGreaterThan(0);
    expect(screen.getByText("Agent User")).toBeVisible();
    expect(screen.getByText("agent@example.com")).toBeVisible();
    expect(screen.getByText("You")).toBeVisible();

    const agentRow = screen.getByText("agent@example.com").closest("article");
    expect(agentRow).not.toBeNull();
    expect(within(agentRow!).getByText("Agent")).toBeVisible();
    expect(within(agentRow!).getByText("Active")).toBeVisible();
  });

  test("shows skeleton rows while users are loading", () => {
    vi.mocked(listUsers).mockReturnValue(new Promise<HelpdeskUser[]>(() => undefined));

    const { container } = renderUsersPage();

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByText("No users found.")).not.toBeInTheDocument();
  });

  test("shows an error message when the users API fails", async () => {
    vi.mocked(listUsers).mockRejectedValue(new Error("Failed to load test users"));

    renderUsersPage();

    expect(await screen.findByText("Failed to load test users")).toBeVisible();
  });

  test("validates required create-user fields", async () => {
    vi.mocked(listUsers).mockResolvedValue([adminUser]);

    const user = userEvent.setup();
    renderUsersPage();

    await screen.findByText("admin@example.com");
    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(await screen.findByText("Enter a name")).toBeVisible();
    expect(screen.getByText("Enter a valid email address")).toBeVisible();
    expect(screen.getByText("Minimum 8 characters")).toBeVisible();
    expect(vi.mocked(createUser)).not.toHaveBeenCalled();
  });

  test("creates a user with the default agent role", async () => {
    const createdUser: HelpdeskUser = {
      ...agentUser,
      id: "agent-2",
      name: "New Agent",
      email: "new.agent@example.com"
    };
    vi.mocked(listUsers).mockResolvedValue([adminUser]);
    vi.mocked(createUser).mockResolvedValue(createdUser);

    const user = userEvent.setup();
    renderUsersPage();

    await screen.findByText("admin@example.com");
    await user.type(screen.getByLabelText("Name"), "New Agent");
    await user.type(screen.getByLabelText("Email"), "new.agent@example.com");
    await user.type(screen.getByLabelText("Password"), "password@123");
    await user.click(screen.getByRole("button", { name: "Create user" }));

    await waitFor(() => {
      expect(vi.mocked(createUser).mock.calls[0]?.[0]).toEqual({
        email: "new.agent@example.com",
        isActive: true,
        name: "New Agent",
        password: "password@123",
        role: "agent"
      });
    });
    expect(await screen.findByText("User created.")).toBeVisible();
  });

  test("validates minimum password length before creating a user", async () => {
    vi.mocked(listUsers).mockResolvedValue([adminUser]);

    const user = userEvent.setup();
    renderUsersPage();

    await screen.findByText("admin@example.com");
    await user.type(screen.getByLabelText("Name"), "New Agent");
    await user.type(screen.getByLabelText("Email"), "new.agent@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(await screen.findByText("Minimum 8 characters")).toBeVisible();
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
    expect(vi.mocked(createUser)).not.toHaveBeenCalled();
  });

  test("creates an admin user when the admin role is selected", async () => {
    const createdAdmin: HelpdeskUser = {
      ...agentUser,
      id: "admin-2",
      name: "New Admin",
      email: "new.admin@example.com",
      role: "admin"
    };
    vi.mocked(listUsers).mockResolvedValue([adminUser]);
    vi.mocked(createUser).mockResolvedValue(createdAdmin);

    const user = userEvent.setup();
    renderUsersPage();

    await screen.findByText("admin@example.com");
    await user.type(screen.getByLabelText("Name"), "New Admin");
    await user.type(screen.getByLabelText("Email"), "new.admin@example.com");
    await user.type(screen.getByLabelText("Password"), "password@123");
    await user.click(screen.getByLabelText("Role"));
    await user.click(await screen.findByRole("option", { name: "Admin" }));
    await user.click(screen.getByRole("button", { name: "Create user" }));

    await waitFor(() => {
      expect(vi.mocked(createUser).mock.calls[0]?.[0]).toEqual({
        email: "new.admin@example.com",
        isActive: true,
        name: "New Admin",
        password: "password@123",
        role: "admin"
      });
    });
  });

  test("marks email as invalid when the API returns an email field error", async () => {
    vi.mocked(listUsers).mockResolvedValue([adminUser]);
    vi.mocked(createUser).mockRejectedValue(
      new UserApiError("Email already exists", "email")
    );

    const user = userEvent.setup();
    renderUsersPage();

    await screen.findByText("admin@example.com");
    await user.type(screen.getByLabelText("Name"), "Existing User");
    await user.type(screen.getByLabelText("Email"), "agent@example.com");
    await user.type(screen.getByLabelText("Password"), "password@123");
    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(await screen.findByText("Email already exists")).toBeVisible();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText("Unable to save user")).not.toBeInTheDocument();
  });

  test("refreshes the users query from the refresh button", async () => {
    vi.mocked(listUsers)
      .mockResolvedValueOnce([adminUser])
      .mockResolvedValueOnce([adminUser, agentUser]);

    const user = userEvent.setup();
    renderUsersPage();

    expect(await screen.findByText("admin@example.com")).toBeVisible();
    expect(screen.queryByText("Agent User")).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Refresh" }));

    expect(await screen.findByText("Agent User")).toBeVisible();
    expect(vi.mocked(listUsers)).toHaveBeenCalledTimes(2);
  });

  test("deactivates a non-current user and refetches the list", async () => {
    vi.mocked(listUsers)
      .mockResolvedValueOnce([adminUser, agentUser])
      .mockResolvedValueOnce([
        adminUser,
        {
          ...agentUser,
          isActive: false
        }
      ]);
    vi.mocked(deactivateUser).mockResolvedValue({
      ...agentUser,
      isActive: false
    });

    const user = userEvent.setup();
    renderUsersPage();

    const agentRow = (await screen.findByText("agent@example.com")).closest("article");
    expect(agentRow).not.toBeNull();

    await user.click(
      within(agentRow!).getByRole("button", {
        name: "Open actions for Agent User"
      })
    );
    await user.click(await screen.findByRole("menuitem", { name: "Deactivate" }));

    await waitFor(() => {
      expect(vi.mocked(deactivateUser).mock.calls[0]?.[0]).toBe("agent-1");
    });
    expect(await screen.findByText("User deactivated.")).toBeVisible();
    expect(await screen.findByText("Inactive")).toBeVisible();
    expect(vi.mocked(listUsers)).toHaveBeenCalledTimes(2);
  });
});
