import { useRouter } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  apiCheckSession,
  apiLogout,
  apiLogin,
  apiRegister,
  apiForgotPassword,
  apiResetPassword,
} from "@/lib/auth.functions";
import {
  transferGuestWardrobeToAccount,
  getGuestSessionWardrobe,
  isGuestUser,
} from "@/lib/wardrobe-service";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  emailVerified: boolean;
  twoFactorVerified: boolean;
  avatarUrl?: string | null;
}

export type AuthModalView = "login" | "signup" | "forgot-password";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  hasGuestSessionItems: boolean;
  isModalOpen: boolean;
  modalView: AuthModalView;
  signUpStep: 1 | 2;
  pendingEmail: string;
  resendCooldown: number;
  gateReason: string | null;
  redirectRoute: string | null;
  isSubmitting: boolean;
  openLogin: (initialEmail?: string, reason?: string, targetRoute?: string) => void;
  openSignUp: (initialEmail?: string, reason?: string, targetRoute?: string) => void;
  openForgotPassword: (initialEmail?: string) => void;
  promptSaveGuestWardrobe: (reason?: string) => void;
  requireAuth: (targetRoute: string, customPrompt?: string) => boolean;
  closeModal: () => void;
  setModalView: (view: AuthModalView) => void;
  setRedirectRoute: (route: string | null) => void;
  loginWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  loginAsGuest: () => void;
  startSignUp: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordWithCode: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;
  resendCode: () => Promise<void>;
  backToStep1: () => void;
  logout: () => void;
}

export const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isGuest: true,
  hasGuestSessionItems: false,
  isModalOpen: false,
  modalView: "login",
  signUpStep: 1,
  pendingEmail: "",
  resendCooldown: 0,
  gateReason: null,
  redirectRoute: null,
  isSubmitting: false,
  openLogin: () => {},
  openSignUp: () => {},
  openForgotPassword: () => {},
  promptSaveGuestWardrobe: () => {},
  requireAuth: () => false,
  closeModal: () => {},
  setModalView: () => {},
  setRedirectRoute: () => {},
  loginWithPassword: async () => ({ success: false, error: "Authentication initializing" }),
  loginAsGuest: () => {},
  startSignUp: async () => ({ success: false, error: "Authentication initializing" }),
  requestPasswordReset: async () => ({ success: false, error: "Authentication initializing" }),
  resetPasswordWithCode: async () => ({ success: false, error: "Authentication initializing" }),
  resendCode: async () => {},
  backToStep1: () => {},
  logout: () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

