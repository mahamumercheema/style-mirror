import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AtelierOraLogo } from "@/components/AtelierOraLogo";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { getStoredWardrobeItems, seedSampleWardrobe } from "@/lib/wardrobe-service";
import { matchClosetForOccasion, type ClosetMatchResult } from "@/lib/closet-matcher";
import type { WardrobeItemWithDetails } from "@/types/wardrobe";
import { HeaderAuthButtons } from "@/components/HeaderAuthButtons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowRight,
  Shirt,
  Calendar,
  Compass,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  Heart,
  Plus,
  LogIn,
  UserPlus,
  Search,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export const Route = createFileRoute("/generate")({
  head: () => ({
    meta: [
      { title: "What to Wear • Occasion Outfits from Your Closet — Atelier Ora" },
      {
        name: "description",
        content:
          "Enter your event or occasion to see matching outfit options and pieces directly from your uploaded closet.",
      },
      { property: "og:title", content: "What to Wear — Atelier Ora" },
      {
        property: "og:description",
        content:
          "Pick or enter any occasion to see coordinated outfits paired directly from your uploaded wardrobe.",
      },
    ],
  }),
  component: OccasionOutfitsPage,
});

const PRESET_OCCASIONS = [
  { id: "Wedding / Festive / Fancy", label: "Wedding & Festive", icon: "💍" },
  { id: "Dinner / Party", label: "Dinner & Party", icon: "🥂" },
  { id: "Office / Work", label: "Office & Work", icon: "💼" },
  { id: "Casual / Daily", label: "Casual & Daily", icon: "☕" },
  { id: "Formal / Gala", label: "Formal & Gala", icon: "🎪" },
  { id: "Traditional / Religious", label: "Traditional & Religious", icon: "🕌" },
];

