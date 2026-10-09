import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { AtelierOraLogo } from "@/components/AtelierOraLogo";
import { Button } from "@/components/ui/button";
import { ShieldCheck, UserPlus } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign Up — Atelier Ora" },
      {
        name: "description",
        content:
          "Create your Atelier Ora account with email and password to access your digital wardrobe.",
      },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const { isAuthenticated, openSignUp, isModalOpen } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const redirectParam = params.get("redirect") || "/closet";

      if (isAuthenticated) {
        window.location.assign(redirectParam);
        return;
      }

      // Automatically open the Auth Modal in Sign Up view
      openSignUp(undefined, "Create an account to start curating your wardrobe.", redirectParam);
    }
  }, [isAuthenticated, openSignUp]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md space-y-6">
        <AtelierOraLogo />
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 border border-amber-200">
            <ShieldCheck className="size-3.5 text-amber-600" />
            <span>Registration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-foreground">
            Create Your Account
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Register with your email and password to access the AI Stylist, your private wardrobe,
            and measurements.
          </p>
        </div>

        {!isModalOpen && (
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={() =>
                openSignUp(
                  undefined,
                  "Create an account to start curating your wardrobe.",
                  "/closet",
                )
              }
              className="w-full gap-2 cursor-pointer font-medium bg-gold text-background hover:bg-gold/90 border border-gold"
            >
              <UserPlus className="size-4" />
              <span>Open Sign-Up Form</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
