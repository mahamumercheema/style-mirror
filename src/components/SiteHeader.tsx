import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { AtelierOraLogo } from "@/components/AtelierOraLogo";
import { HeaderAuthButtons } from "@/components/HeaderAuthButtons";
import { MobileNav } from "@/components/MobileNav";
import { cn } from "@/lib/utils";

/**
 * Shared header for every inner page (the landing page has its own hero header).
 *
 * Option A (default): transparent on the page's grey, blurring with a hairline border
 * once scrolled. Option B (preview with ?header=b): a slightly darker grey band that
 * fades softly into the page. Both use the inner-page palette, so text stays readable.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [variant, setVariant] = useState<"a" | "b">("a");

  useEffect(() => {
    // Temporary preview switch while choosing between the two header styles
    setVariant(new URLSearchParams(window.location.search).get("header") === "b" ? "b" : "a");
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 text-foreground transition-[background-color,backdrop-filter,border-color] duration-300",
        variant === "a"
          ? scrolled
            ? "border-b border-black/15 bg-background/80 backdrop-blur-[8px]"
            : "border-b border-transparent bg-transparent"
          : cn(
              // Option B: darker shade of the page grey, softened by a short gradient below
              "border-b border-transparent after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-6 after:bg-gradient-to-b after:from-[#3e3e3e] after:to-transparent",
              scrolled ? "bg-[#3e3e3e]/90 backdrop-blur-[8px]" : "bg-[#3e3e3e]",
            ),
      )}
      style={{ "--glow-base": "var(--color-foreground)" } as React.CSSProperties}
    >
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-x-6 gap-y-3 px-6 py-4 md:flex-wrap md:items-baseline md:py-6">
        <AtelierOraLogo tone="light" />
        {/* Desktop: inline links and auth buttons. Mobile: collapsed into MobileNav. */}
        <div className="hidden md:flex md:flex-wrap md:items-center md:gap-x-8 md:gap-y-3">
          <Link to="/closet" className="nav-link text-foreground/90">
            My Closet
          </Link>
          <Link to="/generate" className="nav-link text-gold-ink">
            AI Stylist
          </Link>
          <Link to="/studio" className="nav-link text-foreground/90">
            Fitting Studio
          </Link>
          <div className="hidden h-4 w-px bg-foreground/25 sm:block" />
          <HeaderAuthButtons onDark showAccountMenu={false} />
        </div>
        <MobileNav />
      </nav>
    </header>
  );
}
