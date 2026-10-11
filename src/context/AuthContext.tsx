import { useRouter } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  apiLogin,
  apiRegisterIntent,
  apiVerifyCode,
  apiResendCode,
  apiForgotPassword,
  apiResetPassword,
  apiRequestEmailOtp,
  apiVerifyEmailOtp,
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
  verifyTwoStepCode: (code: string) => Promise<{ success: boolean; error?: string }>;
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
  verifyTwoStepCode: async () => ({ success: false, error: "Authentication initializing" }),
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

  // Initialize active user from local storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error("Failed to parse stored user", err);
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
   * Sign-Up Step 1:
   * Collects email + password, registers pending state, sends 6-digit OTP to email.
   */
  const startSignUp = async (
    email: string,
    password: string,
    name?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    setIsSubmitting(true);
    try {
      const result = await apiRegisterIntent({
        email,
        password,
        name: name?.trim() || undefined,
      });

      if (!result.success) {
        if (result.retryAfter) {
          setResendCooldown(result.retryAfter);
        }
        return {
          success: false,
          error: result.error || "Failed to start sign up. Please try again.",
        };
      }

      setPendingEmail(email.trim().toLowerCase());
      setSignUpStep(2);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);

      toast.success("Verification Code Sent", {
        description: `Please enter the 6-digit code sent to ${email}`,
      });

      return { success: true };
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Sign-Up Step 2:
   * Validates 6-digit OTP code and creates verified session.
   */
  const verifyTwoStepCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!pendingEmail) {
      return {
        success: false,
        error: "Verification session missing. Please start the sign up process again.",
      };
    }

    setIsSubmitting(true);
    try {
      const result = await apiVerifyCode({
        email: pendingEmail,
        code,
      });

      if (!result.success || !result.user) {
        return {
          success: false,
          error: result.error || "Invalid verification code. Please check your email.",
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

      toast.success("Account Created!", {
        description: "Your email has been verified successfully.",
      });

      setPendingEmail("");
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
   * Resend Code on Step 2 with 60-second cooldown
   */
  const resendCode = async (): Promise<void> => {
    if (!pendingEmail || resendCooldown > 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result =
        modalView === "forgot-password"
          ? await apiForgotPassword({ email: pendingEmail })
          : await apiResendCode({ email: pendingEmail });

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
        verifyTwoStepCode,
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
