import axios from "axios";

export type UserRole = "admin" | "agent";

export type HelpdeskUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserPayload = {
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  password?: string;
};

function readError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { error?: string } | undefined;
    return payload?.error ?? "Something went wrong";
  }

  return "Something went wrong";
}

export async function listUsers(): Promise<HelpdeskUser[]> {
  try {
    const response = await axios.get<{ data: HelpdeskUser[] }>("/api/users", {
      withCredentials: true
    });

    return response.data.data;
  } catch (error) {
    throw new Error(readError(error));
  }
}

export async function createUser(payload: Required<UserPayload>) {
  try {
    const response = await axios.post<{ data: HelpdeskUser }>("/api/users", payload, {
      withCredentials: true
    });

    return response.data.data;
  } catch (error) {
    throw new Error(readError(error));
  }
}

export async function updateUser(userId: string, payload: UserPayload) {
  try {
    const response = await axios.patch<{ data: HelpdeskUser }>(
      `/api/users/${userId}`,
      payload,
      { withCredentials: true }
    );

    return response.data.data;
  } catch (error) {
    throw new Error(readError(error));
  }
}

export async function deactivateUser(userId: string) {
  try {
    const response = await axios.delete<{ data: HelpdeskUser }>(
      `/api/users/${userId}`,
      { withCredentials: true }
    );

    return response.data.data;
  } catch (error) {
    throw new Error(readError(error));
  }
}
