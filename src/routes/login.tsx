import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { AtelierOraLogo } from "@/components/AtelierOraLogo";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — Atelier Ora" },
      {
        name: "description",
        content: "Please log in or create an account to access the AI Stylist and digital closet.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { isAuthenticated, openLogin, isModalOpen } = useAuth();

  useEffect(() => {
    // Check if redirect query param exists
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const redirectParam = params.get("redirect") || "/generate";

      if (isAuthenticated) {
        window.location.assign(redirectParam);
        return;
      }

      // Automatically open the Auth Modal with prompt and target redirection
      openLogin(
        undefined,
        "Please log in or create an account to access the AI Stylist and digital closet.",
        redirectParam,
      );
    }
  }, [isAuthenticated, openLogin]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md space-y-6">
        <AtelierOraLogo />
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 border border-amber-200">
            <ShieldCheck className="size-3.5 text-amber-600" />
            <span>Protected Feature Gate</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-foreground">
            Account Required
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Please log in or create an account to access the AI Stylist and digital closet.
          </p>
        </div>

        {!isModalOpen && (
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={() =>
                openLogin(
                  undefined,
                  "Please log in or create an account to access the AI Stylist and digital closet.",
                  "/generate",
                )
              }
              className="w-full gap-2 cursor-pointer font-medium"
            >
              <Sparkles className="size-4" />
              <span>Open Sign-In Options</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
