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
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthModal() {
  const {
    isModalOpen,
    modalView,
    signUpStep,
    pendingEmail,
    resendCooldown,
    gateReason,
    isSubmitting,
    closeModal,
    setModalView,
    login,
    startSignUp,
    verifyTwoStepCode,
    resendCode,
    backToStep1,
  } = useAuth();

  // Login Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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
    setVerificationCode("");
  }, [modalView, signUpStep, isModalOpen]);

  if (!isModalOpen) return null;

  // Handle Login Submit
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeModal();
        }
      }}
    >
      <div
        ref={modalRef}
        id="auth-modal-dialog"
        className="relative w-full max-w-md border border-border bg-card text-card-foreground p-6 sm:p-8 shadow-[var(--shadow-lift)] rounded-xl my-auto transition-all"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-4 top-4 p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="size-4" />
        </button>

        {/* Optional Contextual Gate Banner */}
        {gateReason && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-accent/40 bg-accent/15 p-3 text-xs text-accent-foreground">
            <ShieldCheck className="size-4 shrink-0 text-accent mt-0.5" />
            <div className="font-medium leading-relaxed">{gateReason}</div>
          </div>
        )}

        {/* ======================= LOG IN VIEW ======================= */}
        {modalView === "login" && (
          <div className="space-y-6">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <KeyRound className="size-3.5" />
                </span>
                <span className="eyebrow">Account Access</span>
              </div>
              <h2 id="auth-modal-title" className="font-display text-3xl">
                Welcome Back
              </h2>
              <p className="text-xs text-muted-foreground">
                Enter your email and password to access your body measurements and fitting room.
              </p>
            </div>

            {loginError && (
              <div
                id="login-error-alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="flex-1">{loginError}</div>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
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
                    className="pl-9 text-sm"
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
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
                    className="pl-9 pr-10 text-sm"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
                    aria-label={showLoginPassword ? "Hide password" : "Show password"}
                  >
                    {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button
                id="login-submit-button"
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 mt-1 font-medium cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Logging in...
                  </>
                ) : (
                  "Log In"
                )}
              </Button>

              {/* Demo Auto-fill Helper */}
              <button
                type="button"
                onClick={handleAutofillDemo}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors py-1 cursor-pointer"
              >
                Fill demo account (demo@stylemirror.com)
              </button>
            </form>

            <div className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
              Don&apos;t have an account yet?{" "}
              <button
                type="button"
                id="switch-to-signup-btn"
                onClick={() => setModalView("signup")}
                className="font-medium text-foreground underline hover:text-accent transition-colors cursor-pointer"
              >
                Sign up with Email Verification
              </button>
            </div>
          </div>
        )}

        {/* ================= SIGN UP: STEP 1 (REGISTRATION DETAILS) ================= */}
        {modalView === "signup" && signUpStep === 1 && (
          <div className="space-y-6">
            <div className="space-y-1.5 text-left">
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
              <h2 id="auth-modal-title" className="font-display text-3xl">
                Create Account
              </h2>
              <p className="text-xs text-muted-foreground">
                Enter your details to register. A secure 6-digit verification code will be sent to
                your email.
              </p>
            </div>

            {signUpError && (
              <div
                id="signup-error-alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="flex-1">{signUpError}</div>
              </div>
            )}

            <form onSubmit={handleSignUpStep1Submit} className="space-y-4">
              {/* Field 1: Email */}
              <div className="space-y-1.5">
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
                    className="pl-9 text-sm"
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signup-password" className="text-xs font-medium">
                    Password
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Min. 6 characters</span>
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
                    className="pl-9 pr-10 text-sm"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
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

              {/* Field 3: Confirm Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signup-confirm-password" className="text-xs font-medium">
                    Confirm Password
                  </Label>
                  {passwordsMatch && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                      <Check className="size-3" /> Passwords match
                    </span>
                  )}
                  {passwordsMismatch && (
                    <span className="text-[11px] text-destructive font-medium">
                      Passwords do not match
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
                    className={`pl-9 pr-10 text-sm ${
                      passwordsMismatch
                        ? "border-destructive focus-visible:ring-destructive"
                        : passwordsMatch
                          ? "border-emerald-600 focus-visible:ring-emerald-600"
                          : ""
                    }`}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
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
                className="w-full h-10 mt-1 font-medium cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Sending Verification Code...
                  </>
                ) : (
                  "Continue to Email Verification"
                )}
              </Button>
            </form>

            <div className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
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

        {/* ================= SIGN UP: STEP 2 (SECURE EMAIL VERIFICATION CODE FLOW) ================= */}
        {modalView === "signup" && signUpStep === 2 && (
          <div className="space-y-6">
            <div className="space-y-1.5 text-left">
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
              <h2 id="auth-modal-title" className="font-display text-3xl">
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
                className="w-full h-11 font-medium text-sm cursor-pointer shadow-sm mt-2"
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
