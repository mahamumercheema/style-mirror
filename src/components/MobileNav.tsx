import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogIn, LogOut, Menu, User, UserPlus, X } from "lucide-react";

import { AtelierOraLogo } from "@/components/AtelierOraLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const LINKS = [
  { to: "/closet", label: "My Closet", accent: false },
  { to: "/generate", label: "AI Stylist", accent: true },
  { to: "/studio", label: "Fitting Studio", accent: false },
] as const;

/**
 * Mobile-only (< md) menu: a single icon in the header that opens a full-screen dark menu
 * with the three page links and Log In / Sign Up stacked full-width. Rendered into
 * document.body so it always uses the site's dark palette, whatever page section it's in.
 */
export function MobileNav() {
  const { user, isAuthenticated, openLogin, openSignUp, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  // Close on navigation and on Escape; stop the page scrolling behind the menu
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="glow -mr-2 flex size-10 items-center justify-center text-white"
      >
        <Menu className="size-6" strokeWidth={1.5} />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="theme-dark page-in fixed inset-0 z-[70] flex flex-col bg-background/97 text-foreground backdrop-blur-md"
              style={{ "--glow-base": "var(--color-foreground)" } as React.CSSProperties}
            >
              <div className="flex items-center justify-between px-6 py-5">
                <AtelierOraLogo tone="light" />
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="glow -mr-2 flex size-10 items-center justify-center text-foreground"
                >
                  <X className="size-6" strokeWidth={1.5} />
                </button>
              </div>

              <nav aria-label="Main" className="mt-4 border-t border-border px-6">
                {LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className={`glow flex w-full items-center border-b border-border py-5 text-sm font-medium uppercase tracking-[0.2em] ${
                      link.accent ? "text-gold" : "text-foreground/90"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {isAuthenticated && (
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="glow flex w-full items-center border-b border-border py-5 text-sm font-medium uppercase tracking-[0.2em] text-foreground/90"
                  >
                    Profile & Fit Settings
                  </Link>
                )}
              </nav>

              <div className="mt-8 grid gap-3 px-6">
                {isAuthenticated && user ? (
                  <>
                    <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-secondary/50 p-3">
                      <div className="flex size-9 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-xs font-semibold text-gold-ink">
                        {user.email.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="h-12 w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-border"
                      onClick={() => {
                        setOpen(false);
                        logout();
                      }}
                    >
                      <LogOut className="size-4" />
                      Log Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="h-12 w-full gap-2"
                      onClick={() => {
                        setOpen(false);
                        openLogin();
                      }}
                    >
                      <LogIn className="size-4" />
                      Log In
                    </Button>
                    <Button
                      className="h-12 w-full gap-2 bg-gold text-background hover:bg-gold/90 border border-gold"
                      onClick={() => {
                        setOpen(false);
                        openSignUp();
                      }}
                    >
                      <UserPlus className="size-4" />
                      Sign Up
                    </Button>
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