function OccasionOutfitsPage() {
  const { user, isAuthenticated, openLogin, openSignUp } = useAuth();
  const activeUserId = user?.id || "";

  const [wardrobe, setWardrobe] = useState<WardrobeItemWithDetails[]>([]);
  const [selectedOccasion, setSelectedOccasion] = useState<string>("Wedding / Festive / Fancy");
  const [customOccasionInput, setCustomOccasionInput] = useState<string>("");
  const [heroItemId, setHeroItemId] = useState<string>("none");
  const [activeOptionTab, setActiveOptionTab] = useState<number>(0);

  // Prompt log in / sign up on mount if unauthenticated
  useEffect(() => {
    if (!isAuthenticated) {
      openSignUp(
        undefined,
        "Sign in or create an account to view outfit options from your uploaded clothes.",
      );
    }
  }, [isAuthenticated, openSignUp]);

  // Load user's private wardrobe
  const refreshWardrobe = useCallback(() => {
    if (!isAuthenticated || !activeUserId) {
      setWardrobe([]);
      return;
    }
    try {
      const items = getStoredWardrobeItems(activeUserId);
      setWardrobe(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error("Failed to load wardrobe:", err);
      setWardrobe([]);
    }
  }, [activeUserId, isAuthenticated]);

  useEffect(() => {
    refreshWardrobe();
  }, [refreshWardrobe]);

  // Active occasion determination (custom typed event takes precedence if filled)
  const currentOccasion = customOccasionInput.trim() || selectedOccasion;

  // Compute matched outfit options directly from the user's uploaded clothes
  const matchResult: ClosetMatchResult = useMemo(() => {
    return matchClosetForOccasion(
      wardrobe,
      currentOccasion,
      heroItemId !== "none" ? heroItemId : undefined,
    );
  }, [wardrobe, currentOccasion, heroItemId]);

  const activeOption = matchResult.options[activeOptionTab] || matchResult.options[0];

  const handleSelectPreset = (occId: string) => {
    setCustomOccasionInput("");
    setSelectedOccasion(occId);
    setActiveOptionTab(0);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customOccasionInput.trim()) {
      setActiveOptionTab(0);
    }
  };

  const handleSeedDefaults = () => {
    if (!isAuthenticated || !activeUserId) {
      openSignUp(undefined, "Please sign in to import sample garments.");
      return;
    }
    const seeded = seedSampleWardrobe(activeUserId);
    setWardrobe(seeded);
    toast.success("Sample garments imported to your wardrobe!");
  };

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground">
      {/* Header Bar */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-6">
            <AtelierOraLogo />
            <nav className="hidden md:flex items-center gap-5 text-xs font-medium">
              <Link
                to="/closet"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                My Closet
              </Link>
              <Link to="/generate" className="text-primary font-semibold">
                What to Wear
              </Link>
              <Link
                to="/studio"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Fitting Studio
              </Link>
              <Link
                to="/profile"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Profile
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <HeaderAuthButtons />
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-8 space-y-8">
        {/* Title Header */}
        <div className="border-b border-border pb-6 space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Calendar className="size-4" />
            </span>
            <span className="eyebrow text-primary">Occasion Outfit Matcher</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-medium text-foreground tracking-tight">
            What to Wear from Your Closet
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Enter or select any event or occasion below. We will pair together items from the
            clothes you&apos;ve uploaded to show you exactly what to wear with photos from your own
            wardrobe.
          </p>
        </div>

        {/* Unauthenticated Gate Banner */}
        {!isAuthenticated && (
          <div className="surface p-5 sm:p-6 border-primary/20 bg-card rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-sm font-semibold text-foreground flex items-center justify-center sm:justify-start gap-1.5">
                <Shirt className="size-4 text-primary" />
                <span>Sign in to access your personal closet options</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Each member has their own private wardrobe. Sign in to see options from your own
                clothes.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                size="sm"
                onClick={() =>
                  openSignUp(undefined, "Create an account to see what to wear from your clothes.")
                }
                className="gap-1.5 text-xs font-medium cursor-pointer"
              >
                <UserPlus className="size-3.5" />
                <span>Sign Up</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openLogin(undefined, "Sign in to access your closet.")}
                className="gap-1.5 text-xs font-medium cursor-pointer"
              >
                <LogIn className="size-3.5" />
                <span>Log In</span>
              </Button>
            </div>
          </div>
        )}

        {/* Occasion Selection & Input Controls */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Select or Type Your Occasion</span>
              <span className="text-[11px] text-muted-foreground/80 font-normal">
                {wardrobe.length} items in your closet
              </span>
            </label>

            {/* Quick Preset Occasion Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {PRESET_OCCASIONS.map((occ) => {
                const isSelected = !customOccasionInput && selectedOccasion === occ.id;
                return (
                  <button
                    key={occ.id}
                    type="button"
                    onClick={() => handleSelectPreset(occ.id)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    <span>{occ.icon}</span>
                    <span className="truncate">{occ.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Occasion Input Bar */}
          <form
            onSubmit={handleCustomSubmit}
            className="flex flex-col sm:flex-row items-center gap-2.5"
          >
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Or type custom event (e.g. Birthday Dinner, Beach Day, Job Interview, Eid Party)..."
                value={customOccasionInput}
                onChange={(e) => {
                  setCustomOccasionInput(e.target.value);
                  setActiveOptionTab(0);
                }}
                className="pl-9 h-11 text-xs sm:text-sm bg-background"
              />
            </div>
            {customOccasionInput && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCustomOccasionInput("")}
                className="text-xs text-muted-foreground"
              >
                Clear
              </Button>
            )}
          </form>

          {/* Optional Anchor / Centerpiece Item Filter */}
          {wardrobe.length > 0 && (
            <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground font-medium">
                Want to build the outfit around a specific item from your closet?
              </span>
              <select
                value={heroItemId}
                onChange={(e) => {
                  setHeroItemId(e.target.value);
                  setActiveOptionTab(0);
                }}
                className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary max-w-xs"
              >
                <option value="none">No centerpiece (Pair best matching pieces)</option>
                {wardrobe.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} ({item.category?.name || "Garment"})
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* Results Area */}
        {/* ========================================================================= */}
        {wardrobe.length === 0 ? (
          /* Empty Closet State */
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 sm:p-14 text-center space-y-5 shadow-xs">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Shirt className="size-8 opacity-70" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-xl font-display font-medium text-foreground">
                Your Closet is Empty
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Upload photos of your clothes in My Closet, and this page will automatically pair
                your tops, bottoms, dresses, and shoes into options to wear for {currentOccasion}.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button asChild size="default" className="gap-2 font-medium cursor-pointer">
                <Link to="/closet">
                  <Plus className="size-4" />
                  <span>Go to My Closet to Add Clothes</span>
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={handleSeedDefaults}
                className="gap-2 font-medium cursor-pointer"
              >
                <Sparkles className="size-4 text-amber-500" />
                <span>Import Starter Sample Garments</span>
              </Button>
            </div>
          </div>
        ) : matchResult.options.length > 0 ? (
          <div className="space-y-8">
            {/* Options Tabs Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
                  Outfit Options:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {matchResult.options.map((opt, idx) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setActiveOptionTab(idx)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeOptionTab === idx
                          ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                          : "bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      Option {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Showing options for:</span>
                <Badge
                  variant="outline"
                  className="font-semibold text-xs border-primary/40 text-primary"
                >
                  {currentOccasion}
                </Badge>
              </div>
            </div>

            {/* Active Curated Outfit Look Card */}
            {activeOption && (
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
                <div className="space-y-1.5 border-b border-border pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl sm:text-2xl font-display font-medium text-foreground">
                      {activeOption.name}
                    </h2>
                    <Badge variant="secondary" className="text-xs">
                      {activeOption.pieces.length} Pieces Paired
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {activeOption.stylingNote}
                  </p>
                </div>

                {/* The Uploaded Pictures of What to Wear Side-by-Side */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>What to Wear from Your Closet</span>
                    <span className="text-[11px] font-normal text-muted-foreground/80">
                      Photos from your uploaded garments
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {activeOption.pieces.map((piece, pIdx) => (
                      <div
                        key={`${piece.item.id}-${pIdx}`}
                        className="group relative flex flex-col rounded-xl border border-border bg-background overflow-hidden hover:border-primary/50 transition-all shadow-xs"
                      >
                        {/* Garment Role Badge */}
                        <div className="absolute top-2.5 left-2.5 z-10">
                          <Badge className="bg-primary/90 text-primary-foreground text-[10px] font-medium shadow-xs">
                            {piece.role}
                          </Badge>
                        </div>

                        {/* Uploaded Photo */}
                        <div className="aspect-square w-full bg-muted/40 overflow-hidden relative">
                          <img
                            src={piece.item.image_url}
                            alt={piece.item.title || "Garment photo"}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        {/* Garment Details & Action */}
                        <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                          <div className="space-y-0.5">
                            <p className="text-[11px] text-muted-foreground font-medium">
                              {piece.item.category?.name || "Garment"}
                            </p>
                            <h4 className="text-xs font-semibold text-foreground line-clamp-1">
                              {piece.item.title}
                            </h4>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {piece.item.primary_color || "Color"}
                              {piece.item.fabric_type ? ` · ${piece.item.fabric_type}` : ""}
                            </p>
                          </div>

                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="w-full mt-2 h-7 text-[11px] font-medium cursor-pointer gap-1"
                          >
                            <Link to="/studio">
                              <span>Try in Studio</span>
                              <ArrowRight className="size-3" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Bar: Action to Try on Full Look */}
                <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Want to see how this combination looks draped over your proportions?
                  </p>
                  <Button asChild size="default" className="gap-2 cursor-pointer w-full sm:w-auto">
                    <Link to="/studio">
                      <span>Open in Fitting Studio</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* All Pieces in Your Closet for this Occasion */}
            {/* ========================================================================= */}
            <section className="space-y-4 pt-4 border-t border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-display font-medium text-foreground">
                    All Garments in Your Closet
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Individual uploaded pieces you can pick or switch into for {currentOccasion}.
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs cursor-pointer"
                >
                  <Link to="/closet">
                    <Plus className="size-3.5" />
                    <span>Upload More Clothes</span>
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {matchResult.allMatchingItems.map((item) => (
                  <div
                    key={item.id}
                    className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all flex flex-col justify-between"
                  >
                    <div className="aspect-square w-full bg-muted/40 overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.title || "Garment"}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-2 space-y-0.5">
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.category?.name || "Garment"}
                      </p>
                      <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="w-full h-6 text-[10px] p-0 text-primary cursor-pointer hover:underline"
                      >
                        <Link to="/studio">Try On →</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
