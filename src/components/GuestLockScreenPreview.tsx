import React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Lock,
  Sparkles,
  Shirt,
  Wand2,
  ShieldCheck,
  ArrowRight,
  UserPlus,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface GuestLockScreenPreviewProps {
  feature?: "closet" | "stylist" | "studio" | "profile";
  className?: string;
}

const FEATURE_CONFIG = {
  closet: {
    eyebrow: "Private Digital Wardrobe",
    title: "Your Personal Digital Closet awaits",
    description:
      "Sign up or Log in to upload your clothes, mix & match outfits, and get tailored AI styling recommendations.",
    bullets: [
      "Digitize Western & ethnic garments with instant background removal",
      "Organize by occasion: Weddings, dinners, office & casual wear",
      "Private & secure: your wardrobe is exclusively visible to your account",
    ],
    ghostCards: [
      { title: "Raw Silk Shalwar Kameez", category: "Full-Body / Ethnic", occasion: "Wedding" },
      { title: "Crisp Oxford Shirt", category: "Tops", occasion: "Office" },
      { title: "Tailored Wool Trousers", category: "Bottoms", occasion: "Formal" },
      { title: "Crimson Gharara Suit", category: "Full-Body / Ethnic", occasion: "Wedding" },
      { title: "Strappy Stiletto Heels", category: "Footwear", occasion: "Dinner" },
      { title: "Kundan Pearl Jhumkas", category: "Jewelry", occasion: "Wedding" },
    ],
  },
  stylist: {
    eyebrow: "Tailored AI Styling Engine",
    title: "Your Personal AI Stylist awaits",
    description:
      "Sign up or Log in to unlock occasion-specific outfit recommendations generated exclusively from your uploaded wardrobe.",
    bullets: [
      "Smart outfit formulas curated from your own clothing pieces",
      "Complete look styling: hair, makeup, shoes & jewelry suggestions",
      "Color theory and skin undertone harmony analysis",
    ],
    ghostCards: [
      { title: "Cocktail Evening Formula", category: "AI Curation", occasion: "Dinner" },
      { title: "Festive Wedding Ensemble", category: "AI Curation", occasion: "Wedding" },
      { title: "Executive Power Suit", category: "AI Curation", occasion: "Office" },
      { title: "Minimalist Weekend Edit", category: "AI Curation", occasion: "Casual" },
      { title: "Summer Garden Reception", category: "AI Curation", occasion: "Daytime" },
      { title: "Monochrome Black Tie", category: "AI Curation", occasion: "Formal" },
    ],
  },
  studio: {
    eyebrow: "Virtual Fitting Room",
    title: "Your Virtual Fitting Studio awaits",
    description:
      "Sign up or Log in to calibrate your body proportions, preview draped garments, and try on clothes directly over your photo.",
    bullets: [
      "Private on-device pose detection and proportion estimation",
      "Interactive drape, size & layer testing over your personal photo",
      "Save and catalog virtual fittings to your private lookbook",
    ],
    ghostCards: [
      { title: "Front-Facing Calibration", category: "Body Proportions", occasion: "Fit Check" },
      { title: "Bespoke Layer Preview", category: "Virtual Drape", occasion: "Try-On" },
      { title: "Shoulder & Waist Ratios", category: "Pose Analysis", occasion: "Measurements" },
      { title: "Color Contrast Preview", category: "Studio Lighting", occasion: "Palette" },
      { title: "Ethnic Silhouette Test", category: "Full Length", occasion: "Drape" },
      { title: "Personal Lookbook Save", category: "Private Fit", occasion: "Archive" },
    ],
  },
  profile: {
    eyebrow: "Personal Style Profile",
    title: "Your Atelier Account awaits",
    description:
      "Sign up or Log in to manage your measurements, body shape preferences, and personal style settings.",
    bullets: [
      "Secure profile storage for height and body dimensions",
      "Custom occasion preferences and color season palettes",
      "Seamless synchronization across digital closet and fitting studio",
    ],
    ghostCards: [
      { title: "Height Calibration", category: "Fit Setting", occasion: "Measurements" },
      { title: "Body Type Analysis", category: "Silhouette", occasion: "Proportions" },
      { title: "Color Season Palette", category: "Aesthetics", occasion: "Palette" },
      { title: "Preferred Occasions", category: "Lifestyle", occasion: "Curation" },
      { title: "Fabric Sensitivities", category: "Preferences", occasion: "Comfort" },
      { title: "Secure Account Details", category: "Privacy", occasion: "Security" },
    ],
  },
};

