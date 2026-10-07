import { useRouter } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  apiRegisterIntent,
  apiVerifyCode,
  apiResendCode,
  apiLogin,
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

export type AuthModalView = "login" | "signup" | "email2fa";

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
  devOtpCode: string | null;
  openLogin: (initialEmail?: string, reason?: string, targetRoute?: string) => void;
  openSignUp: (initialEmail?: string, reason?: string, targetRoute?: string) => void;
  openEmail2FA: (initialEmail?: string, reason?: string, targetRoute?: string) => void;
  promptSaveGuestWardrobe: (reason?: string) => void;
  requireAuth: (targetRoute: string, customPrompt?: string) => boolean;
  closeModal: () => void;
  setModalView: (view: AuthModalView) => void;
  setRedirectRoute: (route: string | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginAsGuest: () => void;
  requestEmail2FA: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmail2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
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
const REDIRECT_STORAGE_KEY = "vtr_auth_redirect_target";

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
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);

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

      // Forward to the requested feature with the router (no full reload, so in-page
      // state such as an analysed photo in the studio survives)
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
    // Only a gated feature passes a reason; a plain "Log in" shows no banner
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

  const openEmail2FA = (_initialEmail?: string, reason?: string, targetRoute?: string) => {
    setModalView("email2fa");
    setSignUpStep(1);
    setGateReason(
      reason || "Please log in or create an account to access the AI Stylist and digital closet.",
    );
    if (_initialEmail) {
      setPendingEmail(_initialEmail.trim().toLowerCase());
    }
    if (targetRoute) {
      setRedirectRoute(targetRoute);
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(REDIRECT_STORAGE_KEY, targetRoute);
      }
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setGateReason(null);
    setDevOtpCode(null);
    setTimeout(() => {
      setSignUpStep(1);
    }, 200);
  };

  const loginAsGuest = () => {
    const guestUser: User = {
      id: "guest_user",
      email: "guest@stylemirror.com",
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

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    setIsSubmitting(true);
    try {
      const googleUser: User = {
        id: "usr_google_" + Math.random().toString(36).substring(2, 9),
        email: "alex.fashion@gmail.com",
        name: "Alex Rivera",
        createdAt: new Date().toISOString(),
        emailVerified: true,
        twoFactorVerified: true,
      };

      setUser(googleUser);
      localStorage.setItem(TOKEN_STORAGE_KEY, "google_oauth_token_" + Date.now());
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(googleUser));

      // Transfer temporary guest items into newly authenticated account
      try {
        const transferred = transferGuestWardrobeToAccount(googleUser.id);
        if (transferred.length > 0) {
          toast.success("Guest Wardrobe Saved!", {
            description: `${transferred.length} temporary clothing item${transferred.length > 1 ? "s" : ""} transferred to your account!`,
          });
        }
      } catch (err) {
        console.warn("Failed to transfer guest wardrobe on Google login:", err);
      }

      toast.success("Signed in with Google", {
        description: `Welcome, ${googleUser.name}!`,
      });

      closeModal();
      handlePostAuthRedirect();
      return { success: true };
    } finally {
      setIsSubmitting(false);
    }
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

      closeModal();
      handlePostAuthRedirect();
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
      if (result.devOtpCode) {
        setDevOtpCode(result.devOtpCode);
      }

      // Secure toast notification: NEVER discloses OTP code

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

      setPendingEmail("");
      closeModal();
      handlePostAuthRedirect();
      return { success: true };
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestEmail2FA = async (email: string): Promise<{ success: boolean; error?: string }> => {
    setIsSubmitting(true);
    try {
      const result = await apiRequestEmailOtp({ email });
      if (!result.success) {
        if (result.retryAfter) {
          setResendCooldown(result.retryAfter);
        }
        return {
          success: false,
          error: result.error || "Failed to send 2FA verification code.",
        };
      }

      setPendingEmail(email.trim().toLowerCase());
      setSignUpStep(2);
      setResendCooldown(60);
      if (result.devOtpCode) {
        setDevOtpCode(result.devOtpCode);
      }
      return { success: true };
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyEmail2FA = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!pendingEmail) {
      return {
        success: false,
        error: "Verification email is missing. Please restart 2FA.",
      };
    }

    setIsSubmitting(true);
    try {
      const result = await apiVerifyEmailOtp({
        email: pendingEmail,
        code,
      });

      if (!result.success || !result.user) {
        return {
          success: false,
          error: result.error || "Invalid 2FA code. Please check your email.",
        };
      }

      setUser(result.user);
      if (result.token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
      }
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));

      // Transfer temporary guest items into account
      try {
        const transferred = transferGuestWardrobeToAccount(result.user.id);
        if (transferred.length > 0) {
          toast.success("Guest Wardrobe Saved!", {
            description: `${transferred.length} temporary clothing item${transferred.length > 1 ? "s" : ""} transferred to your account!`,
          });
        }
      } catch (err) {
        console.warn("Failed to transfer guest wardrobe on 2FA login:", err);
      }

      setPendingEmail("");
      closeModal();
      handlePostAuthRedirect();
      return { success: true };
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendCode = async (): Promise<void> => {
    if (!pendingEmail || resendCooldown > 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result =
        modalView === "email2fa"
          ? await apiRequestEmailOtp({ email: pendingEmail })
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

      setResendCooldown(60);
      if (result.devOtpCode) {
        setDevOtpCode(result.devOtpCode);
      }

      // Secure toast notification: NEVER discloses OTP code
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
        devOtpCode,
        openLogin,
        openSignUp,
        openEmail2FA,
        promptSaveGuestWardrobe,
        requireAuth,
        closeModal,
        setModalView,
        setRedirectRoute,
        login,
        loginWithGoogle,
        loginAsGuest,
        requestEmail2FA,
        verifyEmail2FA,
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
