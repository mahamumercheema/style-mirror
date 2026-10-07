import { useState, useEffect, useRef } from "react";
import { AlertCircle, Loader2, Mail, ShieldCheck, User, X } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Modal buttons: readable size, label always fits (it never overflows the button) */
const MODAL_BUTTON =
  "h-11 w-full min-w-0 px-4 text-[13px] tracking-[0.12em] whitespace-nowrap cursor-pointer";
/** Text fields: 44px tall, 15px text */
const MODAL_INPUT = "h-11 text-[15px] md:text-[15px]";
const MODAL_LABEL = "text-[13px] font-medium";

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

/**
 * Sign in / sign up. Passwordless: Google, or a 6-digit code emailed to the user. Guests can
 * continue without an account; after any sign-in the user returns to where they came from.
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
    devOtpCode,
    closeModal,
    setModalView,
    loginWithGoogle,
    loginAsGuest,
    requestEmail2FA,
    verifyEmail2FA,
    startSignUp,
    verifyTwoStepCode,
    resendCode,
    backToStep1,
  } = useAuth();

  // Log in: email, then the emailed code
  const [loginEmail, setLoginEmail] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [loginCodeSent, setLoginCodeSent] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sign up: optional name + email, then the emailed code
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpCode, setSignUpCode] = useState("");
  const [signUpError, setSignUpError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [guestLoading, setGuestLoading] = useState(false);

  // Each time the modal opens, start from an empty form (no stale or autofilled values)
  useEffect(() => {
    if (!isModalOpen) return;
    setLoginEmail("");
    setLoginCode("");
    setLoginCodeSent(false);
    setSignUpName("");
    setSignUpEmail("");
    setSignUpCode("");
    setGuestLoading(false);
  }, [isModalOpen]);

  // Keyboard accessibility: ESC key to close
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeModal]);

  // Clear errors when switching views or steps
  useEffect(() => {
    setLoginError(null);
    setSignUpError(null);
  }, [modalView, signUpStep, loginCodeSent, isModalOpen]);

  if (!isModalOpen) return null;

  const isSignUp = modalView === "signup";
  const signUpCodeStep = isSignUp && signUpStep === 2;

  const handleGoogleSignIn = async () => {
    const setError = isSignUp ? setSignUpError : setLoginError;
    setError(null);
    try {
      const result = await loginWithGoogle();
      if (!result.success && result.error) setError(result.error);
    } catch (error) {
      console.error("Google sign-in failed", error);
      setError("Couldn't sign in with Google. Please try again.");
    }
  };

  /**
   * Guest session, then back to where the user came from: a gated feature they asked for
   * (forwarded by the auth context), else the studio; opened on the studio itself (e.g. from
   * the Step 02 measurements gate) it stays there and that step unlocks.
   */
  const handleContinueAsGuest = async () => {
    setGuestLoading(true);
    try {
      if (!redirectRoute && pathname !== "/studio") await navigate({ to: "/studio" });
      loginAsGuest();
    } catch (error) {
      console.error("Guest session failed", error);
      setLoginError("Couldn't start a guest session. Please try again.");
      setGuestLoading(false);
    }
  };

  const handleSendLoginCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const email = loginEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      setLoginError("Please enter a valid email address.");
      return;
    }
    try {
      const result = await requestEmail2FA(email);
      if (!result.success) setLoginError(result.error ?? "Couldn't send the code.");
      else setLoginCodeSent(true);
    } catch (error) {
      console.error("Sending sign-in code failed", error);
      setLoginError("Couldn't send the code. Please try again.");
    }
  };

  const handleVerifyLoginCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const result = await verifyEmail2FA(loginCode.trim());
      if (!result.success && result.error) setLoginError(result.error);
    } catch (error) {
      console.error("Verifying sign-in code failed", error);
      setLoginError("Couldn't verify the code. Please try again.");
    }
  };

  const handleSendSignUpCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);
    try {
      const result = await startSignUp(signUpEmail, signUpName);
      if (!result.success && result.error) setSignUpError(result.error);
    } catch (error) {
      console.error("Sending sign-up code failed", error);
      setSignUpError("Couldn't send the code. Please try again.");
    }
  };

  const handleVerifySignUpCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);
    try {
      const result = await verifyTwoStepCode(signUpCode.trim());
      if (!result.success && result.error) setSignUpError(result.error);
    } catch (error) {
      console.error("Verifying sign-up code failed", error);
      setSignUpError("Couldn't verify the code. Please try again.");
    }
  };

  const errorAlert = (id: string, message: string | null) =>
    message ? (
      <div
        id={id}
        className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-[13px] text-destructive animate-in fade-in duration-200"
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <div className="flex-1">{message}</div>
      </div>
    ) : null;

  const googleButton = (label: string) => (
    <Button
      id="quick-google-signin-btn"
      type="button"
      variant="outline"
      disabled={isSubmitting || guestLoading}
      onClick={() => void handleGoogleSignIn()}
      className={cn(MODAL_BUTTON, "gap-2.5")}
    >
      <GoogleIcon className="size-4 shrink-0" />
      <span>{label}</span>
    </Button>
  );

  const orDivider = (
    <div className="relative flex items-center justify-center py-0.5">
      <div className="w-full border-t border-border" />
      <span className="absolute bg-card px-3 text-[13px] text-muted-foreground">or</span>
    </div>
  );

  const emailField = (id: string, value: string, onChange: (value: string) => void) => (
    <div className="space-y-1.5 text-left">
      <Label htmlFor={id} className={MODAL_LABEL}>
        Email address
      </Label>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type="email"
          placeholder="Enter your email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(MODAL_INPUT, "pl-9")}
          autoComplete="email"
          autoFocus
          required
        />
      </div>
    </div>
  );

  const sendCodeButton = (id: string) => (
    <Button id={id} type="submit" disabled={isSubmitting || guestLoading} className={MODAL_BUTTON}>
      {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
      {isSubmitting ? "Sending code..." : "Send code"}
    </Button>
  );

  /** The shared second step: the 6-digit code, verify, resend (30s cooldown), change email */
  const codeStep = (opts: {
    email: string;
    code: string;
    setCode: (code: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onChangeEmail: () => void;
    inputId: string;
    submitId: string;
  }) => (
    <form onSubmit={opts.onSubmit} className="space-y-3.5">
      <p className="text-[13px] text-muted-foreground">
        We sent a 6-digit code to{" "}
        <strong className="font-medium text-foreground">{opts.email}</strong>.
      </p>

      {/* Development only (no email service configured): show the code so it can be tested */}
      {devOtpCode && import.meta.env.DEV ? (
        <div className="flex items-center justify-between rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-[13px] text-gold-ink">
          <span>
            Dev code: <code className="font-mono font-semibold">{devOtpCode}</code>
          </span>
          <button
            type="button"
            onClick={() => opts.setCode(devOtpCode)}
            className="cursor-pointer underline underline-offset-4"
          >
            Fill
          </button>
        </div>
      ) : null}

      <div className="space-y-1.5 text-left">
        <Label htmlFor={opts.inputId} className={MODAL_LABEL}>
          6-digit code
        </Label>
        <Input
          id={opts.inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="······"
          value={opts.code}
          onChange={(e) => opts.setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="h-12 text-center font-mono text-xl font-semibold tracking-[0.4em]"
          autoFocus
          required
        />
      </div>

      <Button
        id={opts.submitId}
        type="submit"
        disabled={isSubmitting || opts.code.length !== 6}
        className={MODAL_BUTTON}
      >
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {isSubmitting ? "Verifying..." : "Verify & continue"}
      </Button>

      <div className="flex items-center justify-between text-[13px] text-muted-foreground">
        <button
          type="button"
          id="resend-code-btn"
          disabled={resendCooldown > 0 || isSubmitting}
          onClick={() => void resendCode()}
          className="cursor-pointer font-medium text-foreground underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
        </button>
        <button
          type="button"
          id="use-different-email-btn"
          onClick={opts.onChangeEmail}
          className="cursor-pointer underline-offset-4 hover:text-foreground hover:underline"
        >
          Use a different email
        </button>
      </div>
    </form>
  );

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
        className="relative my-auto w-full max-w-[440px] rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-[var(--shadow-lift)] transition-all animate-in fade-in zoom-in-95 duration-200 sm:p-7"
      >
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-4 top-4 cursor-pointer rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close modal"
        >
          <X className="size-4" />
        </button>

        {/* Slim notice when a gated feature sent the user here (the redirect back to it is
            handled by the auth context; no target label is shown). Stops short of the close
            button in the corner. */}
        {(gateReason || redirectRoute) && (
          <div className="mb-5 mr-9 flex items-center gap-2.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-[14px] leading-snug text-gold-ink">
            <ShieldCheck className="size-4 shrink-0" />
            <p>Log in or create an account to continue.</p>
          </div>
        )}

        {/* ============================== LOG IN ============================== */}
        {!isSignUp && (
          <div className="space-y-4">
            <div className="space-y-1 text-left">
              <h2 id="auth-modal-title" className="font-display text-[32px] leading-tight">
                Welcome back
              </h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                Sign in with Google or a code sent to your email.
              </p>
            </div>

            {googleButton("Continue with Google")}
            {orDivider}
            {errorAlert("login-error-alert", loginError)}

            {!loginCodeSent ? (
              <form onSubmit={handleSendLoginCode} className="space-y-3.5">
                {emailField("login-email", loginEmail, (value) => {
                  setLoginEmail(value);
                  if (loginError) setLoginError(null);
                })}
                {sendCodeButton("login-send-code-button")}
              </form>
            ) : (
              codeStep({
                email: loginEmail.trim().toLowerCase(),
                code: loginCode,
                setCode: (code) => {
                  setLoginCode(code);
                  if (loginError) setLoginError(null);
                },
                onSubmit: (e) => void handleVerifyLoginCode(e),
                onChangeEmail: () => {
                  setLoginCode("");
                  setLoginCodeSent(false);
                },
                inputId: "login-code-input",
                submitId: "login-verify-button",
              })
            )}

            <div className="space-y-2.5 border-t border-border pt-3.5">
              <div className="space-y-1.5">
                <Button
                  id="continue-as-guest-button"
                  type="button"
                  variant="secondary"
                  onClick={() => void handleContinueAsGuest()}
                  disabled={guestLoading || isSubmitting}
                  className={MODAL_BUTTON}
                >
                  {guestLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                  Continue as guest
                </Button>
                <p className="text-center text-xs text-muted-foreground">No account needed</p>
              </div>

              <div className="text-center text-[13px] text-muted-foreground">
                Don&apos;t have an account yet?{" "}
                <button
                  type="button"
                  id="switch-to-signup-btn"
                  onClick={() => setModalView("signup")}
                  className="cursor-pointer font-medium text-foreground underline transition-colors hover:text-accent"
                >
                  Sign up
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================== SIGN UP ============================== */}
        {isSignUp && (
          <div className="space-y-4">
            <div className="space-y-1 text-left">
              <h2 id="auth-modal-title" className="font-display text-[32px] leading-tight">
                {signUpCodeStep ? "Check your email" : "Create account"}
              </h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                {signUpCodeStep
                  ? "Enter the code to finish creating your account."
                  : "Sign up with Google, or with your email and a code we send you."}
              </p>
            </div>

            {!signUpCodeStep ? (
              <>
                {googleButton("Sign up with Google")}
                {orDivider}
              </>
            ) : null}
            {errorAlert("signup-error-alert", signUpError)}

            {!signUpCodeStep ? (
              <form onSubmit={handleSendSignUpCode} className="space-y-3.5">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="signup-name" className={MODAL_LABEL}>
                    Name <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Your name"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      className={cn(MODAL_INPUT, "pl-9")}
                      autoComplete="name"
                      maxLength={80}
                    />
                  </div>
                </div>
                {emailField("signup-email", signUpEmail, (value) => {
                  setSignUpEmail(value);
                  if (signUpError) setSignUpError(null);
                })}
                {sendCodeButton("signup-send-code-button")}
              </form>
            ) : (
              codeStep({
                email: pendingEmail,
                code: signUpCode,
                setCode: (code) => {
                  setSignUpCode(code);
                  if (signUpError) setSignUpError(null);
                },
                onSubmit: (e) => void handleVerifySignUpCode(e),
                onChangeEmail: () => {
                  setSignUpCode("");
                  backToStep1();
                },
                inputId: "signup-code-input",
                submitId: "signup-verify-button",
              })
            )}

            <div className="border-t border-border pt-3.5 text-center text-[13px] text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                id="switch-to-login-btn"
                onClick={() => setModalView("login")}
                className="cursor-pointer font-medium text-foreground underline transition-colors hover:text-accent"
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
