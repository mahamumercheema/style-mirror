import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

import { AtelierOraLogo } from "@/components/AtelierOraLogo";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/studio", label: "Fitting Studio" },
  { to: "/generate", label: "AI Stylist" },
  { to: "/closet", label: "My Closet" },
  { to: "/profile", label: "Profile" },
] as const;

/**
 * Slim site-wide footer, rendered once in the root layout below every page.
 * Landing page: the original dark band. Inner pages: matches the shared header —
 * Option A (default) sits on the page grey with a hairline top border; Option B
 * (preview with ?header=b) is a slightly darker grey band that fades in softly.
 */
export function SiteFooter() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [variant, setVariant] = useState<"a" | "b">("a");
  useEffect(() => {
    // Temporary preview switch while choosing between the two header/footer styles
    setVariant(new URLSearchParams(window.location.search).get("header") === "b" ? "b" : "a");
  }, [pathname]);
  const onLanding = pathname === "/";

  return (
    <footer
      className={cn(
        "relative text-foreground",
        onLanding
          ? "theme-dark border-t border-border bg-background"
          : variant === "a"
            ? "border-t border-black/15 bg-transparent"
            : "bg-[#3e3e3e] before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-6 before:bg-gradient-to-t before:from-[#3e3e3e] before:to-transparent",
      )}
      style={{ "--glow-base": "var(--color-foreground)" } as React.CSSProperties}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-6 py-5 md:flex-row md:py-6 md:justify-between md:gap-6">
        <AtelierOraLogo tone="light" className="text-base md:text-base" />

        <nav aria-label="Footer">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 md:gap-x-6">
            {LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="nav-link text-foreground/90">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Atelier Ora · Try-on by{" "}
          <a
            href="https://huggingface.co/franciszzj/Leffa"
            target="_blank"
            rel="noopener noreferrer"
            className="glow underline-offset-4 hover:underline"
          >
            Leffa
          </a>
        </p>
      </div>
    </footer>
  );
}
