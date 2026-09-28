import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

/**
 * "Atelier Ora" brand logo: Bodoni Moda, "Atelier" regular and "Ora" bold. Links home and
 * picks up the gold hover glow. Use tone="light" over dark imagery (the landing hero).
 */
export function AtelierOraLogo({
  tone = "dark",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <Link
      to="/"
      className={cn(
        "glow shrink-0 whitespace-nowrap font-wordmark text-lg tracking-[0.15em] md:text-[22px]",
        tone === "light" ? "text-white" : "text-foreground",
        className,
      )}
    >
      <span className="font-normal">Atelier</span> <span className="font-bold">Ora</span>
    </Link>
  );
}
