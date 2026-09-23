import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  handleRegisterIntent,
  handleVerifyCode,
  handleResendCode,
  handleLogin,
} from "./server-auth";

export interface AuthApiResponse<T = Record<string, unknown>> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  [key: string]: unknown;
}

// Server functions (TanStack Start RPC)
export const registerIntentServerFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        email: z.string(),
        password: z.string(),
        confirmPassword: z.string().optional(),
        name: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return handleRegisterIntent(data);
  });

export const verifyCodeServerFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        email: z.string(),
        code: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return handleVerifyCode(data);
  });

export const resendCodeServerFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        email: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return handleResendCode(data);
  });

export const loginServerFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
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

// Client-side API fetchers calling POST /api/auth/* with serverFn fallback
export async function apiRegisterIntent(payload: {
  email: string;
  password: string;
  confirmPassword?: string;
  name?: string;
}): Promise<{ success: boolean; error?: string; message?: string; retryAfter?: number }> {
  try {
    const res = await fetch("/api/auth/register-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Failed to send verification code. Please try again.",
        retryAfter: data.retryAfter,
      };
    }
    return {
      success: true,
      message: data.message || "Verification code sent to your email",
    };
  } catch {
    // Fallback to serverFn
    try {
      const res = await registerIntentServerFn({ data: payload });
      if (res.status >= 400) {
        return {
          success: false,
          error: (res.body.error as string) || "Failed to send verification code.",
          retryAfter: res.body.retryAfter as number | undefined,
        };
      }
      return {
        success: true,
        message: (res.body.message as string) || "Verification code sent to your email",
      };
    } catch (e) {
      return {
        success: false,
        error: (e as Error).message || "Network error. Please try again.",
      };
    }
  }
}

export async function apiVerifyCode(payload: { email: string; code: string }): Promise<{
  success: boolean;
  error?: string;
  message?: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    is_verified: boolean;
    emailVerified: boolean;
    twoFactorVerified: boolean;
    createdAt: string;
  };
  expired?: boolean;
  locked?: boolean;
}> {
  try {
    const res = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Verification failed. Please check the code.",
        expired: data.expired,
        locked: data.locked,
      };
    }
    return {
      success: true,
      message: data.message,
      token: data.token,
      user: data.user,
    };
  } catch {
    // Fallback to serverFn
    try {
      const res = await verifyCodeServerFn({ data: payload });
      if (res.status >= 400) {
        return {
          success: false,
          error: (res.body.error as string) || "Verification failed.",
          expired: res.body.expired as boolean | undefined,
          locked: res.body.locked as boolean | undefined,
        };
      }
      return {
        success: true,
        message: res.body.message as string,
        token: res.body.token as string,
        user: res.body.user as {
          id: string;
          email: string;
          name: string;
          is_verified: boolean;
          emailVerified: boolean;
          twoFactorVerified: boolean;
          createdAt: string;
        },
      };
    } catch (e) {
      return {
        success: false,
        error: (e as Error).message || "Network error. Please try again.",
      };
    }
  }
}

export async function apiResendCode(payload: {
  email: string;
}): Promise<{ success: boolean; error?: string; message?: string; retryAfter?: number }> {
  try {
    const res = await fetch("/api/auth/resend-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Failed to resend code.",
        retryAfter: data.retryAfter,
      };
    }
    return {
      success: true,
      message: data.message || "Verification code sent to your email",
    };
  } catch {
    try {
      const res = await resendCodeServerFn({ data: payload });
      if (res.status >= 400) {
        return {
          success: false,
          error: (res.body.error as string) || "Failed to resend code.",
          retryAfter: res.body.retryAfter as number | undefined,
        };
      }
      return {
        success: true,
        message: (res.body.message as string) || "Verification code sent to your email",
      };
    } catch (e) {
      return {
        success: false,
        error: (e as Error).message || "Network error. Please try again.",
      };
    }
  }
}

export async function apiLogin(payload: { email: string; password: string }): Promise<{
  success: boolean;
  error?: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    is_verified: boolean;
    emailVerified: boolean;
    twoFactorVerified: boolean;
    createdAt: string;
  };
}> {
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
        error: data.error || "Login failed. Please check your credentials.",
      };
    }
    return {
      success: true,
      token: data.token,
      user: data.user,
    };
  } catch {
    try {
      const res = await loginServerFn({ data: payload });
      if (res.status >= 400) {
        return {
          success: false,
          error: (res.body.error as string) || "Login failed.",
        };
      }
      return {
        success: true,
        token: res.body.token as string,
        user: res.body.user as {
          id: string;
          email: string;
          name: string;
          is_verified: boolean;
          emailVerified: boolean;
          twoFactorVerified: boolean;
          createdAt: string;
        },
      };
    } catch (e) {
      return {
        success: false,
        error: (e as Error).message || "Network error. Please try again.",
      };
    }
  }
}
