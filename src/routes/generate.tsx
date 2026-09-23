import React, { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  getStoredWardrobeItems,
  getOccasions,
  FASHION_SEASONS,
  getUserProfile,
} from "@/lib/wardrobe-service";
import { generateFallbackOutfitRecommendations } from "@/lib/styling-fallback";
import type {
  WardrobeItemWithDetails,
  OccasionEntity,
  OutfitRecommendationItem,
  RecommendOutfitResponse,
  UserProfile,
} from "@/types/wardrobe";
import { HeaderAuthButtons } from "@/components/HeaderAuthButtons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Shirt,
  Calendar,
  SunMedium,
  Moon,
  Wind,
  Compass,
  Check,
  RotateCcw,
  Scissors,
  Palette,
  Layers,
  Heart,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export const Route = createFileRoute("/generate")({
  head: () => ({
    meta: [
      { title: "AI Stylist & Outfit Recommendation Engine — Style Mirror" },
      {
        name: "description",
        content:
          "Custom AI-curated outfit recommendations with hairstyle, makeup, and styling guidance tailored for your events, season, and physical wardrobe collection.",
      },
      { property: "og:title", content: "AI Stylist & Outfit Generator — Style Mirror" },
      {
        property: "og:description",
        content:
          "Intelligent fashion styling assistant generating outfit formulas, hairstyle guidance, and makeup inspiration from your personal closet.",
      },
    ],
  }),
  component: GenerateRouteWrapper,
});

const VIBE_PRESETS = [
  {
    id: "Royal Regal Glam",
    label: "Royal Regal Glam",
    desc: "Opulent fabrics, intricate embroidery, and regal presence",
  },
  {
    id: "Effortless Minimalist",
    label: "Effortless Minimalist",
    desc: "Clean silhouettes, neutral palettes, quiet luxury",
  },
  {
    id: "Modern Fusion",
    label: "Modern Fusion",
    desc: "Blending Western tailoring with traditional ethnic flair",
  },
  {
    id: "Festive Glamour",
    label: "Festive Glamour",
    desc: "Vibrant jewels, celebratory shimmer, statement accessories",
  },
  {
    id: "Classic Sophistication",
    label: "Classic Sophistication",
    desc: "Timeless tailoring, sharp cuts, poised elegance",
  },
];

const TIME_OPTIONS = [
  { id: "Day", label: "Daytime", icon: SunMedium, desc: "Natural light, breathable textures" },
  {
    id: "Evening",
    label: "Evening / Twilight",
    icon: Compass,
    desc: "Golden hour and cocktail settings",
  },
  { id: "Night", label: "Night / Gala", icon: Moon, desc: "Dramatic lighting and high contrast" },
];

// Error boundary to prevent blank screen
class GenerateErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error?.message || "Unexpected styling engine error" };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto w-full max-w-5xl px-4 py-16 text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="text-xl font-display font-semibold">Styling Engine Recovery</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{this.state.error}</p>
          <Button onClick={() => this.setState({ hasError: false, error: "" })} size="sm">
            Restart Stylist
          </Button>
        </main>
      );
    }
    return this.props.children;
  }
}

function GenerateRouteWrapper() {
  return (
    <GenerateErrorBoundary>
      <GeneratePage />
    </GenerateErrorBoundary>
  );
}

