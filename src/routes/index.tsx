import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Ruler, ScanLine, Shirt, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HeaderAuthButtons } from "@/components/HeaderAuthButtons";
import heroModel from "@/assets/hero-model.jpg";

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
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6">
        <Link
          to="/"
          className="font-display text-xl tracking-tight hover:opacity-90 transition-opacity"
        >
          Virtual Try Room
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost" size="sm" className="text-xs font-medium">
            <Link to="/closet">My Closet</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-xs font-medium gap-1 text-amber-700"
          >
            <Link to="/generate">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>AI Stylist</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-xs font-medium">
            <Link to="/studio">Fitting Studio</Link>
          </Button>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <HeaderAuthButtons />
        </div>
      </nav>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-2 md:py-20">
        <div>
          <p className="eyebrow">A fitting room & AI stylist in your browser</p>
          <h1 className="mt-5 text-5xl leading-[1.05] md:text-7xl">
            See it on you
            <br />
            before you buy.
          </h1>
          <p className="mt-6 max-w-md text-base text-muted-foreground">
            Upload one full-body photo, get an approximate read of your proportions, manage your
            Western & ethnic wardrobe, and receive bespoke AI outfit recommendations with hair and
            makeup inspiration.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/studio">
                Try it now
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-amber-300 bg-amber-50/50 hover:bg-amber-100/60 text-amber-900"
            >
              <Link to="/generate">
                <Sparkles className="size-4 text-amber-600 mr-1.5" />
                AI Stylist
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/closet">Manage Closet</Link>
            </Button>
            <span className="text-xs text-muted-foreground w-full sm:w-auto">
              Free · runs on your device · smart curation
            </span>
          </div>
        </div>

        <div className="relative">
          <img
            src={heroModel}
            alt="Model standing front-facing in neutral linen clothing against a plain wall"
            width={1024}
            height={1280}
            className="w-full rounded-lg object-cover shadow-[var(--shadow-lift)]"
          />
          <div className="absolute bottom-5 left-5 rounded-md bg-card/90 px-4 py-3 backdrop-blur-sm">
            <p className="eyebrow">Estimated</p>
            <p className="font-display text-2xl leading-none">7.4× · Rectangle</p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid gap-6 border-t border-border pt-12 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title}>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-secondary">
                  <step.icon className="size-4 text-secondary-foreground" />
                </span>
                <span className="eyebrow">Step {String(index + 1).padStart(2, "0")}</span>
              </div>
              <h2 className="mt-4 text-2xl">{step.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{step.copy}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
