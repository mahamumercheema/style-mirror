import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Ruler, ScanLine, Shirt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HeaderAuthButtons } from "@/components/HeaderAuthButtons";
import heroModel from "@/assets/hero-model.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Virtual Try Room — see clothes on your own photo" },
      {
        name: "description",
        content:
          "Upload a full-body photo, get approximate body proportions measured in your browser, then layer clothing from any shop link onto your photo and download the look.",
      },
      { property: "og:title", content: "Virtual Try Room — see clothes on your own photo" },
      {
        property: "og:description",
        content:
          "A private, browser-based fitting room: estimate your proportions, paste a clothing link, and try the garment on over your own photo.",
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
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-xs font-medium">
            <Link to="/studio">Open the studio</Link>
          </Button>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <HeaderAuthButtons />
        </div>
      </nav>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-2 md:py-20">
        <div>
          <p className="eyebrow">A fitting room in your browser</p>
          <h1 className="mt-5 text-5xl leading-[1.05] md:text-7xl">
            See it on you
            <br />
            before you buy.
          </h1>
          <p className="mt-6 max-w-md text-base text-muted-foreground">
            Upload one full-body photo, get an approximate read of your proportions, then place any
            garment from a shop link over your own picture. No accounts, no uploads, no AI bill.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button asChild size="lg">
              <Link to="/studio">
                Try it now
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">
              Free · runs on your device · nothing stored
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