const USER_STORAGE_KEY = "vtr_auth_user";
const TOKEN_STORAGE_KEY = "vtr_auth_token";
const REDIRECT_STORAGE_KEY = "vtr_auth_redirect_target";
/** 60-second cooldown timer for resending OTP */
const RESEND_COOLDOWN_SECONDS = 60;

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState<AuthModalView>("login");
  const [signUpStep, setSignUpStep] = useState<1 | 2>(1);
  const [gateReason, setGateReason] = useState<string | null>(null);
  const [redirectRoute, setRedirectRoute] = useState<string | null>(() => {
    if (typeof window !== "undefined" && window.sessionStorage) {
      return window.sessionStorage.getItem(REDIRECT_STORAGE_KEY);
    }
    return null;
  });
  const [pendingEmail, setPendingEmail] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Automatically execute post-auth forwarding to target route
  const handlePostAuthRedirect = () => {
    let target = redirectRoute;
    if (!target && typeof window !== "undefined" && window.sessionStorage) {
      target = window.sessionStorage.getItem(REDIRECT_STORAGE_KEY);
    }

    if (target) {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
      }
      setRedirectRoute(null);

      // Forward to the requested feature with the router (no full reload)
      router.history.push(target);
    }
  };

  // Intercept action and gate access for unauthenticated guests
  const requireAuth = (targetRoute: string, customPrompt?: string): boolean => {
    if (user && user.id !== "guest_user") {
      return true;
    }

    setRedirectRoute(targetRoute);
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(REDIRECT_STORAGE_KEY, targetRoute);
    }

    openLogin(
      undefined,
      customPrompt ||
        "Please log in or create an account to access the AI Stylist and digital closet.",
      targetRoute,
    );
    return false;
  };

  // Restore the saved user, but only once the server confirms its session. A saved user the
  // server doesn't recognise (e.g. the old demo "Google" sign-in, or a session lost when the
  // server restarted) is signed out instead of being shown as logged in.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const signOutStoredUser = () => {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      if (!cancelled) setUser(null);
    };
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const parsed = storedUser ? (JSON.parse(storedUser) as User) : null;
      if (parsed?.id === "guest_user") {
        setUser(parsed);
      } else if (parsed && storedToken) {
        void apiCheckSession(storedToken).then((result) => {
          if (cancelled) return;
          if (result.status === "valid") {
            const confirmed: User = {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              createdAt: result.user.createdAt,
              emailVerified: result.user.emailVerified,
              twoFactorVerified: result.user.twoFactorVerified,
              avatarUrl: (result.user as { avatarUrl?: string | null }).avatarUrl ?? null,
            };
            setUser(confirmed);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(confirmed));
          } else if (result.status === "invalid") {
            signOutStoredUser();
          }
          // Unreachable server: stay signed out for now without discarding the saved sign-in
        });
      } else if (parsed) {
        signOutStoredUser();
      }
    } catch (err) {
      console.error("Failed to parse stored user", err);
      signOutStoredUser();
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const authParam = params.get("auth");
      if (authParam === "login") {
        setModalView("login");
        setSignUpStep(1);
        setIsModalOpen(true);
      } else if (authParam === "signup") {
        setModalView("signup");
        setSignUpStep(1);
        setIsModalOpen(true);
      }
    } catch {
      // Ignore URL parsing errors
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Cooldown countdown timer for resending verification code (60 seconds)
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const openLogin = (_initialEmail?: string, reason?: string, targetRoute?: string) => {
    setModalView("login");
    setSignUpStep(1);
    setGateReason(reason || null);
    if (targetRoute) {
      setRedirectRoute(targetRoute);
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(REDIRECT_STORAGE_KEY, targetRoute);
      }
    }
    setIsModalOpen(true);
  };

  const openSignUp = (_initialEmail?: string, reason?: string, targetRoute?: string) => {
    setModalView("signup");
    setSignUpStep(1);
    setGateReason(reason || null);
    if (targetRoute) {
      setRedirectRoute(targetRoute);
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(REDIRECT_STORAGE_KEY, targetRoute);
      }
    }
    setIsModalOpen(true);
  };

  const openForgotPassword = (initialEmail?: string) => {
    setModalView("forgot-password");
    setSignUpStep(1);
    setGateReason(null);
    if (initialEmail) {
      setPendingEmail(initialEmail.trim().toLowerCase());
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setGateReason(null);
    setTimeout(() => {
      setSignUpStep(1);
    }, 200);
  };

  const loginAsGuest = () => {
    const guestUser: User = {
      id: "guest_user",
      email: "guest@atelierora.com",
      name: "Guest Stylist",
      createdAt: new Date().toISOString(),
      emailVerified: true,
      twoFactorVerified: true,
    };
    setUser(guestUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(guestUser));
    closeModal();
    handlePostAuthRedirect();
  };

  /**
   * Routine Log In: Email + Password only.
   * Direct authentication against server, no OTP dispatched.
   */
  const loginWithPassword = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    setIsSubmitting(true);
    try {
      const result = await apiLogin({ email, password });
      if (!result.success || !result.user) {
        return {
          success: false,
          error: result.error || "Invalid email or password.",
        };
      }

      setUser(result.user);
      if (result.token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
      }
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));

      // Transfer temporary guest items into newly authenticated account
      try {
        const transferred = transferGuestWardrobeToAccount(result.user.id);
        if (transferred.length > 0) {
          toast.success("Guest Wardrobe Saved!", {
            description: `${transferred.length} temporary clothing item${transferred.length > 1 ? "s" : ""} transferred to your account!`,
          });
        }
      } catch (err) {
        console.warn("Failed to transfer guest wardrobe on login:", err);
      }

      toast.success("Welcome back!", {
        description: `Logged in as ${result.user.email}`,
      });

      closeModal();
      handlePostAuthRedirect();
      return { success: true };
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Sign-up: creates the account and signs it in straight away (no emailed code).
   */
  const startSignUp = async (
    email: string,
    password: string,
    name?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    setIsSubmitting(true);
    try {
      const result = await apiRegister({
        email,
        password,
        name: name?.trim() || undefined,
      });

      if (!result.success || !result.user) {
        return {
          success: false,
          error: result.error || "Couldn't create your account. Please try again.",
        };
      }

      setUser(result.user);
      if (result.token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
      }
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));

      // Transfer temporary guest items into newly registered account
      try {
        const transferred = transferGuestWardrobeToAccount(result.user.id);
        if (transferred.length > 0) {
          toast.success("Guest Wardrobe Saved!", {
            description: `${transferred.length} temporary clothing item${transferred.length > 1 ? "s" : ""} transferred to your account!`,
          });
        }
      } catch (err) {
        console.warn("Failed to transfer guest wardrobe on signup:", err);
      }

      toast.success("Account Created!", { description: `Welcome, ${result.user.name}.` });
      closeModal();
      handlePostAuthRedirect();
      return { success: true };
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Password Reset Step 1: Request 6-digit OTP code to registered email
   */
  const requestPasswordReset = async (
    email: string,
  ): Promise<{ success: boolean; error?: string }> => {
    setIsSubmitting(true);
    try {
      const result = await apiForgotPassword({ email: email.trim().toLowerCase() });
      if (!result.success) {
        if (result.retryAfter) {
          setResendCooldown(result.retryAfter);
        }
        return {
          success: false,
          error: result.error || "Failed to send reset code. Please try again.",
        };
      }

      setPendingEmail(email.trim().toLowerCase());
      setSignUpStep(2);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);

      toast.success("Reset Code Sent", {
        description: `Please enter the 6-digit reset code sent to ${email}`,
      });

      return { success: true };
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Password Reset Step 2 & 3: Verify OTP and update password
   */
  const resetPasswordWithCode = async (
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> => {
    setIsSubmitting(true);
    try {
      const result = await apiResetPassword({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Failed to reset password. Please check your code.",
        };
      }

      toast.success("Password Updated", {
        description: "Password updated successfully. Please log in with your new password.",
      });

      setPendingEmail("");
      setSignUpStep(1);
      setModalView("login");
      return { success: true };
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Resend the password-reset code (60-second cooldown)
   */
  const resendCode = async (): Promise<void> => {
    if (!pendingEmail || resendCooldown > 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await apiForgotPassword({ email: pendingEmail });

      if (!result.success) {
        toast.error("Failed to resend code", {
          description: result.error || "Please wait before trying again.",
        });
        if (result.retryAfter) {
          setResendCooldown(result.retryAfter);
        }
        return;
      }

      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("New Code Sent", {
        description: `A new 6-digit verification code was sent to ${pendingEmail}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const backToStep1 = () => {
    setSignUpStep(1);
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      // End the session on the server too, so the token can't be reused
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) void apiLogout(token);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    toast.info("Logged out", {
      description: "You have been logged out of your session.",
    });
  };

  const isGuest = isGuestUser(user?.id);
  const hasGuestSessionItems = isGuest && getGuestSessionWardrobe().length > 0;

  const promptSaveGuestWardrobe = (reason?: string) => {
    openSignUp(
      undefined,
      reason || "Create an account to permanently save your wardrobe and style history.",
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && user.id !== "guest_user",
        isGuest,
        hasGuestSessionItems,
        isModalOpen,
        modalView,
        signUpStep,
        pendingEmail,
        resendCooldown,
        gateReason,
        redirectRoute,
        isSubmitting,
        openLogin,
        openSignUp,
        openForgotPassword,
        promptSaveGuestWardrobe,
        requireAuth,
        closeModal,
        setModalView,
        setRedirectRoute,
        loginWithPassword,
        loginAsGuest,
        startSignUp,
        requestPasswordReset,
        resetPasswordWithCode,
        resendCode,
        backToStep1,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context ?? defaultAuthContext;
}
