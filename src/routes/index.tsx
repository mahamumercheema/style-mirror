import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Ruler, ScanLine, Shirt } from "lucide-react";

import { HeaderAuthButtons } from "@/components/HeaderAuthButtons";
import heroCollage1 from "@/assets/hero-collage-1.jpg";
import heroCollage2 from "@/assets/hero-collage-2.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Virtual Try Room & AI Personal Wardrobe Stylist" },
      {
        name: "description",
        content:
          "Digitize your Western and South Asian ethnic wardrobe, receive custom AI outfit recommendations with hair and makeup styling, and try garments on your own photo.",
      },
      { property: "og:title", content: "Virtual Try Room & AI Personal Wardrobe Stylist" },
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

function Landing() {
  return (
    <main className="min-h-screen">
      {/* Full-bleed hero: two-photo collage behind the nav and headline */}
      <div
        className="relative isolate flex min-h-[92svh] flex-col overflow-hidden bg-[#1c1b1a] text-cream"
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
        {/* Contrast overlay: darker behind the text column and under the nav */}
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.45)_0%,rgb(0_0_0/0)_22%),linear-gradient(to_right,rgb(0_0_0/0.62)_0%,rgb(0_0_0/0.4)_45%,rgb(0_0_0/0.22)_100%)]"
          aria-hidden="true"
        />

        <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-7">
          <Link
            to="/"
            className="font-display text-2xl tracking-tight transition-opacity hover:opacity-80"
          >
            Virtual Try Room
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
            <div className="hidden h-4 w-px bg-cream/30 sm:block" />
            <HeaderAuthButtons onDark />
          </div>
        </nav>

        <section className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 pt-10 pb-24 md:pb-32">
          <div className="fade-rise max-w-xl">
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-cream/75">
              A fitting room in your browser
            </p>
            <h1 className="mt-7 text-5xl leading-[1.04] text-cream md:text-7xl">
              See it on you
              <br />
              before you buy.
            </h1>
            <p className="mt-8 max-w-md text-base leading-relaxed text-cream/80">
              Upload one full-body photo, get an approximate read of your proportions, manage your
              Western & ethnic wardrobe, and receive bespoke AI outfit recommendations with hair and
              makeup inspiration.
            </p>
            <div className="mt-11 flex flex-wrap items-center gap-x-10 gap-y-5">
              <Link to="/studio" className="nav-link inline-flex items-center gap-2 text-cream">
                Try it now
                <ArrowRight className="size-3.5" />
              </Link>
              <Link to="/generate" className="nav-link text-gold">
                AI Stylist
              </Link>
              <Link to="/closet" className="nav-link text-cream">
                Manage Closet
              </Link>
            </div>
          </div>
        </section>
      </div>

      <div
        className="mx-auto mt-24 flex w-full max-w-6xl items-center gap-5 px-6"
        aria-hidden="true"
      >
        <span className="h-px flex-1 bg-silver/40" />
        <span className="size-1.5 rotate-45 bg-gold" />
        <span className="h-px flex-1 bg-silver/40" />
      </div>

      <section className="mx-auto w-full max-w-6xl px-6 pt-20 pb-32">
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
