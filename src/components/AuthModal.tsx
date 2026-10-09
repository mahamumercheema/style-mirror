import { useState, useEffect, useRef } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, User, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Modal buttons: readable size, label always fits */
const MODAL_BUTTON =
  "h-11 w-full min-w-0 px-4 text-[13px] tracking-[0.08em] uppercase font-semibold whitespace-nowrap cursor-pointer";
/** Text fields: 44px tall, 15px text */
const MODAL_INPUT = "h-11 text-[14px] md:text-[14px]";
const MODAL_LABEL = "text-[12px] font-medium text-foreground/90";

/**
 * Traditional Email + Password Authentication Modal
 * - Log In: Email + Password directly (no OTP during login)
 * - Sign Up: Email + Password + 2-Step OTP Verification (6-digit code with autofill disabled)
 * - No Google Auth, No Dev helper codes
 */
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
    closeModal,
    setModalView,
    loginWithPassword,
    startSignUp,
    verifyTwoStepCode,
    resendCode,
    backToStep1,
  } = useAuth();

  // Log in form state: Email + Password only
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sign up form state: Step 1 (Name, Email, Password, Confirm Password)
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);

  // Sign up form state: Step 2 (6-digit OTP code)
  const [signUpCode, setSignUpCode] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens or view changes
  useEffect(() => {
    if (!isModalOpen) return;
    setLoginError(null);
    setSignUpError(null);
    setSignUpCode("");
  }, [isModalOpen, modalView]);

  // Keyboard accessibility: ESC key to close
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeModal]);

  if (!isModalOpen) return null;

  const isSignUp = modalView === "signup";
  const signUpCodeStep = isSignUp && signUpStep === 2;

  // Handle Log In submission: Email + Password directly
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const email = loginEmail.trim().toLowerCase();
    const password = loginPassword;

    if (!email || !email.includes("@")) {
      setLoginError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setLoginError("Please enter your password.");
      return;
    }

    try {
      const result = await loginWithPassword(email, password);
      if (!result.success && result.error) {
        setLoginError(result.error);
      }
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError("Unable to log in. Please check your credentials and try again.");
    }
  };

  // Handle Sign Up Step 1 submission: Email + Password registration
  const handleSignUpStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);

    const email = signUpEmail.trim().toLowerCase();
    const password = signUpPassword;
    const confirmPassword = signUpConfirmPassword;

    if (!email || !email.includes("@")) {
      setSignUpError("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 6) {
      setSignUpError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setSignUpError("Passwords do not match. Please re-enter.");
      return;
    }

    try {
      const result = await startSignUp(email, password, signUpName.trim() || undefined);
      if (!result.success && result.error) {
        setSignUpError(result.error);
      }
    } catch (error) {
      console.error("Sign up request failed:", error);
      setSignUpError("Failed to initiate registration. Please try again.");
    }
  };

  // Handle Sign Up Step 2 submission: 6-Digit OTP verification
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);

    const code = signUpCode.trim();
    if (code.length !== 6) {
      setSignUpError("Please enter the complete 6-digit verification code.");
      return;
    }

    try {
      const result = await verifyTwoStepCode(code);
      if (!result.success && result.error) {
        setSignUpError(result.error);
      }
    } catch (error) {
      console.error("OTP verification failed:", error);
      setSignUpError("Failed to verify code. Please try again.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div
        ref={modalRef}
        id="auth-modal-dialog"
        className="relative my-auto w-full max-w-[430px] rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-[var(--shadow-lift)] transition-all animate-in fade-in zoom-in-95 duration-200 sm:p-7"
      >
        {/* Modal Close Button */}
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-4 top-4 cursor-pointer rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close modal"
        >
          <X className="size-4" />
        </button>

        {/* Feature Gate Banner */}
        {(gateReason || redirectRoute) && (
          <div className="mb-5 mr-8 flex items-center gap-2.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-[13px] leading-snug text-gold-ink">
            <ShieldCheck className="size-4 shrink-0 text-gold-ink" />
            <p>Please sign in to access your digital wardrobe & features.</p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LOG IN VIEW (Email + Password Only, No OTP, No Google) */}
        {/* ========================================================================= */}
        {!isSignUp && (
          <div className="space-y-5">
            <div className="space-y-1 text-left">
              <h2
                id="auth-modal-title"
                className="font-display text-[28px] sm:text-[30px] leading-tight font-semibold text-foreground"
              >
                Welcome back
              </h2>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Enter your email address and password to sign in.
              </p>
            </div>

            {/* Error Alert */}
            {loginError && (
              <div
                id="login-error-alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-[13px] text-destructive animate-in fade-in duration-200"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <div className="flex-1 leading-snug">{loginError}</div>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Email Address */}
              <div className="space-y-1.5 text-left">
                <Label htmlFor="login-email" className={MODAL_LABEL}>
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    className={cn(MODAL_INPUT, "pl-10")}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password" className={MODAL_LABEL}>
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    id="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    className={cn(MODAL_INPUT, "pl-10 pr-10")}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                    aria-label={showLoginPassword ? "Hide password" : "Show password"}
                  >
                    {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Log In */}
              <Button
                id="login-submit-button"
                type="submit"
                disabled={isSubmitting || !loginEmail || !loginPassword}
                className={cn(
                  MODAL_BUTTON,
                  "bg-gold text-background hover:bg-gold/90 border border-gold mt-2",
                )}
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                <span>{isSubmitting ? "Signing in..." : "Log In"}</span>
              </Button>
            </form>

            {/* Switch to Sign Up */}
            <div className="border-t border-border/80 pt-4 text-center text-[13px] text-muted-foreground">
              Don&apos;t have an account yet?{" "}
              <button
                type="button"
                id="switch-to-signup-btn"
                onClick={() => setModalView("signup")}
                className="cursor-pointer font-semibold text-foreground underline underline-offset-4 transition-colors hover:text-gold-ink"
              >
                Create an account
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SIGN UP VIEW (Email + Password + 2-Step OTP Verification) */}
        {/* ========================================================================= */}
        {isSignUp && (
          <div className="space-y-5">
            <div className="space-y-1 text-left">
              <h2
                id="auth-modal-title"
                className="font-display text-[28px] sm:text-[30px] leading-tight font-semibold text-foreground"
              >
                {signUpCodeStep ? "Verify Your Email" : "Create Account"}
              </h2>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {signUpCodeStep
                  ? `Enter the 6-digit code sent to ${pendingEmail}`
                  : "Sign up with your email and password to start your digital wardrobe."}
              </p>
            </div>

            {/* Error Alert */}
            {signUpError && (
              <div
                id="signup-error-alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-[13px] text-destructive animate-in fade-in duration-200"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <div className="flex-1 leading-snug">{signUpError}</div>
              </div>
            )}

            {/* STEP 1: Email + Password Registration Form */}
            {!signUpCodeStep ? (
              <form onSubmit={handleSignUpStep1Submit} className="space-y-3.5">
                {/* Optional Name */}
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="signup-name" className={MODAL_LABEL}>
                    Full Name <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="e.g. Amna"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      className={cn(MODAL_INPUT, "pl-10")}
                      autoComplete="name"
                      maxLength={80}
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="signup-email" className={MODAL_LABEL}>
                    Email Address *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signUpEmail}
                      onChange={(e) => {
                        setSignUpEmail(e.target.value);
                        if (signUpError) setSignUpError(null);
                      }}
                      className={cn(MODAL_INPUT, "pl-10")}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="signup-password" className={MODAL_LABEL}>
                    Password *{" "}
                    <span className="font-normal text-muted-foreground">(min. 6 characters)</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="signup-password"
                      type={showSignUpPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={signUpPassword}
                      onChange={(e) => {
                        setSignUpPassword(e.target.value);
                        if (signUpError) setSignUpError(null);
                      }}
                      className={cn(MODAL_INPUT, "pl-10 pr-10")}
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
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

                {/* Confirm Password */}
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="signup-confirm-password" className={MODAL_LABEL}>
                    Confirm Password *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="signup-confirm-password"
                      type={showSignUpPassword ? "text" : "password"}
                      placeholder="Re-type your password"
                      value={signUpConfirmPassword}
                      onChange={(e) => {
                        setSignUpConfirmPassword(e.target.value);
                        if (signUpError) setSignUpError(null);
                      }}
                      className={cn(MODAL_INPUT, "pl-10")}
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </div>
                </div>

                {/* Submit Sign Up Step 1 */}
                <Button
                  id="signup-submit-button"
                  type="submit"
                  disabled={
                    isSubmitting || !signUpEmail || !signUpPassword || !signUpConfirmPassword
                  }
                  className={cn(
                    MODAL_BUTTON,
                    "bg-gold text-background hover:bg-gold/90 border border-gold mt-2",
                  )}
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  <span>
                    {isSubmitting ? "Sending Verification Code..." : "Sign Up & Send Code"}
                  </span>
                </Button>
              </form>
            ) : (
              /* STEP 2: 6-Digit OTP Verification Screen */
              <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label htmlFor="signup-otp-input" className={MODAL_LABEL}>
                    Enter 6-Digit Verification Code
                  </Label>

                  {/*
                    CRITICAL SECURITY & UX REQUIREMENT:
                    Disable browser and password manager autofill on the OTP code input step.
                    autoComplete="off"
                    data-1p-ignore="true"
                    data-lpignore="true"
                  */}
                  <Input
                    id="signup-otp-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="off"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    placeholder="······"
                    value={signUpCode}
                    onChange={(e) => {
                      setSignUpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                      if (signUpError) setSignUpError(null);
                    }}
                    className="h-14 text-center font-mono text-2xl font-bold tracking-[0.45em] bg-background border-border/90 focus:border-gold"
                    autoFocus
                    required
                  />
                  <p className="text-[11px] text-muted-foreground text-center">
                    Check your email inbox and spam folder. Code expires in 10 minutes.
                  </p>
                </div>

                {/* Submit Verify Code */}
                <Button
                  id="signup-verify-button"
                  type="submit"
                  disabled={isSubmitting || signUpCode.length !== 6}
                  className={cn(
                    MODAL_BUTTON,
                    "bg-gold text-background hover:bg-gold/90 border border-gold",
                  )}
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  <span>{isSubmitting ? "Verifying..." : "Verify & Complete Registration"}</span>
                </Button>

                {/* Resend Code with 60-second cooldown timer & Change Email */}
                <div className="flex items-center justify-between text-[12px] pt-1">
                  <button
                    type="button"
                    id="resend-code-btn"
                    disabled={resendCooldown > 0 || isSubmitting}
                    onClick={() => void resendCode()}
                    className="cursor-pointer font-medium text-foreground underline underline-offset-4 hover:text-gold-ink disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                  </button>
                  <button
                    type="button"
                    id="use-different-email-btn"
                    onClick={() => {
                      setSignUpCode("");
                      backToStep1();
                    }}
                    className="cursor-pointer text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    Change email
                  </button>
                </div>
              </form>
            )}

            {/* Switch to Log In */}
            <div className="border-t border-border/80 pt-4 text-center text-[13px] text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                id="switch-to-login-btn"
                onClick={() => setModalView("login")}
                className="cursor-pointer font-semibold text-foreground underline underline-offset-4 transition-colors hover:text-gold-ink"
              >
                Log in
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
