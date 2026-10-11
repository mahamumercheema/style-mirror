import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  handleLogin,
  handleRegisterIntent,
  handleVerifyCode,
  handleResendCode,
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

export const registerIntentServerFn = createServerFn({ method: "POST" })
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
    return handleRegisterIntent(data);
  });

export const verifyCodeServerFn = createServerFn({ method: "POST" })
  .validator((data) =>
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
  .validator((data) =>
    z
      .object({
        email: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return handleResendCode(data);
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

export type RegisterIntentResult = {
  success: boolean;
  error?: string | undefined;
  message?: string | undefined;
  retryAfter?: number | undefined;
};

export type VerifyCodeResult = {
  success: boolean;
  error?: string | undefined;
  message?: string | undefined;
  token?: string | undefined;
  user?: AuthUser | undefined;
  expired?: boolean | undefined;
  locked?: boolean | undefined;
};

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

export async function apiRegisterIntent(payload: {
  email: string;
  password: string;
  name?: string | undefined;
}): Promise<RegisterIntentResult> {
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
          error: res.body.error || "Failed to send verification code.",
          retryAfter: res.body.retryAfter,
        };
      }
      return {
        success: true,
        message: res.body.message || "Verification code sent to your email",
      };
    } catch (e) {
      return {
        success: false,
        error: (e as Error).message || "Network error. Please try again.",
      };
    }
  }
}

export async function apiVerifyCode(payload: {
  email: string;
  code: string;
}): Promise<VerifyCodeResult> {
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
          error: res.body.error || "Verification failed.",
          expired: res.body.expired,
          locked: res.body.locked,
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

export async function apiResendCode(payload: { email: string }): Promise<RegisterIntentResult> {
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
          error: res.body.error || "Failed to resend code.",
          retryAfter: res.body.retryAfter,
        };
      }
      return {
        success: true,
        message: res.body.message || "Verification code sent to your email",
      };
    } catch (e) {
      return {
        success: false,
        error: (e as Error).message || "Network error. Please try again.",
      };
    }
  }
}

export async function apiRequestEmailOtp(payload: {
  email: string;
}): Promise<RegisterIntentResult> {
  try {
    const res = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Failed to send 2FA verification code.",
        retryAfter: data.retryAfter,
      };
    }
    return {
      success: true,
      message: data.message || "2FA code sent to your email",
      isSandbox: data.isSandbox,
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message || "Network error. Please try again.",
    };
  }
}

export async function apiVerifyEmailOtp(payload: {
  email: string;
  code: string;
}): Promise<VerifyCodeResult> {
  try {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Invalid 2FA code. Please check and try again.",
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
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message || "Network error. Please try again.",
    };
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
