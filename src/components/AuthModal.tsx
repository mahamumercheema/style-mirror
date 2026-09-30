import { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function GoogleIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.18 0 10.03 0 12s.46 3.82 1.26 5.42l4.02-3.13z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
}

export function AuthModal() {
  const {
    isModalOpen,
    modalView,
    signUpStep,
    pendingEmail,
    resendCooldown,
    gateReason,
    redirectRoute,
    isSubmitting,
    devOtpCode,
    closeModal,
    setModalView,
    login,
    loginWithGoogle,
    loginAsGuest,
    requestEmail2FA,
    verifyEmail2FA,
    startSignUp,
    verifyTwoStepCode,
    resendCode,
    backToStep1,
  } = useAuth();

  // Login Method Mode: "password" vs "2fa"
  const [loginMethod, setLoginMethod] = useState<"password" | "2fa">(
    modalView === "email2fa" ? "2fa" : "password",
  );

  // Email + Password Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Email 2FA State
  const [twoFaEmail, setTwoFaEmail] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaCodeSent, setTwoFaCodeSent] = useState(false);
  const [twoFaError, setTwoFaError] = useState<string | null>(null);

  // Sign Up Step 1 Form State
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);

  // Sign Up Step 2 Verification State
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  // Sync loginMethod with modalView
  useEffect(() => {
    if (modalView === "email2fa") {
      setLoginMethod("2fa");
    }
  }, [modalView]);

  // Keyboard accessibility: ESC key to close
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeModal]);

  // Reset errors when switching views
  useEffect(() => {
    setLoginError(null);
    setSignUpError(null);
    setVerificationError(null);
    setTwoFaError(null);
    setVerificationCode("");
    setTwoFaCode("");
  }, [modalView, signUpStep, loginMethod, isModalOpen]);

  if (!isModalOpen) return null;

  // Handle Quick Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoginError(null);
    const result = await loginWithGoogle();
    if (!result.success && result.error) {
      setLoginError(result.error);
    }
  };

  // Handle Email + Password Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const result = await login(loginEmail, loginPassword);
    if (!result.success && result.error) {
      setLoginError(result.error);
    }
  };

  // Auto-fill demo account for rapid evaluation
  const handleAutofillDemo = () => {
    setLoginEmail("demo@stylemirror.com");
    setLoginPassword("password123");
    setLoginError(null);
  };

  // Handle Email 2FA Code Request
  const handleRequest2FACode = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFaError(null);

    const emailToSend = twoFaEmail.trim().toLowerCase();
    if (!emailToSend || !emailToSend.includes("@")) {
      setTwoFaError("Please enter a valid email address.");
      return;
    }

    const result = await requestEmail2FA(emailToSend);
    if (!result.success && result.error) {
      setTwoFaError(result.error);
    } else {
      setTwoFaCodeSent(true);
    }
  };

  // Handle Email 2FA Code Verification
  const handleVerify2FACode = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFaError(null);

    const code = twoFaCode.trim();
    if (code.length !== 6) {
      setTwoFaError("Please enter the complete 6-digit verification code.");
      return;
    }

    const result = await verifyEmail2FA(code);
    if (!result.success && result.error) {
      setTwoFaError(result.error);
    }
  };

  // Handle Sign Up Step 1 Submit
  const handleSignUpStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);

    const result = await startSignUp(signUpEmail, signUpPassword, confirmPassword);
    if (!result.success && result.error) {
      setSignUpError(result.error);
    }
  };

  // Handle Sign Up Step 2 Verification Submit
  const handleVerificationSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const codeToVerify = verificationCode.trim();

    if (!codeToVerify) {
      setVerificationError("Please enter the 6-digit verification code.");
      return;
    }

    if (codeToVerify.length !== 6) {
      setVerificationError("Verification code must be exactly 6 digits.");
      return;
    }

    setVerificationError(null);
    const result = await verifyTwoStepCode(codeToVerify);

    if (!result.success && result.error) {
      setVerificationError(result.error);
    }
  };

  const passwordsMatch = confirmPassword.length > 0 && signUpPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && signUpPassword !== confirmPassword;

  // Format destination label
  const destinationLabel =
    redirectRoute === "/generate" || redirectRoute === "/ai-stylist"
      ? "AI Stylist"
      : redirectRoute === "/closet"
        ? "Digital Closet"
        : redirectRoute === "/studio"
          ? "Fitting Studio"
          : redirectRoute;

  // Requirement prompt text
  const displayPrompt =
    gateReason || "Please log in or create an account to access the AI Stylist and digital closet.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeModal();
        }
      }}
    >
      <div
        ref={modalRef}
        id="auth-modal-dialog"
        className="relative w-full max-w-md border border-border bg-card text-card-foreground p-6 sm:p-7 shadow-[var(--shadow-lift)] rounded-2xl my-auto transition-all animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-4 top-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="size-4" />
        </button>

        {/* Feature Gating Contextual Banner with Intended Route Forwarding */}
        <div className="mb-5 rounded-xl border border-amber-300/80 bg-amber-500/10 p-3.5 text-xs text-amber-950 dark:text-amber-200 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="size-4.5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-xs leading-snug">{displayPrompt}</p>
              {destinationLabel && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] text-muted-foreground">Target feature:</span>
                  <span className="inline-flex items-center gap-1 rounded bg-amber-200/60 dark:bg-amber-900/60 px-1.5 py-0.5 font-medium text-[11px] text-amber-900 dark:text-amber-100">
                    <Sparkles className="size-2.5 text-amber-600" />
                    {destinationLabel}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LOG IN / QUICK SIGN-IN VIEW */}
        {/* ========================================================================= */}
        {(modalView === "login" || modalView === "email2fa") && (
          <div className="space-y-5">
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <KeyRound className="size-3.5" />
                </span>
                <span className="eyebrow">Quick Sign-In</span>
              </div>
              <h2 id="auth-modal-title" className="font-display text-2xl sm:text-3xl font-semibold">
                Welcome Back
              </h2>
              <p className="text-xs text-muted-foreground">
                Sign in using your preferred method to unlock your personal wardrobe and AI stylist.
              </p>
            </div>

            {/* Quick Sign-In Option 1: Google OAuth */}
            <div className="pt-1">
              <Button
                id="quick-google-signin-btn"
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleGoogleSignIn}
                className="w-full h-11 border-border bg-card hover:bg-muted/80 font-medium text-xs sm:text-sm gap-2.5 cursor-pointer shadow-xs transition-all active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : (
                  <GoogleIcon className="size-4 shrink-0" />
                )}
                <span>Continue with Google</span>
              </Button>
            </div>

            {/* Or Divider */}
            <div className="relative flex items-center justify-center py-0.5">
              <div className="w-full border-t border-border"></div>
              <span className="absolute bg-card px-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                or choose sign-in
              </span>
            </div>

            {/* Quick Sign-In Methods Toggle: Email + Password vs. Email 2FA */}
            <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-lg text-xs font-medium border border-border">
              <button
                type="button"
                id="toggle-email-password-tab"
                onClick={() => setLoginMethod("password")}
                className={`py-1.5 px-3 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginMethod === "password"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Lock className="size-3" />
                <span>Email + Password</span>
              </button>
              <button
                type="button"
                id="toggle-email-2fa-tab"
                onClick={() => setLoginMethod("2fa")}
                className={`py-1.5 px-3 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginMethod === "2fa"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Mail className="size-3" />
                <span>Email 2FA Code</span>
              </button>
            </div>

            {/* Error Banners */}
            {loginError && loginMethod === "password" && (
              <div
                id="login-error-alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in duration-200"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="flex-1">{loginError}</div>
              </div>
            )}

            {twoFaError && loginMethod === "2fa" && (
              <div
                id="2fa-error-alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in duration-200"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="flex-1">{twoFaError}</div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SUB-OPTION A: Email + Password Form */}
            {/* ------------------------------------------------------------- */}
            {loginMethod === "password" && (
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="login-email" className="text-xs font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="name@example.com"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        if (loginError) setLoginError(null);
                      }}
                      className="pl-9 text-xs sm:text-sm h-10"
                      autoComplete="email"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-xs font-medium">
                      Password
                    </Label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        if (loginError) setLoginError(null);
                      }}
                      className="pl-9 pr-10 text-xs sm:text-sm h-10"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  id="login-submit-button"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 font-medium text-xs sm:text-sm cursor-pointer shadow-xs mt-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Logging in...
                    </>
                  ) : (
                    "Log In with Email & Password"
                  )}
                </Button>

                <button
                  type="button"
                  onClick={handleAutofillDemo}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors py-1 cursor-pointer"
                >
                  Fill demo credentials (demo@stylemirror.com)
                </button>
              </form>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SUB-OPTION B: Email 2FA (Instant 6-Digit Code Login) */}
            {/* ------------------------------------------------------------- */}
            {loginMethod === "2fa" && !twoFaCodeSent && (
              <form onSubmit={handleRequest2FACode} className="space-y-3.5">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="2fa-email-input" className="text-xs font-medium">
                    Your Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="2fa-email-input"
                      type="email"
                      placeholder="name@example.com"
                      value={twoFaEmail}
                      onChange={(e) => {
                        setTwoFaEmail(e.target.value);
                        if (twoFaError) setTwoFaError(null);
                      }}
                      className="pl-9 text-xs sm:text-sm h-10"
                      autoComplete="email"
                      autoFocus
                      required
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    We will send a one-time 6-digit verification code to sign in securely without a
                    password.
                  </p>
                </div>

                <Button
                  id="request-2fa-code-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 font-medium text-xs sm:text-sm cursor-pointer shadow-xs mt-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Sending 2FA Code...
                    </>
                  ) : (
                    "Send 6-Digit 2FA Code"
                  )}
                </Button>
              </form>
            )}

            {loginMethod === "2fa" && twoFaCodeSent && (
              <form onSubmit={handleVerify2FACode} className="space-y-4">
                <div className="text-left space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Code sent to <strong className="text-foreground">{twoFaEmail}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setTwoFaCodeSent(false)}
                      className="text-primary hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  {devOtpCode && (
                    <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200 mt-2">
                      <span>
                        Preview Code:{" "}
                        <code className="font-mono font-bold bg-background text-foreground px-1.5 py-0.5 rounded border border-border">
                          {devOtpCode}
                        </code>
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setTwoFaCode(devOtpCode)}
                        className="text-xs h-6 px-2 cursor-pointer bg-background"
                      >
                        Auto-fill
                      </Button>
                    </div>
                  )}

                  <div className="pt-2">
                    <Label htmlFor="2fa-code-input" className="text-xs font-medium block">
                      Enter 6-Digit Code
                    </Label>
                    <Input
                      id="2fa-code-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="······"
                      value={twoFaCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setTwoFaCode(val);
                        if (twoFaError) setTwoFaError(null);
                      }}
                      className="h-11 text-center font-mono text-xl tracking-[0.4em] font-bold mt-1"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <Button
                  id="verify-2fa-code-btn"
                  type="submit"
                  disabled={isSubmitting || twoFaCode.length !== 6}
                  className="w-full h-10 font-medium text-xs sm:text-sm cursor-pointer shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Sign In"
                  )}
                </Button>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                  <span>Didn&apos;t receive it?</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isSubmitting}
                    onClick={() => void resendCode()}
                    className="font-medium text-foreground hover:text-accent disabled:opacity-50 cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                  </button>
                </div>
              </form>
            )}

            {/* Instant Guest Mode Action */}
            <div className="border-t border-border pt-3.5 space-y-2.5">
              <Button
                id="modal-continue-guest-btn"
                type="button"
                variant="outline"
                size="sm"
                onClick={loginAsGuest}
                className="w-full text-xs font-medium cursor-pointer border-dashed border-border hover:bg-muted text-foreground/80 gap-1.5"
              >
                <span>Continue as Guest (Session Storage Only)</span>
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                Don&apos;t have an account yet?{" "}
                <button
                  type="button"
                  id="switch-to-signup-btn"
                  onClick={() => setModalView("signup")}
                  className="font-medium text-foreground underline hover:text-accent transition-colors cursor-pointer"
                >
                  Create Account with 2FA
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SIGN UP: STEP 1 (REGISTRATION DETAILS) */}
        {/* ========================================================================= */}
        {modalView === "signup" && signUpStep === 1 && (
          <div className="space-y-5">
            <div className="space-y-1 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <Mail className="size-3.5" />
                  </span>
                  <span className="eyebrow">Sign-Up Step 1</span>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                  Step 1 of 2
                </span>
              </div>
              <h2 id="auth-modal-title" className="font-display text-2xl sm:text-3xl font-semibold">
                Create Account
              </h2>
              <p className="text-xs text-muted-foreground">
                Register with email. A secure 6-digit verification code will be sent to confirm your
                identity.
              </p>
            </div>

            {/* Quick Google Sign Up Option */}
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleGoogleSignIn}
              className="w-full h-10 border-border bg-card hover:bg-muted/80 font-medium text-xs sm:text-sm gap-2.5 cursor-pointer shadow-xs"
            >
              <GoogleIcon className="size-4 shrink-0" />
              <span>Sign Up with Google</span>
            </Button>

            <div className="relative flex items-center justify-center py-0.5">
              <div className="w-full border-t border-border"></div>
              <span className="absolute bg-card px-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                or with email
              </span>
            </div>

            {signUpError && (
              <div
                id="signup-error-alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in duration-200"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="flex-1">{signUpError}</div>
              </div>
            )}

            <form onSubmit={handleSignUpStep1Submit} className="space-y-3.5">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="signup-email" className="text-xs font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@example.com"
                    value={signUpEmail}
                    onChange={(e) => {
                      setSignUpEmail(e.target.value);
                      if (signUpError) setSignUpError(null);
                    }}
                    className="pl-9 text-xs sm:text-sm h-10"
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signup-password" className="text-xs font-medium">
                    Password
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Min. 6 chars</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type={showSignUpPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={signUpPassword}
                    onChange={(e) => {
                      setSignUpPassword(e.target.value);
                      if (signUpError) setSignUpError(null);
                    }}
                    className="pl-9 pr-10 text-xs sm:text-sm h-10"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                    aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                  >
                    {showSignUpPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signup-confirm-password" className="text-xs font-medium">
                    Confirm Password
                  </Label>
                  {passwordsMismatch && (
                    <span className="text-[11px] text-destructive font-medium">
                      Passwords do not match
                    </span>
                  )}
                  {passwordsMatch && (
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-0.5">
                      <Check className="size-3" /> Match
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (signUpError) setSignUpError(null);
                    }}
                    className={`pl-9 pr-10 text-xs sm:text-sm h-10 ${
                      passwordsMismatch ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                id="signup-continue-step1-button"
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 font-medium text-xs sm:text-sm cursor-pointer shadow-xs mt-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Sending 2FA Verification Code...
                  </>
                ) : (
                  "Continue to Email 2FA Verification"
                )}
              </Button>
            </form>

            <div className="border-t border-border pt-3.5 text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                id="switch-to-login-btn"
                onClick={() => setModalView("login")}
                className="font-medium text-foreground underline hover:text-accent transition-colors cursor-pointer"
              >
                Log In
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SIGN UP: STEP 2 (SECURE EMAIL VERIFICATION CODE FLOW) */}
        {/* ========================================================================= */}
        {modalView === "signup" && signUpStep === 2 && (
          <div className="space-y-5">
            <div className="space-y-1 text-left">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  id="back-to-step-1-button"
                  onClick={backToStep1}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to Step 1
                </button>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                  Step 2 of 2
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <ShieldCheck className="size-3.5" />
                </span>
                <span className="eyebrow">Email Verification</span>
              </div>
              <h2 id="auth-modal-title" className="font-display text-2xl sm:text-3xl font-semibold">
                Verify Your Email
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We sent a 6-digit verification code to{" "}
                <strong className="text-foreground font-medium">{pendingEmail}</strong>. Enter the
                code below to complete your sign-up.
              </p>
            </div>

            {verificationError && (
              <div
                id="verification-error-alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in duration-200"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="flex-1">{verificationError}</div>
              </div>
            )}

            {devOtpCode && (
              <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-200">
                <div className="space-y-0.5">
                  <span className="font-semibold block">Preview Verification Code:</span>
                  <span>
                    Use code{" "}
                    <code className="font-mono font-bold bg-background text-foreground px-1.5 py-0.5 rounded border border-border">
                      {devOtpCode}
                    </code>
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setVerificationCode(devOtpCode)}
                  className="text-xs h-7 px-2.5 cursor-pointer bg-background"
                >
                  Auto-fill
                </Button>
              </div>
            )}

            <form onSubmit={handleVerificationSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <Label
                  htmlFor="verification-code-input"
                  className="text-xs font-medium text-foreground block"
                >
                  6-Digit Verification Code
                </Label>
                <div className="relative">
                  <Input
                    id="verification-code-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="······"
                    value={verificationCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setVerificationCode(val);
                      if (verificationError) setVerificationError(null);
                    }}
                    className="h-12 text-center font-mono text-2xl tracking-[0.4em] font-bold"
                    autoFocus
                    required
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Code valid for 10 minutes</span>
                  <span>Max 5 attempts allowed</span>
                </div>
              </div>

              {/* Resend Code Option with Countdown */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>Didn&apos;t receive the email?</span>
                <button
                  type="button"
                  id="resend-code-btn"
                  disabled={resendCooldown > 0 || isSubmitting}
                  onClick={() => void resendCode()}
                  className="font-medium text-foreground hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend Code in ${resendCooldown}s`
                  ) : (
                    <>
                      <RefreshCw className="size-3" />
                      <span>Resend Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Verify & Complete Sign Up Button */}
              <Button
                id="verify-complete-signup-button"
                type="submit"
                disabled={isSubmitting || verificationCode.length !== 6}
                className="w-full h-11 font-medium text-xs sm:text-sm cursor-pointer shadow-sm mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Verifying & Activating Account...
                  </>
                ) : (
                  "Verify & Complete Sign Up"
                )}
              </Button>
            </form>

            <div className="border-t border-border pt-3 text-center text-xs text-muted-foreground">
              Need to use a different email?{" "}
              <button
                type="button"
                onClick={backToStep1}
                className="font-medium text-foreground underline hover:text-accent cursor-pointer"
              >
                Change email
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
