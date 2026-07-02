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

export type UserApiErrorField = keyof UserPayload;

export class UserApiError extends Error {
  field?: UserApiErrorField;

  constructor(message: string, field?: UserApiErrorField) {
    super(message);
    this.name = "UserApiError";
    this.field = field;
  }
}

function readError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | { error?: string; field?: UserApiErrorField }
      | undefined;
    return {
      field: payload?.field,
      message: payload?.error ?? "Something went wrong"
    };
  }

  return {
    message: "Something went wrong"
  };
}

export async function listUsers(): Promise<HelpdeskUser[]> {
  try {
    const response = await axios.get<{ data: HelpdeskUser[] }>("/api/users", {
      withCredentials: true
    });

    return response.data.data;
  } catch (error) {
    const apiError = readError(error);
    throw new UserApiError(apiError.message, apiError.field);
  }
}

export async function createUser(payload: Required<UserPayload>) {
  try {
    const response = await axios.post<{ data: HelpdeskUser }>("/api/users", payload, {
      withCredentials: true
    });

    return response.data.data;
  } catch (error) {
    const apiError = readError(error);
    throw new UserApiError(apiError.message, apiError.field);
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
    const apiError = readError(error);
    throw new UserApiError(apiError.message, apiError.field);
  }
}

export async function deactivateUser(userId: string) {
  try {
    const response = await axios.patch<{ data: HelpdeskUser }>(
      `/api/users/${userId}`,
      { isActive: false },
      { withCredentials: true }
    );

    return response.data.data;
  } catch (error) {
    const apiError = readError(error);
    throw new UserApiError(apiError.message, apiError.field);
  }
}

export async function deleteUser(userId: string) {
  try {
    const response = await axios.delete<{ data: HelpdeskUser }>(
      `/api/users/${userId}`,
      { withCredentials: true }
    );

    return response.data.data;
  } catch (error) {
    const apiError = readError(error);
    throw new UserApiError(apiError.message, apiError.field);
  }
}
