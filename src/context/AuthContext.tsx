import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  twoFactorVerified: boolean;
}

interface StoredAccount {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: string;
}

interface PendingRegistration {
  email: string;
  password: string;
  verificationCode: string;
  expiresAt: number;
}

export type AuthModalView = "login" | "signup";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isModalOpen: boolean;
  modalView: AuthModalView;
  signUpStep: 1 | 2;
  pendingEmail: string;
  activeVerificationCode: string | null;
  resendCooldown: number;
  gateReason: string | null;
  openLogin: (initialEmail?: string, reason?: string) => void;
  openSignUp: (initialEmail?: string, reason?: string) => void;
  closeModal: () => void;
  setModalView: (view: AuthModalView) => void;
  login: (email: string, password: string) => { success: boolean; error?: string };
  startSignUp: (
    email: string,
    password: string,
    confirmPassword: string,
  ) => { success: boolean; error?: string };
  verifyTwoStepCode: (code: string) => { success: boolean; error?: string };
  resendCode: () => void;
  backToStep1: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = "vtr_auth_user";
const ACCOUNTS_STORAGE_KEY = "vtr_registered_accounts";

const DEMO_ACCOUNT: StoredAccount = {
  id: "usr_demo",
  email: "demo@stylemirror.com",
  password: "password123",
  name: "Demo User",
  createdAt: new Date().toISOString(),
};

function getStoredAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return [DEMO_ACCOUNT];
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) {
      // Seed demo account by default
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([DEMO_ACCOUNT]));
      return [DEMO_ACCOUNT];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([DEMO_ACCOUNT]));
      return [DEMO_ACCOUNT];
    }
    // Ensure demo account is present
    if (!parsed.some((a: StoredAccount) => a.email === DEMO_ACCOUNT.email)) {
      parsed.unshift(DEMO_ACCOUNT);
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return [DEMO_ACCOUNT];
  }
}

function saveStoredAccounts(accounts: StoredAccount[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error("Failed to save accounts", err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState<AuthModalView>("login");
  const [signUpStep, setSignUpStep] = useState<1 | 2>(1);
  const [gateReason, setGateReason] = useState<string | null>(null);
  const [pendingRegistration, setPendingRegistration] = useState<PendingRegistration | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Initialize user from local storage and check URL parameters
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

    // Check for query params e.g. ?auth=login or ?auth=signup
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

  // Cooldown countdown timer for resending verification code
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const openLogin = (initialEmail?: string, reason?: string) => {
    setModalView("login");
    setSignUpStep(1);
    setGateReason(reason || null);
    setIsModalOpen(true);
  };

  const openSignUp = (initialEmail?: string, reason?: string) => {
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

  const login = (email: string, password: string): { success: boolean; error?: string } => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return { success: false, error: "Please enter your email address." };
    }
    if (!password) {
      return { success: false, error: "Please enter your password." };
    }

    const accounts = getStoredAccounts();
    const existing = accounts.find((acc) => acc.email.toLowerCase() === normalizedEmail);

    if (!existing) {
      return {
        success: false,
        error: "No account found with this email. Please sign up first.",
      };
    }

    if (existing.password !== password) {
      return {
        success: false,
        error: "Incorrect password. Please verify your credentials and try again.",
      };
    }

    const authUser: User = {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      createdAt: existing.createdAt,
      twoFactorVerified: true,
    };

    setUser(authUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
    toast.success(`Welcome back, ${authUser.email}!`, {
      description: "You are now logged in. Measurements and fitting room are unlocked.",
    });
    closeModal();
    return { success: true };
  };

  const startSignUp = (
    email: string,
    password: string,
    confirmPassword: string,
  ): { success: boolean; error?: string } => {
    const normalizedEmail = email.trim().toLowerCase();

    // Validations
    if (!normalizedEmail) {
      return { success: false, error: "Email address is required." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return {
        success: false,
        error: "Please enter a valid email address (e.g. name@example.com).",
      };
    }

    if (!password) {
      return { success: false, error: "Password is required." };
    }

    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }

    if (password !== confirmPassword) {
      return { success: false, error: "Passwords do not match. Please verify and try again." };
    }

    const accounts = getStoredAccounts();
    const alreadyExists = accounts.some((acc) => acc.email.toLowerCase() === normalizedEmail);
    if (alreadyExists) {
      return {
        success: false,
        error: "An account with this email address already exists. Please log in instead.",
      };
    }

    // Generate a 6-digit verification code
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    setPendingRegistration({
      email: normalizedEmail,
      password,
      verificationCode: generatedCode,
      expiresAt,
    });

    setSignUpStep(2);
    setResendCooldown(30);

    toast.info("2-Step Verification Code Sent", {
      description: `Code for ${normalizedEmail}: ${generatedCode}`,
      duration: 12000,
    });

    return { success: true };
  };

  const verifyTwoStepCode = (code: string): { success: boolean; error?: string } => {
    const trimmedCode = code.trim();

    if (!pendingRegistration) {
      return {
        success: false,
        error: "Registration session expired. Please restart the sign up process.",
      };
    }

    if (Date.now() > pendingRegistration.expiresAt) {
      return {
        success: false,
        error: "Verification code has expired. Please click 'Resend Code'.",
      };
    }

    if (trimmedCode !== pendingRegistration.verificationCode) {
      return {
        success: false,
        error: "Invalid 6-digit verification code. Please check and try again.",
      };
    }

    // Successful 2-Step Verification
    const accounts = getStoredAccounts();
    const newAccount: StoredAccount = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      email: pendingRegistration.email,
      password: pendingRegistration.password,
      name: pendingRegistration.email.split("@")[0] || "User",
      createdAt: new Date().toISOString(),
    };

    accounts.push(newAccount);
    saveStoredAccounts(accounts);

    const authUser: User = {
      id: newAccount.id,
      email: newAccount.email,
      name: newAccount.name,
      createdAt: newAccount.createdAt,
      twoFactorVerified: true,
    };

    setUser(authUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));

    toast.success("Account verified & created successfully!", {
      description: `Welcome to Virtual Try Room, ${authUser.email}.`,
    });

    setPendingRegistration(null);
    closeModal();
    return { success: true };
  };

  const resendCode = () => {
    if (!pendingRegistration) return;
    if (resendCooldown > 0) return;

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    setPendingRegistration({
      ...pendingRegistration,
      verificationCode: newCode,
      expiresAt,
    });

    setResendCooldown(30);

    toast.info("New Verification Code Sent", {
      description: `New code for ${pendingRegistration.email}: ${newCode}`,
      duration: 12000,
    });
  };

  const backToStep1 = () => {
    setSignUpStep(1);
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(USER_STORAGE_KEY);
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
        pendingEmail: pendingRegistration?.email || "",
        activeVerificationCode: pendingRegistration?.verificationCode || null,
        resendCooldown,
        gateReason,
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