function GeneratePage() {
  const { user } = useAuth();
  const activeUserId = user?.id || "guest_user";

  const [wardrobe, setWardrobe] = useState<WardrobeItemWithDetails[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [occasions, setOccasions] = useState<OccasionEntity[]>([]);

  // Form Controls
  const [selectedOccasion, setSelectedOccasion] = useState<string>("Wedding / Festive / Fancy");
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<string>("Evening");
  const [selectedSeason, setSelectedSeason] = useState<string>("All Season");
  const [selectedVibe, setSelectedVibe] = useState<string>("Royal Regal Glam");
  const [modestyFilter, setModestyFilter] = useState<string>("Modest & Loose Fit");
  const [heroItemId, setHeroItemId] = useState<string>("none");

  // Output State
  const [isCurating, setIsCurating] = useState<boolean>(false);
  const [curationStage, setCurationStage] = useState<string>("");
  const [recommendations, setRecommendations] = useState<OutfitRecommendationItem[] | null>(null);
  const [activeOptionTab, setActiveOptionTab] = useState<number>(0);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Load wardrobe, occasions, and personalized user profile
  useEffect(() => {
    try {
      const items = getStoredWardrobeItems(activeUserId);
      setWardrobe(items);
      const occ = getOccasions();
      setOccasions(occ);
      const prof = getUserProfile(activeUserId);
      setProfile(prof);

      // Phase 4: Automatically synchronize user's saved styling & modesty preferences
      if (prof.preferences?.defaultOccasion) {
        setSelectedOccasion(prof.preferences.defaultOccasion);
      }
      if (prof.preferences?.styleAesthetics?.[0]) {
        setSelectedVibe(prof.preferences.styleAesthetics[0]);
      }
      if (prof.preferences?.modestyPreference) {
        setModestyFilter(prof.preferences.modestyPreference);
      }
    } catch (err) {
      console.error("Failed to load wardrobe for styling:", err);
    }
  }, [activeUserId]);

  const heroItem = useMemo(() => {
    if (heroItemId === "none") return null;
    return wardrobe.find((i) => i.id === heroItemId) || null;
  }, [heroItemId, wardrobe]);

  // Handle Curate Outfit Submission
  const handleCurateOutfit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCurating(true);
    setRecommendations(null);
    setInfoMessage(null);

    // Simulated progress stages for luxury AI aesthetic
    setCurationStage("Analyzing your wardrobe inventory and color harmony...");
    const t1 = setTimeout(() => {
      setCurationStage(`Balancing silhouette for ${selectedOccasion} (${selectedTimeOfDay})...`);
    }, 900);
    const t2 = setTimeout(() => {
      setCurationStage("Formulating bespoke hairstyle & makeup inspiration...");
    }, 1800);

    const payload = {
      occasionName: selectedOccasion,
      timeOfDay: selectedTimeOfDay,
      season: selectedSeason,
      vibePreference: selectedVibe,
      heroItemId: heroItemId !== "none" ? heroItemId : undefined,
      modestyPreference: modestyFilter,
      userId: activeUserId,
    };

    try {
      const response = await fetch("/api/recommend-outfit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeUserId}`,
        },
        body: JSON.stringify(payload),
      });

      clearTimeout(t1);
      clearTimeout(t2);

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = (await response.json()) as RecommendOutfitResponse;
      if (data && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        setRecommendations(data.recommendations);
        setActiveOptionTab(0);
        if (data.message) {
          setInfoMessage(data.message);
        }
        toast.success("Bespoke styling recommendations curated!");
      } else {
        // Fallback to local styling director
        const fallback = generateFallbackOutfitRecommendations(wardrobe, payload, profile);
        setRecommendations(fallback.recommendations);
        setActiveOptionTab(0);
        setInfoMessage(fallback.message || "Curated using your digitized closet inventory.");
        toast.success("Bespoke styling recommendations curated!");
      }
    } catch (err) {
      clearTimeout(t1);
      clearTimeout(t2);
      console.warn("API styling unavailable, switching to local closet stylist:", err);
      const fallback = generateFallbackOutfitRecommendations(wardrobe, payload, profile);
      setRecommendations(fallback.recommendations);
      setActiveOptionTab(0);
      setInfoMessage("Curated live using your digitized closet inventory.");
      toast.success("Styling formulas curated from your wardrobe!");
    } finally {
      setIsCurating(false);
      setCurationStage("");
    }
  };

  const currentOption =
    recommendations && recommendations[activeOptionTab] ? recommendations[activeOptionTab] : null;

  // Resolve matching wardrobe items for the selected recommendation
  const matchedItems = useMemo(() => {
    if (!currentOption) return [];
    const itemMap = new Map(wardrobe.map((i) => [i.id, i]));
    return currentOption.selected_item_ids
      .map((id) => itemMap.get(id))
      .filter(Boolean) as WardrobeItemWithDetails[];
  }, [currentOption, wardrobe]);

  return (
    <main className="min-h-screen bg-[#faf8f6] text-[#1c1917] pb-24 selection:bg-amber-100">
      {/* Top Navigation */}
      <header className="border-b border-border/70 bg-card/70 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
              <span>Virtual Try Room</span>
            </Link>
            <span className="text-border">/</span>
            <span className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5">
              <Sparkles className="size-4 text-amber-600" />
              <span>AI Stylist</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button asChild variant="ghost" size="sm" className="text-xs font-medium gap-1.5">
              <Link to="/closet">
                <Shirt className="size-3.5 text-primary" />
                <span>My Closet</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-xs font-medium gap-1.5">
              <Link to="/studio">
                <Sparkles className="size-3.5 text-amber-500" />
                <span className="hidden sm:inline">Fitting Studio</span>
              </Link>
            </Button>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <HeaderAuthButtons />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-8 sm:pt-10 space-y-10">
        {/* Page Header */}
        <div className="space-y-2 border-b border-stone-200/80 pb-6">
          <div className="flex items-center gap-2">
            <p className="eyebrow text-amber-700 tracking-wider">Haute Couture AI Director</p>
            <Badge
              variant="outline"
              className="text-[10px] bg-amber-50/70 border-amber-200 text-amber-800 font-mono"
            >
              Gemini Powered
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-semibold tracking-tight text-stone-900">
            AI Stylist & Outfit Generator
          </h1>
          <p className="text-sm text-stone-600 max-w-3xl leading-relaxed">
            Let our AI fashion director harmonize Western separates and South Asian ethnic attire
            from your wardrobe. Receive complete ensemble formulas with personalized hair styling,
            makeup inspiration, and proportional advice for any occasion.
          </p>
        </div>

        {/* Phase 4: Personalized Profile Indicator Banner */}
        {profile && (
          <div className="rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/80 via-stone-50 to-orange-50/60 p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-amber-100 text-amber-800 shrink-0">
                <Sparkles className="size-4 text-amber-700" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-stone-900 text-sm">
                    Personalized for {profile.full_name || "You"}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-white border-amber-300 text-amber-900 font-medium"
                  >
                    {profile.bodyType || "Hourglass"} Silhouette
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-white border-stone-300 text-stone-700"
                  >
                    {modestyFilter}
                  </Badge>
                  {profile.height && (
                    <span className="text-[11px] text-stone-500 font-mono">
                      Height: {profile.height}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Proportions, body landmarks, and modest draping preferences automatically
                  incorporated into styling suggestions.
                </p>
              </div>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium cursor-pointer border-amber-300/80 hover:bg-amber-100/60"
            >
              <Link to="/profile">Profile & Measurements</Link>
            </Button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Step 1: Stylist Control Studio Form */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-6">
              <div className="border-b border-stone-100 pb-4">
                <h2 className="text-lg font-display font-medium text-stone-900 flex items-center gap-2">
                  <Compass className="size-5 text-amber-600" />
                  <span>Curate Your Occasion</span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Set event formality, atmosphere, and optional centerpiece garment.
                </p>
              </div>

              <form onSubmit={handleCurateOutfit} className="space-y-5">
                {/* 1. Occasion Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Target Occasion</span>
                    <span className="text-[10px] text-stone-400 font-normal">Event type</span>
                  </label>
                  <select
                    value={selectedOccasion}
                    onChange={(e) => setSelectedOccasion(e.target.value)}
                    className="w-full h-10 rounded-lg border border-stone-300 bg-stone-50/50 px-3 text-xs sm:text-sm font-medium text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                  >
                    <option value="Wedding / Festive / Fancy">
                      Wedding / Festive / Fancy (Barat, Walima, Mehendi)
                    </option>
                    <option value="Dinner / Party">Dinner / Evening Party / Date Night</option>
                    <option value="Office / Work">Office / Work / Business Casual</option>
                    <option value="Casual / Daily">Casual / Daily Outing / Brunch</option>
                    <option value="Formal">Formal / Executive Gala / High Stakes</option>
                    <option value="Traditional / Religious">Traditional / Family Festive</option>
                  </select>
                </div>

                {/* 2. Time of Day (Day / Evening / Night) */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Time of Day & Lighting
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {TIME_OPTIONS.map((t) => {
                      const Icon = t.icon;
                      const isSelected = selectedTimeOfDay === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTimeOfDay(t.id)}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                            isSelected
                              ? "border-amber-600 bg-amber-50/70 text-amber-900 font-medium shadow-xs"
                              : "border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600"
                          }`}
                        >
                          <Icon
                            className={`size-4 mb-1 ${isSelected ? "text-amber-600" : "text-stone-400"}`}
                          />
                          <span className="text-xs">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Weather Season */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Season & Climate
                  </label>
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="w-full h-10 rounded-lg border border-stone-300 bg-stone-50/50 px-3 text-xs sm:text-sm font-medium text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                  >
                    {FASHION_SEASONS.map((s) => (
                      <option key={s} value={s}>
                        {s === "All Season" ? "All Seasons (Transitional)" : `${s} Season`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Vibe Preference */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Aesthetic Vibe
                  </label>
                  <div className="space-y-1.5">
                    {VIBE_PRESETS.map((v) => {
                      const isSelected = selectedVibe === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVibe(v.id)}
                          className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "border-amber-600 bg-amber-50/60 text-stone-900 font-medium shadow-2xs"
                              : "border-stone-200/80 bg-white hover:bg-stone-50/80 text-stone-600"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-medium text-stone-800">{v.label}</p>
                            <p className="text-[11px] text-stone-500">{v.desc}</p>
                          </div>
                          {isSelected && <Check className="size-4 text-amber-600 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Modesty & Coverage Preference */}
                <div className="space-y-2 pt-1 border-t border-stone-100">
                  <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Modesty & Coverage Preference</span>
                    <span className="text-[10px] text-amber-700 font-medium">Profile Linked</span>
                  </label>
                  <select
                    value={modestyFilter}
                    onChange={(e) => setModestyFilter(e.target.value)}
                    className="w-full h-10 rounded-lg border border-stone-300 bg-stone-50/50 px-3 text-xs sm:text-sm font-medium text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                  >
                    <option value="Modest & Loose Fit">
                      Modest & Relaxed (Loose silhouettes, comfortable drape)
                    </option>
                    <option value="Full Coverage & Dupatta">
                      Full Coverage & Dupatta (High necklines, long hemlines)
                    </option>
                    <option value="Moderate">Contemporary Moderate (Balanced chic coverage)</option>
                    <option value="Standard">
                      Standard / Flexible (Contemporary designer cuts)
                    </option>
                  </select>
                </div>

                {/* 6. Optional Hero Item Picker */}
                <div className="space-y-2 pt-1 border-t border-stone-100">
                  <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Hero Item to Style Around</span>
                    <span className="text-[10px] text-stone-400 font-normal">Optional</span>
                  </label>
                  <select
                    value={heroItemId}
                    onChange={(e) => setHeroItemId(e.target.value)}
                    className="w-full h-10 rounded-lg border border-stone-300 bg-stone-50/50 px-3 text-xs font-medium text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                  >
                    <option value="none">No specific piece (Let AI choose full look)</option>
                    {wardrobe.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} ({item.category?.name || "Garment"})
                      </option>
                    ))}
                  </select>

                  {heroItem && (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-stone-100 border border-stone-200 text-xs">
                      <img
                        src={heroItem.image_url}
                        alt={heroItem.title || "Hero piece"}
                        className="size-10 rounded-md object-cover border border-stone-300 shrink-0"
                      />
                      <div className="overflow-hidden">
                        <p className="font-medium text-stone-900 truncate">{heroItem.title}</p>
                        <p className="text-[11px] text-stone-500 truncate">
                          {heroItem.primary_color || "Color"} · {heroItem.fabric_type || "Fabric"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Action Button */}
                <Button
                  type="submit"
                  disabled={isCurating}
                  size="lg"
                  className="w-full mt-4 gap-2 bg-stone-900 hover:bg-stone-800 text-amber-50 font-medium py-3 rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-70"
                >
                  {isCurating ? (
                    <>
                      <Sparkles className="size-4 animate-spin text-amber-400" />
                      <span>Styling your closet...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4 text-amber-400" />
                      <span>Generate AI Outfit Recommendations</span>
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Closet Inventory Summary Pill */}
            <div className="rounded-xl border border-stone-200/80 bg-stone-100/50 p-4 text-xs text-stone-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shirt className="size-4 text-stone-500" />
                <span>
                  Closet Inventory: <strong>{wardrobe.length} items</strong> available for AI
                  curation
                </span>
              </div>
              <Link to="/closet" className="text-amber-700 hover:underline font-medium text-[11px]">
                Add more items →
              </Link>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* Step 2: Recommendations Presentation Area */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 space-y-6">
            {isCurating ? (
              /* Loading State */
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-12 text-center space-y-6">
                <div className="relative mx-auto flex size-16 items-center justify-center rounded-full bg-white shadow-xs border border-amber-200">
                  <Sparkles className="size-8 text-amber-600 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-display font-medium text-stone-900">
                    Styling Your Closet...
                  </h3>
                  <p className="text-xs text-amber-800 max-w-md mx-auto font-mono">
                    {curationStage || "Harmonizing palettes, fabrics, and jewelry accents..."}
                  </p>
                </div>
                <div className="max-w-xs mx-auto h-1.5 bg-amber-200/60 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-600 rounded-full animate-pulse w-3/4" />
                </div>
              </div>
            ) : recommendations && recommendations.length > 0 ? (
              /* Results Cards */
              <div className="space-y-6">
                {infoMessage && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-800 flex items-center gap-2">
                    <Info className="size-4 text-amber-600 shrink-0" />
                    <span>{infoMessage}</span>
                  </div>
                )}

                {/* Option Tabs Header */}
                <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 mr-2">
                    Curation Options:
                  </span>
                  {recommendations.map((rec, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveOptionTab(idx)}
                      className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeOptionTab === idx
                          ? "bg-stone-900 text-amber-100 shadow-sm"
                          : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      {rec.option_name.split(":")[0] || `Option ${idx + 1}`}
                    </button>
                  ))}
                </div>

                {/* Active Recommendation Card */}
                {currentOption && (
                  <motion.div
                    key={activeOptionTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-2xl border border-stone-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6"
                  >
                    {/* Header */}
                    <div className="space-y-2 border-b border-stone-100 pb-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-amber-100 text-amber-900 border-amber-200 text-xs">
                          {selectedOccasion}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-stone-600">
                          {selectedTimeOfDay}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-stone-600">
                          {selectedVibe}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs border-amber-300 bg-amber-50/60 text-amber-900 font-medium"
                        >
                          {profile?.bodyType || "Hourglass"} Frame • {modestyFilter}
                        </Badge>
                      </div>
                      <h2 className="text-2xl font-display font-semibold text-stone-900">
                        {currentOption.option_name}
                      </h2>
                      <p className="text-sm text-stone-600 italic leading-relaxed">
                        "{currentOption.style_reasoning}"
                      </p>
                    </div>

                    {/* Wardrobe Items Used in This Look */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center justify-between">
                        <span>Selected Wardrobe Pieces ({matchedItems.length})</span>
                        <span className="text-[11px] text-stone-400 font-normal">
                          From your digitized closet
                        </span>
                      </h4>

                      {matchedItems.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {matchedItems.map((item) => (
                            <div
                              key={item.id}
                              className="group relative rounded-xl border border-stone-200 bg-stone-50/60 overflow-hidden hover:shadow-xs transition-all"
                            >
                              <div className="aspect-square w-full overflow-hidden bg-stone-200/50">
                                <img
                                  src={item.image_url}
                                  alt={item.title || "Garment"}
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              <div className="p-2.5 space-y-0.5">
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1.5 py-0 font-normal"
                                >
                                  {item.category?.name || "Garment"}
                                </Badge>
                                <p className="text-xs font-medium text-stone-900 truncate">
                                  {item.title}
                                </p>
                                <p className="text-[10px] text-stone-500 truncate">
                                  {item.primary_color || ""}{" "}
                                  {item.fabric_type ? `· ${item.fabric_type}` : ""}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-xs text-stone-500">
                          Curated outfit pieces: {currentOption.selected_item_ids.join(", ")}
                        </div>
                      )}
                    </div>

                    {/* Outfit Breakdown Details */}
                    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="size-4 text-amber-600" />
                        <span>Outfit Breakdown</span>
                      </h4>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="border-b sm:border-b-0 sm:border-r border-stone-200 pb-2 sm:pb-0 sm:pr-3">
                          <dt className="text-stone-400 font-medium">Top / Main Ensemble</dt>
                          <dd className="font-semibold text-stone-900 mt-0.5">
                            {currentOption.outfit_breakdown.top_or_full_body}
                          </dd>
                        </div>
                        {currentOption.outfit_breakdown.bottom && (
                          <div className="border-b sm:border-b-0 border-stone-200 pb-2 sm:pb-0">
                            <dt className="text-stone-400 font-medium">Bottom / Trousers</dt>
                            <dd className="font-semibold text-stone-900 mt-0.5">
                              {currentOption.outfit_breakdown.bottom}
                            </dd>
                          </div>
                        )}
                        <div className="border-b sm:border-b-0 sm:border-r border-stone-200 pb-2 sm:pb-0 sm:pr-3">
                          <dt className="text-stone-400 font-medium">Footwear</dt>
                          <dd className="font-semibold text-stone-900 mt-0.5">
                            {currentOption.outfit_breakdown.footwear}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-stone-400 font-medium">Jewelry & Accents</dt>
                          <dd className="font-semibold text-stone-900 mt-0.5">
                            {currentOption.outfit_breakdown.jewelry_and_accessories.join(", ") ||
                              "None"}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Step-by-Step Styling Instructions */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Compass className="size-4 text-amber-600" />
                        <span>Styling & Proportions Directive</span>
                      </h4>
                      <p className="text-xs sm:text-sm text-stone-700 leading-relaxed bg-amber-50/30 border border-amber-100 rounded-xl p-3.5">
                        {currentOption.styling_instructions}
                      </p>
                    </div>

                    {/* Hair & Makeup Inspiration Cards (Dual Column) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {/* Hairstyle */}
                      <div className="rounded-xl border border-stone-200/90 bg-white p-4 space-y-2 shadow-2xs">
                        <div className="flex items-center gap-2 text-stone-900">
                          <div className="size-7 rounded-full bg-amber-100/70 flex items-center justify-center text-amber-800">
                            <Scissors className="size-3.5" />
                          </div>
                          <h5 className="text-xs font-semibold uppercase tracking-wider">
                            Hairstyle Recommendation
                          </h5>
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          {currentOption.hair_style_recommendation}
                        </p>
                      </div>

                      {/* Makeup */}
                      <div className="rounded-xl border border-stone-200/90 bg-white p-4 space-y-2 shadow-2xs">
                        <div className="flex items-center gap-2 text-stone-900">
                          <div className="size-7 rounded-full bg-rose-100/70 flex items-center justify-center text-rose-800">
                            <Palette className="size-3.5" />
                          </div>
                          <h5 className="text-xs font-semibold uppercase tracking-wider">
                            Makeup Inspiration
                          </h5>
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          {currentOption.makeup_inspiration}
                        </p>
                      </div>
                    </div>

                    {/* Virtual Fitting Studio Jump Link */}
                    <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <p className="text-xs text-stone-500">
                        Ready to see this look placed over your body proportions?
                      </p>
                      <Button
                        asChild
                        size="default"
                        className="gap-2 bg-stone-900 hover:bg-stone-800 text-white cursor-pointer w-full sm:w-auto"
                      >
                        <Link to="/studio">
                          <span>Try on in Fitting Studio</span>
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              /* Initial Empty State */
              <div className="rounded-2xl border border-stone-200/90 bg-white p-10 text-center space-y-5 shadow-xs">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <Sparkles className="size-7" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-xl font-display font-medium text-stone-900">
                    Your Personal Digital Stylist
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                    Select an upcoming event, time of day, and desired vibe on the left. Style
                    Mirror will curate cohesive outfits using your physical wardrobe, complete with
                    hair and makeup inspiration.
                  </p>
                </div>
                <div className="pt-2 flex justify-center">
                  <Button
                    onClick={handleCurateOutfit}
                    className="gap-2 bg-stone-900 hover:bg-stone-800 text-amber-50 cursor-pointer text-xs"
                  >
                    <Sparkles className="size-3.5 text-amber-400" />
                    <span>Curate Sample Look for Tonight</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
