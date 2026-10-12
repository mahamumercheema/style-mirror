import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  handleLogin,
  handleRegister,
  handleRequestPasswordReset,
  handleResetPassword,
  type AuthUser,
} from "./server-auth";

export interface AuthApiResponse<T = Record<string, unknown>> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  [key: string]: unknown;
}

// Server functions (TanStack Start RPC)
export const loginServerFn = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        email: z.string(),
        password: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return handleLogin(data);
  });

export const registerServerFn = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        email: z.string(),
        password: z.string(),
        name: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return handleRegister(data);
  });

export const forgotPasswordServerFn = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        email: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return handleRequestPasswordReset(data);
  });

export const resetPasswordServerFn = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        email: z.string(),
        code: z.string(),
        newPassword: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return handleResetPassword({
      email: data.email,
      code: data.code,
      new_password: data.newPassword,
    });
  });

// Client-side API fetchers calling POST /api/auth/* with serverFn fallback
export type LoginResult = {
  success: boolean;
  error?: string | undefined;
  message?: string | undefined;
  token?: string | undefined;
  user?: AuthUser | undefined;
};

/** Sign-up creates the account and signs it in, so it returns a session like sign-in */
export type RegisterResult = LoginResult & { retryAfter?: number | undefined };

export async function apiLogin(payload: { email: string; password: string }): Promise<LoginResult> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Invalid email or password.",
      };
    }
    return {
      success: true,
      message: data.message,
      token: data.token,
      user: data.user,
    };
  } catch {
    try {
      const res = await loginServerFn({ data: payload });
      if (res.status >= 400) {
        return {
          success: false,
          error: res.body.error || "Invalid email or password.",
        };
      }
      return {
        success: true,
        message: res.body.message,
        token: res.body.token,
        user: res.body.user,
      };
    } catch (e) {
      return {
        success: false,
        error: (e as Error).message || "Network error. Please try again.",
      };
    }
  }
}

export async function apiRegister(payload: {
  email: string;
  password: string;
  name?: string | undefined;
}): Promise<RegisterResult> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Couldn't create your account. Please try again.",
      };
    }
    return { success: true, message: data.message, token: data.token, user: data.user };
  } catch {
    // Fallback to serverFn
    try {
      const res = await registerServerFn({ data: payload });
      if (res.status >= 400) {
        return { success: false, error: res.body.error || "Couldn't create your account." };
      }
      return {
        success: true,
        message: res.body.message,
        token: res.body.token,
        user: res.body.user,
      };
    } catch (e) {
      return { success: false, error: (e as Error).message || "Network error. Please try again." };
    }
  }
}

export type ForgotPasswordResult = {
  success: boolean;
  error?: string | undefined;
  message?: string | undefined;
  retryAfter?: number | undefined;
};

export type ResetPasswordResult = {
  success: boolean;
  error?: string | undefined;
  message?: string | undefined;
};

export async function apiForgotPassword(payload: { email: string }): Promise<ForgotPasswordResult> {
  try {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Failed to send reset code. Please check your email.",
        retryAfter: data.retryAfter,
      };
    }
    return {
      success: true,
      message: data.message || "Password reset code sent to your email",
    };
  } catch {
    try {
      const res = await forgotPasswordServerFn({ data: payload });
      if (res.status >= 400) {
        return {
          success: false,
          error: res.body.error || "Failed to send reset code.",
          retryAfter: res.body.retryAfter,
        };
      }
      return {
        success: true,
        message: res.body.message || "Password reset code sent to your email",
      };
    } catch (e) {
      return {
        success: false,
        error: (e as Error).message || "Network error. Please try again.",
      };
    }
  }
}

export async function apiResetPassword(payload: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<ResetPasswordResult> {
  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email,
        code: payload.code,
        new_password: payload.newPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Failed to reset password. Please check your code.",
      };
    }
    return {
      success: true,
      message:
        data.message || "Password updated successfully. Please log in with your new password.",
    };
  } catch {
    try {
      const res = await resetPasswordServerFn({ data: payload });
      if (res.status >= 400) {
        return {
          success: false,
          error: res.body.error || "Failed to reset password.",
        };
      }
      return {
        success: true,
        message:
          res.body.message ||
          "Password updated successfully. Please log in with your new password.",
      };
    } catch (e) {
      return {
        success: false,
        error: (e as Error).message || "Network error. Please try again.",
      };
    }
  }
}

/**
 * Checks a saved sign-in with the server. "invalid" means the server doesn't know the session,
 * so the saved user must be signed out; "unreachable" means the check couldn't be made.
 */
export async function apiCheckSession(
  token: string,
): Promise<
  { status: "valid"; user: AuthUser } | { status: "invalid" } | { status: "unreachable" }
> {
  // Same /api/auth route family as sign-in, so it sees the same live sessions
  try {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) return { status: "invalid" };
    if (!res.ok) return { status: "unreachable" };
    const data = (await res.json()) as { user?: AuthUser };
    return data.user ? { status: "valid", user: data.user } : { status: "invalid" };
  } catch {
    return { status: "unreachable" };
  }
}

/** Ends the session on the server (sign out). Failures are ignored: the browser forgets it anyway. */
export async function apiLogout(token: string): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Offline: the session still expires on its own
  }
}
