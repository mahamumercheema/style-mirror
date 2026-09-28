import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AtelierOraLogo } from "@/components/AtelierOraLogo";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  getStoredWardrobeItems,
  seedSampleWardrobe,
  DEFAULT_OCCASIONS,
} from "@/lib/wardrobe-service";
import type {
  WardrobeItemWithDetails,
  RecommendOutfitResponse,
  OutfitRecommendationItem,
} from "@/types/wardrobe";
import { HeaderAuthButtons } from "@/components/HeaderAuthButtons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkles,
  ArrowRight,
  Shirt,
  Calendar,
  Compass,
  Check,
  RotateCcw,
  Layers,
  Heart,
  Plus,
  LogIn,
  UserPlus,
  Scissors,
  Palette,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export const Route = createFileRoute("/generate")({
  head: () => ({
    meta: [
      { title: "AI Stylist • Bespoke Wardrobe Recommendations — Atelier Ora" },
      {
        name: "description",
        content:
          "Generate personalized outfit formulas, styling advice, hairstyle, and makeup inspiration from your private wardrobe.",
      },
      { property: "og:title", content: "AI Stylist — Atelier Ora" },
      {
        property: "og:description",
        content:
          "AI-powered styling recommendations and hair/makeup pairings from your uploaded wardrobe.",
      },
    ],
  }),
  component: GeneratePage,
});

const TIME_OPTIONS = ["Day", "Evening", "Night"] as const;
const SEASON_OPTIONS = [
  "Spring / Summer",
  "Autumn / Winter",
  "All Season",
  "Monsoon Festive",
] as const;
const VIBE_OPTIONS = [
  "Royal Regal Glam",
  "Minimalist Modern Chic",
  "Bohemian Fusion",
  "Structured Power Dressing",
  "Romantic Soft Aesthetic",
] as const;

function GeneratePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, openLogin, openSignUp } = useAuth();
  const activeUserId = user?.id || "";

  const [wardrobe, setWardrobe] = useState<WardrobeItemWithDetails[]>([]);
  const [selectedOccasionId, setSelectedOccasionId] = useState<string>("1");
  const [customOccasion, setCustomOccasion] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("Evening");
  const [selectedSeason, setSelectedSeason] = useState<string>("All Season");
  const [selectedVibe, setSelectedVibe] = useState<string>("Royal Regal Glam");
  const [heroItemId, setHeroItemId] = useState<string>("none");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<OutfitRecommendationItem[]>([]);
  const [activeRecommendationTab, setActiveRecommendationTab] = useState<number>(0);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState<boolean>(false);

  // Prompt log in / sign up on mount if unauthenticated
  useEffect(() => {
    if (!isAuthenticated) {
      openSignUp(
        undefined,
        "Sign in or create an account to get personalized AI styling recommendations.",
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

  // Map item ID to item entity for fast lookup
  const wardrobeMap = useMemo(() => {
    const map = new Map<string, WardrobeItemWithDetails>();
    for (const item of wardrobe) {
      map.set(item.id, item);
    }
    return map;
  }, [wardrobe]);

  const occasions = DEFAULT_OCCASIONS;

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isAuthenticated || !activeUserId) {
      openSignUp(undefined, "Please sign in or create an account to generate outfit styling.");
      return;
    }

    if (wardrobe.length === 0) {
      toast.error("Your wardrobe is empty. Please add items or import starter garments first.");
      return;
    }

    setIsLoading(true);
    try {
      const selectedOccasionObj = occasions.find(
        (o) => String(o.id) === String(selectedOccasionId),
      );
      const resolvedOccasionName =
        customOccasion.trim() || selectedOccasionObj?.name || "Special Occasion";

      const res = await fetch("/api/recommend-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasionId: selectedOccasionId,
          occasionName: resolvedOccasionName,
          timeOfDay: selectedTime,
          season: selectedSeason,
          vibePreference: selectedVibe,
          heroItemId: heroItemId !== "none" ? heroItemId : undefined,
          userId: activeUserId,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed with status ${res.status}`);
      }

      const data = (await res.json()) as RecommendOutfitResponse;
      if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        setRecommendations(data.recommendations);
        setActiveRecommendationTab(0);
        setHasGeneratedOnce(true);
        toast.success("Bespoke outfits styled for you!");
      } else {
        toast.error("Unable to generate outfit recommendations. Please try different options.");
      }
    } catch (err) {
      console.error("Styling generation error:", err);
      toast.error("Could not complete styling request. Using local wardrobe fallback.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedDefaults = () => {
    if (!isAuthenticated || !activeUserId) {
      openSignUp(undefined, "Please sign in to import sample garments.");
      return;
    }
    const seeded = seedSampleWardrobe(activeUserId);
    setWardrobe(seeded);
    toast.success("Sample collection imported to your closet!");
  };

  const activeRec = recommendations[activeRecommendationTab] || recommendations[0];

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
              <Link to="/generate" className="text-primary font-semibold flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-500" />
                <span>AI Stylist</span>
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
              <Sparkles className="size-4" />
            </span>
            <span className="eyebrow text-primary">Private Styling Studio</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-medium text-foreground tracking-tight">
            AI Stylist &amp; Outfit Generator
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Select an occasion, season, time of day, and desired aesthetic vibe. Our styling
            director will curate complete outfit formulas from your uploaded wardrobe, paired with
            tailored hair and makeup inspiration.
          </p>
        </div>

        {/* Unauthenticated Gate Banner */}
        {!isAuthenticated && (
          <div className="surface p-5 sm:p-6 border-primary/20 bg-card rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-sm font-semibold text-foreground flex items-center justify-center sm:justify-start gap-1.5">
                <Shirt className="size-4 text-primary" />
                <span>Sign in to access your personal AI Stylist</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Each member has their own private wardrobe and proportions. Sign in to curate
                outfits.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                size="sm"
                onClick={() =>
                  openSignUp(undefined, "Create an account to use the AI Stylist feature.")
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

        {/* Styling Configuration Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-primary" />
                <span>Styling Parameters</span>
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {wardrobe.length} closet items
              </span>
            </div>

            <form onSubmit={handleGenerate} className="space-y-5">
              {/* Occasion */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" />
                  <span>Occasion / Event</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {occasions.map((occ) => (
                    <button
                      key={occ.id}
                      type="button"
                      onClick={() => {
                        setSelectedOccasionId(String(occ.id));
                        setCustomOccasion("");
                      }}
                      className={`px-3 py-2 rounded-lg border text-xs text-left font-medium transition-all cursor-pointer ${
                        !customOccasion && selectedOccasionId === String(occ.id)
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-background hover:bg-muted text-foreground"
                      }`}
                    >
                      <span className="truncate block">{occ.name}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <input
                    type="text"
                    placeholder="Or type custom event (e.g. Mehendi Night, Gallery Opening)..."
                    value={customOccasion}
                    onChange={(e) => setCustomOccasion(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Time of Day */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Time of Day</label>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTime(t)}
                      className={`py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                        selectedTime === t
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-background hover:bg-muted text-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Season */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Season</label>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  {SEASON_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vibe Preference */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Aesthetic Vibe</label>
                <select
                  value={selectedVibe}
                  onChange={(e) => setSelectedVibe(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  {VIBE_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Hero Centerpiece */}
              {wardrobe.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Anchor on Specific Item (Optional)</span>
                  </label>
                  <select
                    value={heroItemId}
                    onChange={(e) => setHeroItemId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="none">Auto-select anchor piece</option>
                    {wardrobe.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} ({item.category?.name || "Garment"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading || wardrobe.length === 0}
                  className="w-full h-11 gap-2 font-medium cursor-pointer text-sm shadow-xs"
                >
                  {isLoading ? (
                    <>
                      <RotateCcw className="size-4 animate-spin" />
                      <span>Curating Outfits...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4 text-amber-300" />
                      <span>Generate AI Outfits</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Output / Results Column */}
          <div className="lg:col-span-7 space-y-6">
            {wardrobe.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 sm:p-14 text-center space-y-5 shadow-xs">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <Shirt className="size-8 opacity-70" />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h2 className="text-xl font-display font-medium text-foreground">
                    Your Wardrobe is Empty
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Upload photos of your clothes in My Closet, or import our sample collection to
                    see how the AI Stylist pairs your tops, bottoms, and accessories.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button asChild size="default" className="gap-2 font-medium cursor-pointer">
                    <Link to="/closet">
                      <Plus className="size-4" />
                      <span>Add Clothes in My Closet</span>
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
                    <span>Import Sample Garments</span>
                  </Button>
                </div>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-10 sm:p-14 text-center space-y-5 shadow-xs">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Compass className="size-8" />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h2 className="text-xl font-display font-medium text-foreground">
                    Ready to Style Your Outfits
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Configure your event, time, season, and vibe preferences on the left, then click{" "}
                    <strong>Generate AI Outfits</strong> to receive bespoke formulas and beauty
                    pairings.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={isLoading}
                  className="gap-2 font-medium cursor-pointer"
                >
                  <Sparkles className="size-4" />
                  <span>Generate Now</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Option Tabs */}
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    {recommendations.map((rec, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveRecommendationTab(idx)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          activeRecommendationTab === idx
                            ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                            : "bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        Option {idx + 1}
                      </button>
                    ))}
                  </div>

                  <Badge variant="outline" className="text-xs text-primary border-primary/30">
                    {recommendations.length} Formulas Curated
                  </Badge>
                </div>

                {/* Active Outfit Card */}
                {activeRec && (
                  <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
                    <div className="space-y-2 border-b border-border pb-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xl sm:text-2xl font-display font-medium text-foreground">
                          {activeRec.option_name}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {activeRec.style_reasoning}
                      </p>
                    </div>

                    {/* Curated Garments from Closet */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Selected Closet Pieces
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {activeRec.selected_item_ids.map((id) => {
                          const item = wardrobeMap.get(id);
                          if (!item) return null;
                          return (
                            <div
                              key={item.id}
                              className="group relative rounded-xl border border-border bg-background overflow-hidden hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between"
                            >
                              <div className="aspect-square w-full bg-muted/40 overflow-hidden">
                                <img
                                  src={item.image_url}
                                  alt={item.title || "Garment"}
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              <div className="p-2.5 space-y-1">
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {item.category?.name || "Garment"}
                                </p>
                                <h5 className="text-xs font-semibold text-foreground truncate">
                                  {item.title}
                                </h5>
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="w-full mt-1.5 h-6 text-[10px] cursor-pointer"
                                >
                                  <Link to="/studio">Try In Studio</Link>
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Breakdown & Styling Directives */}
                    <div className="rounded-xl border border-border bg-background/60 p-4 space-y-3 text-xs">
                      <div className="space-y-1">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Scissors className="size-3.5 text-primary" />
                          <span>Styling Instructions</span>
                        </span>
                        <p className="text-muted-foreground leading-relaxed">
                          {activeRec.styling_instructions}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                        <div className="space-y-1">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Sparkles className="size-3 text-amber-500" />
                            <span>Hairstyle Recommendation</span>
                          </span>
                          <p className="text-muted-foreground text-[11px] leading-relaxed">
                            {activeRec.hair_style_recommendation}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Palette className="size-3 text-rose-500" />
                            <span>Makeup Inspiration</span>
                          </span>
                          <p className="text-muted-foreground text-[11px] leading-relaxed">
                            {activeRec.makeup_inspiration}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Open in Fitting Studio */}
                    <div className="pt-2 flex items-center justify-end">
                      <Button asChild size="default" className="gap-2 cursor-pointer">
                        <Link to="/studio">
                          <span>Open Look in Fitting Studio</span>
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
