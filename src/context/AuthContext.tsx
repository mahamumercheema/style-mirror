import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { apiRegisterIntent, apiVerifyCode, apiResendCode, apiLogin } from "@/lib/auth.functions";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  emailVerified: boolean;
  twoFactorVerified: boolean;
}

export type AuthModalView = "login" | "signup";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isModalOpen: boolean;
  modalView: AuthModalView;
  signUpStep: 1 | 2;
  pendingEmail: string;
  resendCooldown: number;
  gateReason: string | null;
  isSubmitting: boolean;
  openLogin: (initialEmail?: string, reason?: string) => void;
  openSignUp: (initialEmail?: string, reason?: string) => void;
  closeModal: () => void;
  setModalView: (view: AuthModalView) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  startSignUp: (
    email: string,
    password: string,
    confirmPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;
  verifyTwoStepCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  resendCode: () => Promise<void>;
  backToStep1: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = "vtr_auth_user";
const TOKEN_STORAGE_KEY = "vtr_auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState<AuthModalView>("login");
  const [signUpStep, setSignUpStep] = useState<1 | 2>(1);
  const [gateReason, setGateReason] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

  const openLogin = (_initialEmail?: string, reason?: string) => {
    setModalView("login");
    setSignUpStep(1);
    setGateReason(reason || null);
    setIsModalOpen(true);
  };

  const openSignUp = (_initialEmail?: string, reason?: string) => {
    setModalView("signup");
    setSignUpStep(1);
    setGateReason(reason || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setGateReason(null);
    setTimeout(() => {
      setSignUpStep(1);
    }, 200);
  };

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    setIsSubmitting(true);
    try {
      const result = await apiLogin({ email, password });
      if (!result.success || !result.user) {
        return { success: false, error: result.error || "Login failed" };
      }

      setUser(result.user);
      if (result.token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
      }
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));

      toast.success(`Welcome back, ${result.user.email}!`, {
        description: "You are now logged in. Measurements and fitting room are unlocked.",
      });

      closeModal();
      return { success: true };
    } finally {
      setIsSubmitting(false);
    }
  };

  const startSignUp = async (
    email: string,
    password: string,
    confirmPassword: string,
  ): Promise<{ success: boolean; error?: string }> => {
    setIsSubmitting(true);
    try {
      const result = await apiRegisterIntent({
        email,
        password,
        confirmPassword,
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
      setResendCooldown(60);

      // Secure toast notification: NEVER discloses OTP code
      toast.success("Verification code sent to your email", {
        description: `Please check your inbox at ${email.trim().toLowerCase()} and enter the 6-digit code.`,
      });

      return { success: true };
    } finally {
      setIsSubmitting(false);
    }
  };

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

      toast.success("Account Verified & Activated!", {
        description: `Welcome to Virtual Try Room, ${result.user.email}. Your fitting room is unlocked.`,
      });

      setPendingEmail("");
      closeModal();
      return { success: true };
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendCode = async (): Promise<void> => {
    if (!pendingEmail || resendCooldown > 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await apiResendCode({ email: pendingEmail });

      if (!result.success) {
        toast.error("Failed to resend code", {
          description: result.error || "Please wait before trying again.",
        });
        if (result.retryAfter) {
          setResendCooldown(result.retryAfter);
        }
        return;
      }

      setResendCooldown(60);

      // Secure toast notification: NEVER discloses OTP code
      toast.success("Verification code sent to your email", {
        description: `A new 6-digit verification code has been dispatched to ${pendingEmail}.`,
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isModalOpen,
        modalView,
        signUpStep,
        pendingEmail,
        resendCooldown,
        gateReason,
        isSubmitting,
        openLogin,
        openSignUp,
        closeModal,
        setModalView,
        login,
        startSignUp,
        verifyTwoStepCode,
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
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