export function GuestLockScreenPreview({
  feature = "closet",
  className,
}: GuestLockScreenPreviewProps) {
  const { openSignUp, openLogin } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const config = FEATURE_CONFIG[feature] || FEATURE_CONFIG.closet;

  return (
    <div
      className={cn(
        "relative min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-background py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center",
        className,
      )}
    >
      {/* Blurred Teaser Background Grid (gives user a tantalizing preview of what the active screen looks like) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 grid grid-cols-2 md:grid-cols-3 gap-4 p-6 opacity-25 filter blur-[3px] select-none"
        aria-hidden="true"
      >
        {config.ghostCards.map((card, i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-xl border border-white/10 bg-card/40 p-5 shadow-inner"
          >
            <div className="aspect-[3/4] w-full rounded-lg bg-secondary/50 mb-4 flex items-center justify-center">
              <Shirt className="size-10 text-muted-foreground/30 stroke-1" />
            </div>
            <div className="space-y-1 text-left">
              <span className="text-[10px] tracking-widest uppercase text-gold/70 font-mono">
                {card.category} · {card.occasion}
              </span>
              <p className="font-serif text-sm font-medium text-foreground/80 truncate">
                {card.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Luxury Frosted Scrim Overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-background/70 via-background/88 to-background/98 backdrop-blur-[2px]"
        aria-hidden="true"
      />

      {/* Main Lock Screen Card */}
      <div className="relative z-20 w-full max-w-xl mx-auto rounded-2xl border border-gold/30 bg-card/90 backdrop-blur-xl p-7 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] text-center animate-in fade-in zoom-in-95 duration-300">
        {/* Luxury Lock Emblem */}
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-ink shadow-sm">
          <Lock className="size-6 stroke-[1.75]" />
        </div>

        {/* Eyebrow */}
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gold-ink mb-2">
          {config.eyebrow}
        </p>

        {/* Heading */}
        <h1 className="font-serif text-2xl sm:text-3xl lg:text-[32px] font-semibold tracking-tight text-foreground leading-tight mb-3">
          {config.title}
        </h1>

        {/* Value Proposition Statement */}
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md mx-auto mb-7 font-sans">
          {config.description}
        </p>

        {/* Value Highlights List */}
        <div className="rounded-xl border border-border/80 bg-secondary/40 p-4 sm:p-5 text-left space-y-2.5 mb-8">
          {config.bullets.map((bullet, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90">
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold-ink text-[10px] font-bold">
                ✓
              </span>
              <span className="leading-snug">{bullet}</span>
            </div>
          ))}
        </div>

        {/* Primary Call-to-Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Button
            id="guest-gate-signup-btn"
            size="lg"
            onClick={() => openSignUp(undefined, undefined, pathname)}
            className="w-full sm:w-auto h-12 px-7 text-sm font-medium tracking-wide bg-gold text-background hover:bg-gold/90 border border-gold cursor-pointer shadow-sm transition-all active:scale-[0.98] gap-2"
          >
            <UserPlus className="size-4" />
            <span>Sign Up for Free</span>
          </Button>

          <Button
            id="guest-gate-login-btn"
            variant="outline"
            size="lg"
            onClick={() => openLogin(undefined, undefined, pathname)}
            className="w-full sm:w-auto h-12 px-7 text-sm font-medium tracking-wide border-border bg-background/80 hover:bg-muted text-foreground cursor-pointer shadow-xs transition-all active:scale-[0.98] gap-2"
          >
            <LogIn className="size-4" />
            <span>Log In</span>
          </Button>
        </div>

        {/* Return to Home link */}
        <div className="mt-6 pt-5 border-t border-border/60">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Return to Atelier Ora Home</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
