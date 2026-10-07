import { createFileRoute, Link } from "@tanstack/react-router";
import { AtelierOraLogo } from "@/components/AtelierOraLogo";
import { useEffect, useState } from "react";
import { ArrowRight, Ruler, ScanLine, Shirt } from "lucide-react";

import { HeaderAuthButtons } from "@/components/HeaderAuthButtons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import heroCollage1 from "@/assets/hero-collage-1.jpg";
import heroCollage2 from "@/assets/hero-collage-2.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atelier Ora" },
      {
        name: "description",
        content:
          "Digitize your Western and South Asian ethnic wardrobe, receive custom AI outfit recommendations with hair and makeup styling, and try garments on your own photo.",
      },
      { property: "og:title", content: "Atelier Ora" },
      {
        property: "og:description",
        content:
          "Private browser-based fitting room and AI stylist: curate Western & ethnic attire, generate complete outfits, and preview garments over your photo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    icon: ScanLine,
    title: "Upload a photo",
    copy: "Front-facing, full body, plain background. It stays in this browser tab.",
  },
  {
    icon: Ruler,
    title: "Read your proportions",
    copy: "Pose detection runs on your device and estimates shoulder, hip and height ratios.",
  },
  {
    icon: Shirt,
    title: "Layer the garment",
    copy: "Paste any shop link, then drag, size and rotate the item over your photo.",
  },
];

/**
 * Stacked ORA wordmark. Each letter's painted outline (not its advance width, which
 * includes uneven side bearings) is scaled to the same width so the left and right edges
 * line up, and the letters are stacked with a small even gap between them.
 *
 * Ink bounds of Bodoni Moda 900 at font-size 100, measured with canvas measureText:
 * left/right = horizontal ink extent, ascent/descent = ink above/below the baseline.
 */
const GLYPHS = [
  { letter: "O", left: 4, right: 76, ascent: 76, descent: 1 },
  { letter: "R", left: 1.5, right: 78, ascent: 75, descent: 1 },
  { letter: "A", left: 1.5, right: 81.5, ascent: 76.5, descent: 0 },
];
const WORDMARK_WIDTH = 76;
/** Gap between letters as a share of the wordmark's total height */
const WORDMARK_GAP_SHARE = 0.05;

const INK_HEIGHT = GLYPHS.reduce((sum, g) => sum + g.ascent + g.descent, 0);
const WORDMARK_GAP =
  (INK_HEIGHT * WORDMARK_GAP_SHARE) / (1 - WORDMARK_GAP_SHARE * (GLYPHS.length - 1));
const WORDMARK_LINES = GLYPHS.reduce<
  Array<(typeof GLYPHS)[number] & { baseline: number; scaleX: number }>
>((lines, glyph) => {
  const previous = lines.at(-1);
  const top = previous ? previous.baseline + previous.descent + WORDMARK_GAP : 0;
  return [
    ...lines,
    { ...glyph, baseline: top + glyph.ascent, scaleX: WORDMARK_WIDTH / (glyph.right - glyph.left) },
  ];
}, []);
const WORDMARK_HEIGHT = INK_HEIGHT + WORDMARK_GAP * (GLYPHS.length - 1);

function OraWordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${WORDMARK_WIDTH} ${WORDMARK_HEIGHT}`}
      role="img"
      aria-label="ORA"
      className={className}
    >
      {WORDMARK_LINES.map(({ letter, baseline, left, scaleX }) => (
        <text
          key={letter}
          x={0}
          y={baseline}
          transform={`translate(${-left * scaleX} 0) scale(${scaleX} 1)`}
          fill="#FFFFFF"
          fontFamily="var(--font-wordmark)"
          fontWeight={900}
          fontSize={100}
          style={{ fontVariationSettings: "'opsz' 96" }}
        >
          {letter}
        </text>
      ))}
    </svg>
  );
}

/** Landing calls to action: normal button text size, full width on phones */
const LANDING_CTA = "w-full text-[13px] tracking-[0.16em] md:w-auto";

function Landing() {
  const { isAuthenticated, requireAuth } = useAuth();

  // The header gets a dark blurred backdrop once the page is scrolled, so the nav stays
  // legible over the wordmark and photos.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleGatedNavigation = (e: React.MouseEvent, targetRoute: string) => {
    if (!isAuthenticated) {
      e.preventDefault();
      requireAuth(
        targetRoute,
        "Please log in or create an account to access the AI Stylist and digital closet.",
      );
    }
  };

  return (
    <main className="theme-cream min-h-screen bg-background text-foreground">
      {/* Full-bleed hero: two-photo collage behind the nav and headline */}
      <div
        className="relative isolate overflow-clip bg-[#1c1b1a] text-cream"
        style={{ "--glow-base": "var(--color-cream)" } as React.CSSProperties}
      >
        <div
          className="absolute inset-0 -z-20 grid animate-in fade-in duration-700 md:grid-cols-2"
          aria-hidden="true"
        >
          <img
            src={heroCollage1}
            alt=""
            width={736}
            height={920}
            fetchPriority="high"
            className="h-full w-full object-cover"
          />
          <img
            src={heroCollage2}
            alt=""
            width={1000}
            height={1250}
            className="hidden h-full w-full object-cover md:block"
          />
        </div>
        {/* Contrast overlay: darker under the nav and behind the headline block */}
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.45)_0%,rgb(0_0_0/0.15)_14%,rgb(0_0_0/0.15)_50%,rgb(0_0_0/0.72)_78%,rgb(0_0_0/0.8)_100%)]"
          aria-hidden="true"
        />
        {/* Desktop only: extra darkening on the left, behind the text block */}
        <div
          className="absolute inset-0 -z-10 hidden bg-[linear-gradient(to_right,rgb(0_0_0/0.62)_0%,rgb(0_0_0/0.4)_28%,rgb(0_0_0/0)_46%)] md:block"
          aria-hidden="true"
        />

        {/* Transparent header that stays pinned over the photos while scrolling the hero.
            Zero height so it doesn't push the centred wordmark down. */}
        <header className="theme-dark sticky top-0 z-50 h-0">
          <div
            className={`transition-[background-color,backdrop-filter] duration-300 ${
              scrolled ? "bg-black/40 backdrop-blur-[8px]" : "bg-transparent"
            }`}
          >
            <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-baseline justify-between gap-4 px-6 py-7">
              <AtelierOraLogo tone="light" />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 sm:gap-x-8">
                <Link
                  to="/closet"
                  onClick={(e) => handleGatedNavigation(e, "/closet")}
                  className="nav-link text-cream/85 cursor-pointer"
                >
                  My Closet
                </Link>
                <Link
                  to="/generate"
                  onClick={(e) => handleGatedNavigation(e, "/generate")}
                  className="nav-link text-gold cursor-pointer"
                >
                  AI Stylist
                </Link>
                <Link
                  to="/studio"
                  onClick={(e) => handleGatedNavigation(e, "/studio")}
                  className="nav-link text-cream/85 cursor-pointer"
                >
                  Fitting Studio
                </Link>
                <div className="hidden h-4 w-px bg-cream/30 sm:block" />
                <HeaderAuthButtons onDark showAccountMenu={true} />
              </div>
            </nav>
          </div>
        </header>

        {/* First screen. Desktop: wordmark centred in the first viewport over the photo seam;
            text block at the far left starting at 52% of the viewport (below the left model's
            face). Mobile: wordmark and text stacked and centred. The calls to action sit below
            the how-it-works steps. */}
        <div className="relative flex flex-col items-center gap-10 px-6 pt-28 pb-14 md:block md:min-h-[100svh] md:px-0 md:pt-[52svh] md:pb-[6svh]">
          <div className="pointer-events-none flex justify-center md:absolute md:inset-x-0 md:top-0 md:h-[100svh] md:min-h-[560px] md:items-center">
            <OraWordmark className="fade-rise h-[30vh] w-auto [animation-duration:800ms] md:h-[42vh]" />
          </div>

          <div className="fade-rise max-w-md text-center md:w-[calc(32%+3rem)] md:max-w-none md:pl-12 md:text-left lg:w-[calc(32%+4rem)] lg:pl-16">
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-cream/75">
              A fitting room in your browser
            </p>
            <h1 className="mt-5 text-4xl leading-[1.06] text-cream md:text-4xl lg:text-5xl xl:text-6xl">
              See it on you
              <br />
              before you buy.
            </h1>
            <p className="mt-6 text-base leading-relaxed text-cream/80">
              Upload one full-body photo, get an approximate read of your proportions, manage your
              Western & ethnic wardrobe, and receive bespoke AI outfit recommendations with hair and
              makeup inspiration.
            </p>
          </div>
        </div>
      </div>

      <section className="mx-auto w-full max-w-6xl px-6 pt-14 pb-20 md:pt-24">
        <p className="eyebrow">How it works</p>
        <div className="mt-10 grid gap-12 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, index) => (
            <div key={step.title}>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full ring-1 ring-silver/60">
                  <step.icon className="size-4 text-foreground/70" />
                </span>
                <span className="eyebrow">Step {String(index + 1).padStart(2, "0")}</span>
              </div>
              <h2 className="mt-5 text-2xl">{step.title}</h2>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{step.copy}</p>
            </div>
          ))}
        </div>

        {/* Calls to action, centred under the steps. Phones: stacked, full width. */}
        <div className="mt-12 flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-center md:gap-4">
          <Button
            asChild
            size="lg"
            className={cn(
              LANDING_CTA,
              "h-12 border-foreground bg-foreground px-8 text-background hover:bg-foreground/90",
            )}
          >
            <Link to="/studio" onClick={(e) => handleGatedNavigation(e, "/studio")}>
              Try it now
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className={LANDING_CTA}>
            <Link to="/generate" onClick={(e) => handleGatedNavigation(e, "/generate")}>
              AI Stylist
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className={LANDING_CTA}>
            <Link to="/closet" onClick={(e) => handleGatedNavigation(e, "/closet")}>
              Manage Closet
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
