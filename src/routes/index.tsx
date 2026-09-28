import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Ruler, ScanLine, Shirt } from "lucide-react";

import { HeaderAuthButtons } from "@/components/HeaderAuthButtons";
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
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400..900&display=swap",
      },
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

function Landing() {
  const { isAuthenticated } = useAuth();

  // The header gets a dark blurred backdrop once the page is scrolled, so the nav stays
  // legible over the wordmark and photos.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen">
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
        <header className="sticky top-0 z-50 h-0">
          <div
            className={`transition-[background-color,backdrop-filter] duration-300 ${
              scrolled ? "bg-black/40 backdrop-blur-[8px]" : "bg-transparent"
            }`}
          >
            <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-baseline justify-between gap-4 px-6 py-7">
              <Link
                to="/"
                className="glow font-wordmark text-lg tracking-[0.15em] text-white md:text-[22px]"
              >
                <span className="font-normal">Atelier</span> <span className="font-bold">Ora</span>
              </Link>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 sm:gap-x-8">
                <Link to="/closet" className="nav-link text-cream/85">
                  My Closet
                </Link>
                <Link to="/generate" className="nav-link text-gold">
                  AI Stylist
                </Link>
                <Link to="/studio" className="nav-link text-cream/85">
                  Fitting Studio
                </Link>
                {/* The signed-in account pill is hidden on the landing page; the session itself
                    is untouched and the pill (with Log out) still shows on the other pages. */}
                {!isAuthenticated ? (
                  <>
                    <div className="hidden h-4 w-px bg-cream/30 sm:block" />
                    <HeaderAuthButtons onDark />
                  </>
                ) : null}
              </div>
            </nav>
          </div>
        </header>

        {/* First screen. Desktop: wordmark centred in the first viewport over the photo seam;
            text block at the far left starting at 52% of the viewport (below the left model's
            face), with the action links centred directly beneath it so they can never overlap.
            Mobile: wordmark, text, links stacked and centred. */}
        <div className="relative flex flex-col items-center gap-10 px-6 pt-28 pb-20 md:block md:min-h-[100svh] md:px-0 md:pt-[52svh] md:pb-[8svh]">
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

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5 md:mt-12 md:gap-x-11">
            <Link to="/studio" className="hero-link inline-flex items-center gap-2.5 text-cream">
              Try it now
              <ArrowRight className="size-3.5 md:size-4" />
            </Link>
            <Link to="/generate" className="hero-link text-gold">
              AI Stylist
            </Link>
            <Link to="/closet" className="hero-link text-cream">
              Manage Closet
            </Link>
          </div>
        </div>
      </div>

      <section className="mx-auto w-full max-w-6xl px-6 pt-14 pb-32 md:pt-24">
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
      </section>
    </main>
  );
}
