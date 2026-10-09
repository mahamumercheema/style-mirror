import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { AtelierOraLogo } from "@/components/AtelierOraLogo";
import { Button } from "@/components/ui/button";
import { KeyRound, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Atelier Ora" },
      {
        name: "description",
        content: "Reset your Atelier Ora account password using 2-step email verification.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { isAuthenticated, openForgotPassword, openLogin, isModalOpen } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isAuthenticated) {
        window.location.assign("/closet");
        return;
      }

      // Automatically open the Auth Modal in Forgot Password view
      openForgotPassword();
    }
  }, [isAuthenticated, openForgotPassword]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md space-y-6">
        <AtelierOraLogo />
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 border border-amber-200">
            <ShieldCheck className="size-3.5 text-amber-600" />
            <span>Password Recovery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-foreground">
            Reset Your Password
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter your registered email address to receive a 6-digit verification code and reset
            your password.
          </p>
        </div>

        {!isModalOpen && (
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={() => openForgotPassword()}
              className="w-full gap-2 cursor-pointer font-medium bg-gold text-background hover:bg-gold/90 border border-gold"
            >
              <KeyRound className="size-4" />
              <span>Open Password Reset</span>
            </Button>
            <div className="text-xs pt-1 text-muted-foreground">
              Remembered your password?{" "}
              <button
                type="button"
                onClick={() => openLogin()}
                className="cursor-pointer font-semibold text-foreground hover:underline underline-offset-4"
              >
                Log In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
