import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  getStoredWardrobeItems,
  getOccasions,
  getCategories,
  saveWardrobeItem,
  FASHION_SEASONS,
  getUserProfile,
  isGuestUser,
  getGuestSessionWardrobe,
  clearGuestSessionWardrobe,
  seedGuestSessionWithDemoGarments,
} from "@/lib/wardrobe-service";
import { removeClothingBackground } from "@/lib/clothing-background-removal";
import { generateFallbackOutfitRecommendations } from "@/lib/styling-fallback";
import { AddItemModal } from "@/components/wardrobe/AddItemModal";
import type {
  WardrobeItemWithDetails,
  OccasionEntity,
  CategoryEntity,
  OutfitRecommendationItem,
  RecommendOutfitResponse,
  UserProfile,
  CreateWardrobeItemInput,
} from "@/types/wardrobe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { GuestLockScreenPreview } from "@/components/GuestLockScreenPreview";
import {
  ArrowRight,
  Sparkles,
  Shirt,
  SunMedium,
  Moon,
  Compass,
  Check,
  RotateCcw,
  Scissors,
  Palette,
  Layers,
  AlertCircle,
  Info,
  Upload,
  Plus,
  Eye,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export const Route = createFileRoute("/generate")({
  head: () => ({
    meta: [
      { title: "AI Stylist & Outfit Recommendation Engine — Atelier Ora" },
      {
        name: "description",
        content:
          "Custom AI-curated outfit recommendations with hairstyle, makeup, and styling guidance tailored for your events, season, and physical wardrobe collection.",
      },
      { property: "og:title", content: "AI Stylist & Outfit Generator — Atelier Ora" },
      {
        property: "og:description",
        content:
          "Intelligent fashion styling assistant generating outfit formulas, hairstyle guidance, and makeup inspiration from your personal closet.",
      },
    ],
  }),
  component: GenerateRouteWrapper,
});

const PRESET_OCCASIONS = [
  {
    id: "Wedding / Festive / Fancy",
    label: "Wedding / Festive",
    icon: "✨",
    desc: "Barat, Walima, Mehendi, Sangeet",
  },
  {
    id: "Dinner / Party",
    label: "Dinner & Date Night",
    icon: "🍸",
    desc: "Evening parties, fine dining, celebrations",
  },
  {
    id: "Office / Work",
    label: "Office & Work",
    icon: "💼",
    desc: "Executive business, boardroom, smart corporate",
  },
  {
    id: "Casual / Daily",
    label: "Casual & Daily",
    icon: "☀️",
    desc: "Brunch, city stroll, relaxed weekend",
  },
  {
    id: "Formal",
    label: "Formal Gala",
    icon: "🎩",
    desc: "Black tie, red carpet, high-stakes events",
  },
  {
    id: "Traditional / Religious",
    label: "Traditional & Family",
    icon: "🪷",
    desc: "Eid, family gatherings, cultural festivities",
  },
  {
    id: "Party / Night Out",
    label: "Party & Night Out",
    icon: "🎉",
    desc: "Cocktail lounge, rooftop soirées, nightlife",
  },
  {
    id: "Summer Vacation",
    label: "Resort & Vacation",
    icon: "🌴",
    desc: "Travel, beach club, sunny getaways",
  },
];

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

  override render() {
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
  const { user, isAuthenticated } = useAuth();

  // Route Guard / Auth Gate: Unauthenticated guests see the preview teaser lock screen
  if (!isAuthenticated || !user) {
    return <GuestLockScreenPreview feature="stylist" />;
  }

  return (
    <GenerateErrorBoundary>
      <GeneratePage />
    </GenerateErrorBoundary>
  );
}

function GeneratePage() {
  const { user } = useAuth();
  const activeUserId = user?.id || "guest_user";
  const isGuest = isGuestUser(activeUserId);

  const [wardrobe, setWardrobe] = useState<WardrobeItemWithDetails[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [occasions, setOccasions] = useState<OccasionEntity[]>([]);
  const [categories, setCategories] = useState<CategoryEntity[]>([]);

  // Form Controls
  const [selectedOccasion, setSelectedOccasion] = useState<string>("Wedding / Festive / Fancy");
  const [customOccasionInput, setCustomOccasionInput] = useState<string>("");
  const [isCustomOccasion, setIsCustomOccasion] = useState<boolean>(false);
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<string>("Evening");
  const [selectedSeason, setSelectedSeason] = useState<string>("All Season");
  const [selectedVibe, setSelectedVibe] = useState<string>("Royal Regal Glam");
  const [modestyFilter, setModestyFilter] = useState<string>("Modest & Loose Fit");
  const [heroItemId, setHeroItemId] = useState<string>("none");
  const [useOnlyUploadedFilter, setUseOnlyUploadedFilter] = useState<boolean>(true);

  // Modal State for uploading clothes directly in stylist
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Output State
  const [isCurating, setIsCurating] = useState<boolean>(false);
  const [curationStage, setCurationStage] = useState<string>("");
  const [recommendations, setRecommendations] = useState<OutfitRecommendationItem[] | null>(null);
  const [activeOptionTab, setActiveOptionTab] = useState<number>(0);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Background Removal State for recommended clothing display
  const [cleanedImages, setCleanedImages] = useState<Record<string, string>>({});
  const [isRemovingBackgrounds, setIsRemovingBackgrounds] = useState<boolean>(false);
  const [showCheckerboard, setShowCheckerboard] = useState<boolean>(false);
  const [showOriginalsToggle, setShowOriginalsToggle] = useState<boolean>(false);

  // Load wardrobe, occasions, and personalized user profile
  const refreshWardrobe = useCallback(() => {
    try {
      const items = getStoredWardrobeItems(activeUserId);
      setWardrobe(items || []);
      const occ = getOccasions();
      setOccasions(occ);
      const cats = getCategories();
      setCategories(cats);
      const prof = getUserProfile(activeUserId);
      setProfile(prof);

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

  useEffect(() => {
    refreshWardrobe();
  }, [refreshWardrobe]);

  // Handle explicit reset of guest session data
  const handleClearGuestSession = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Reset Guest Session?\n\nThis will clear all temporary clothing photos stored in your browser session. This action cannot be undone.",
      )
    ) {
      return;
    }
    clearGuestSessionWardrobe();
    setWardrobe([]);
    setRecommendations(null);
    toast.info("Guest session cleared.");
  };

  // Quick helper to seed demo items into guest session if user wants to test before uploading
  const handleSeedGuestDemo = () => {
    const demoItems = seedGuestSessionWithDemoGarments();
    setWardrobe(demoItems);
    toast.success("Loaded sample garments into guest session with isolated cutouts!");
  };

  // Distinguish uploaded clothing items
  const uploadedWardrobe = useMemo(() => {
    if (isGuest) {
      return wardrobe;
    }
    return wardrobe.filter((item) => item.is_uploaded || !item.id.startsWith("mock_"));
  }, [isGuest, wardrobe]);

  // Gallery items strictly used for curation:
  // Requirement: Restrict the AI Stylist to query only the array of guest-uploaded images stored in the active session
  const activeGalleryItems = useMemo(() => {
    if (isGuest) {
      return wardrobe;
    }
    if (useOnlyUploadedFilter && uploadedWardrobe.length > 0) {
      return uploadedWardrobe;
    }
    return wardrobe;
  }, [isGuest, wardrobe, useOnlyUploadedFilter, uploadedWardrobe]);

  // Current active occasion string (either selected preset or custom entered)
  const effectiveOccasion = useMemo(() => {
    if (isCustomOccasion && customOccasionInput.trim()) {
      return customOccasionInput.trim();
    }
    return selectedOccasion;
  }, [isCustomOccasion, customOccasionInput, selectedOccasion]);

  // Items from gallery matching the current occasion
  const occasionMatchedItems = useMemo(() => {
    const occQuery = effectiveOccasion.toLowerCase();
    return activeGalleryItems.filter((item) => {
      if (!item.occasions || item.occasions.length === 0) return true;
      return item.occasions.some(
        (o) => occQuery.includes(o.name.toLowerCase()) || o.name.toLowerCase().includes(occQuery),
      );
    });
  }, [activeGalleryItems, effectiveOccasion]);

  const heroItem = useMemo(() => {
    if (heroItemId === "none") return null;
    return activeGalleryItems.find((i) => i.id === heroItemId) || null;
  }, [heroItemId, activeGalleryItems]);

  // Handle Curate Outfit Submission
  const handleCurateOutfit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCurating(true);
    setRecommendations(null);
    setInfoMessage(null);

    // Dynamic curation progress messages
    setCurationStage(`Filtering your uploaded wardrobe gallery for "${effectiveOccasion}"...`);
    const t1 = setTimeout(() => {
      setCurationStage("Balancing silhouette, fabrics, and color harmony...");
    }, 800);
    const t2 = setTimeout(() => {
      setCurationStage("Automatically processing clothing photos for clean studio presentation...");
    }, 1600);

    // Always send the active user's gallery items
    const payload = {
      occasionName: effectiveOccasion,
      timeOfDay: selectedTimeOfDay,
      season: selectedSeason,
      vibePreference: selectedVibe,
      heroItemId: heroItemId !== "none" ? heroItemId : undefined,
      modestyPreference: modestyFilter,
      userId: activeUserId,
      items: activeGalleryItems,
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
      } else {
        const fallback = generateFallbackOutfitRecommendations(
          activeGalleryItems,
          payload,
          profile,
        );
        setRecommendations(fallback.recommendations);
        setActiveOptionTab(0);
        setInfoMessage(fallback.message || "Curated using your uploaded wardrobe inventory.");
      }
    } catch (err) {
      clearTimeout(t1);
      clearTimeout(t2);
      console.warn("API styling unavailable, switching to local closet stylist:", err);
      const fallback = generateFallbackOutfitRecommendations(activeGalleryItems, payload, profile);
      setRecommendations(fallback.recommendations);
      setActiveOptionTab(0);
      setInfoMessage("Curated live from your uploaded wardrobe inventory.");
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

  // Automated background removal for all matched clothing items before display
  useEffect(() => {
    if (!matchedItems.length) return;

    let isMounted = true;
    setIsRemovingBackgrounds(true);

    const processCutouts = async () => {
      const updatedMap: Record<string, string> = { ...cleanedImages };
      let anyChanged = false;

      for (const item of matchedItems) {
        if (updatedMap[item.id]) continue;

        if (item.bg_removed_url) {
          updatedMap[item.id] = item.bg_removed_url;
          anyChanged = true;
          continue;
        }

        try {
          const transparentUrl = await removeClothingBackground(item.image_url);
          updatedMap[item.id] = transparentUrl;
          anyChanged = true;
        } catch {
          updatedMap[item.id] = item.image_url;
        }
      }

      if (isMounted) {
        if (anyChanged) {
          setCleanedImages(updatedMap);
        }
        setIsRemovingBackgrounds(false);
      }
    };

    processCutouts();

    return () => {
      isMounted = false;
    };
  }, [matchedItems, cleanedImages]);

  // Handle saving new clothing item directly from the stylist page
  const handleSaveItemFromModal = (input: CreateWardrobeItemInput) => {
    const created = saveWardrobeItem(activeUserId, input);
    setWardrobe((prev) => [created, ...prev]);
    toast.success(
      `"${created.title}" added to your wardrobe with background automatically removed!`,
    );
  };

  return (
    <main className="min-h-screen text-foreground pb-24 selection:bg-gold/30">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-8 sm:pt-10 space-y-8">
        {/* Page Header */}
        <div className="space-y-2 border-b border-border pb-6">
          <div className="flex items-center gap-2">
            <p className="eyebrow text-gold-ink tracking-wider">AI Styling & Occasion Filtering</p>
            <Badge
              variant="outline"
              className="text-[10px] bg-gold/10 border-gold/30 text-gold-ink font-mono"
            >
              Auto-Remove Backgrounds
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-semibold tracking-tight text-foreground">
            AI Stylist & Occasion Outfits
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Select or enter any occasion to generate complete, bespoke outfit formulas created
            exclusively from your uploaded clothing photos. All clothing backgrounds are
            automatically removed for a clean, studio-grade visual presentation.
          </p>
        </div>

        {/* Gallery / Guest Session Status Indicator Banner */}
        {isGuest ? (
          <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gold/10 text-gold-ink shrink-0 border border-gold/30">
                <Sparkles className="size-5 text-gold-ink" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-sm">
                    Guest Mode Session Wardrobe:
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono ${
                      activeGalleryItems.length > 0
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 font-semibold"
                        : "bg-gold/10 text-gold-ink border-gold/30"
                    }`}
                  >
                    {activeGalleryItems.length} in-session photo
                    {activeGalleryItems.length === 1 ? "" : "s"}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-card text-foreground/90 border border-border"
                  >
                    Auto-Background Removal Active
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-gold/10 text-gold-ink border-gold/30"
                  >
                    Temporary Browser Session
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeGalleryItems.length > 0
                    ? `AI Stylist is querying strictly your ${activeGalleryItems.length} guest-uploaded photo(s). Backgrounds are isolated in PNG format.`
                    : "Upload your clothing photos to store them in your temporary session with backgrounds automatically removed."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {activeGalleryItems.length > 0 && (
                <Button
                  id="guest-save-wardrobe-banner-btn"
                  onClick={() => promptSaveGuestWardrobe()}
                  size="sm"
                  className="gap-1.5 text-xs cursor-pointer shadow-xs font-medium"
                >
                  <span>Save My Wardrobe</span>
                </Button>
              )}
              <Button
                onClick={() => setIsAddModalOpen(true)}
                size="sm"
                className="gap-1.5 text-xs cursor-pointer shadow-xs"
              >
                <Plus className="size-3.5" />
                <span>Upload Clothing</span>
              </Button>
              {activeGalleryItems.length > 0 ? (
                <Button
                  onClick={handleClearGuestSession}
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs cursor-pointer"
                  title="Clear all in-session temporary clothing"
                >
                  <RotateCcw className="size-3" />
                  <span>Reset Session</span>
                </Button>
              ) : (
                <Button
                  onClick={handleSeedGuestDemo}
                  size="sm"
                  variant="outline"
                  className="gap-1 text-gold-ink border-gold/30 bg-card hover:bg-gold/10 text-xs cursor-pointer"
                >
                  <span>Load Sample Items</span>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gold/10 text-gold-ink shrink-0 border border-gold/30">
                <Shirt className="size-5 text-gold-ink" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-sm">
                    Your Uploaded Wardrobe Gallery:
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono ${
                      uploadedWardrobe.length > 0
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : "bg-gold/10 text-gold-ink border-gold/30"
                    }`}
                  >
                    {uploadedWardrobe.length} photo{uploadedWardrobe.length === 1 ? "" : "s"}{" "}
                    uploaded
                  </Badge>
                  {uploadedWardrobe.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-secondary text-foreground/90"
                    >
                      Auto-Background Removal Enabled
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {uploadedWardrobe.length > 0
                    ? `Recommendations will be curated exclusively using your ${uploadedWardrobe.length} uploaded clothing photo(s).`
                    : "Upload photos of your garments to generate outfits exclusively from your own closet, with backgrounds automatically removed."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => setIsAddModalOpen(true)}
                size="sm"
                className="gap-1.5 text-xs cursor-pointer shadow-xs"
              >
                <Plus className="size-3.5" />
                <span>Upload Clothing Photo</span>
              </Button>
            </div>
          </div>
        )}

        {/* Empty Guest Session Guidance Card */}
        {isGuest && activeGalleryItems.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-gold/30 bg-gold/10 p-6 sm:p-8 text-center space-y-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gold/10 text-gold-ink border border-gold/30">
              <Sparkles className="size-6 text-gold-ink" />
            </div>
            <div className="space-y-1.5 max-w-lg mx-auto">
              <h3 className="text-lg font-display font-semibold text-foreground">
                Guest Mode: No Clothes in Active Session Yet
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As a guest user, outfit recommendations are created exclusively from clothing photos
                uploaded during your active session. Upload your garments now to automatically
                isolate them from their background and get tailored styling for any occasion.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="gap-2 text-xs shadow-xs cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Upload Clothing Photo</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleSeedGuestDemo}
                className="gap-2 border-gold/30 bg-card hover:bg-gold/10 text-gold-ink text-xs cursor-pointer"
              >
                <span>Load 4 Demo Garments into Session</span>
              </Button>
            </div>
          </div>
        )}

        {/* Main Grid: Form Controls & Output */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
              <div className="border-b border-border pb-4">
                <h2 className="text-lg font-display font-medium text-foreground flex items-center gap-2">
                  <Compass className="size-5 text-gold-ink" />
                  <span>Occasion & Styling Criteria</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select or enter your occasion to filter recommendations from your uploaded
                  clothes.
                </p>
              </div>

              <form onSubmit={handleCurateOutfit} className="space-y-5">
                {/* 1. Occasion Selector & Custom Entry */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">
                      Select or Enter Occasion *
                    </label>
                    <span className="text-[10px] text-gold-ink font-medium">Filtering Gallery</span>
                  </div>

                  {/* Preset Occasion Pills */}
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_OCCASIONS.map((occ) => {
                      const isSelected = !isCustomOccasion && selectedOccasion === occ.id;
                      return (
                        <button
                          key={occ.id}
                          type="button"
                          onClick={() => {
                            setSelectedOccasion(occ.id);
                            setIsCustomOccasion(false);
                          }}
                          className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? "border-gold bg-gold/10 text-gold-ink font-medium shadow-xs"
                              : "border-border bg-secondary hover:bg-secondary text-foreground/90"
                          }`}
                        >
                          <span className="text-base shrink-0 mt-0.5">{occ.icon}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium leading-snug truncate">{occ.label}</p>
                            <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                              {occ.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Occasion Text Input */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-foreground/90">
                        Or Enter Custom Occasion:
                      </span>
                      {isCustomOccasion && (
                        <span className="text-[10px] text-gold-ink font-semibold">
                          Active Filter
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="e.g. Summer Rooftop Party, Graduation Gala, Eid Brunch..."
                        value={customOccasionInput}
                        onChange={(e) => {
                          setCustomOccasionInput(e.target.value);
                          setIsCustomOccasion(true);
                        }}
                        onFocus={() => {
                          if (customOccasionInput.trim()) {
                            setIsCustomOccasion(true);
                          }
                        }}
                        className={`text-xs h-10 pr-20 ${
                          isCustomOccasion
                            ? "border-gold ring-2 ring-gold/20 bg-gold/10"
                            : "border-border bg-secondary"
                        }`}
                      />
                      {isCustomOccasion && customOccasionInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomOccasionInput("");
                            setIsCustomOccasion(false);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/80 hover:text-foreground cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Occasion Target Indicator */}
                  <div className="rounded-lg bg-gold/10 border border-gold/30 p-2.5 flex items-center justify-between text-xs text-gold-ink">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-gold-ink shrink-0" />
                      <span>
                        Target: <strong>{effectiveOccasion}</strong>
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-card border-gold/30 text-gold-ink"
                    >
                      {occasionMatchedItems.length} gallery piece(s) suitable
                    </Badge>
                  </div>
                </div>

                {/* 2. Time of Day (Day / Evening / Night) */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <label className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">
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
                              ? "border-gold bg-gold/10 text-gold-ink font-medium shadow-xs"
                              : "border-border bg-secondary hover:bg-secondary text-muted-foreground"
                          }`}
                        >
                          <Icon
                            className={`size-4 mb-1 ${isSelected ? "text-gold-ink" : "text-muted-foreground/80"}`}
                          />
                          <span className="text-xs">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Weather Season */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">
                    Season & Climate
                  </label>
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-secondary px-3 text-xs sm:text-sm font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-gold/40"
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
                  <label className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">
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
                              ? "border-gold bg-gold/10 text-foreground font-medium shadow-2xs"
                              : "border-border bg-card hover:bg-secondary text-muted-foreground"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-medium text-foreground">{v.label}</p>
                            <p className="text-[11px] text-muted-foreground">{v.desc}</p>
                          </div>
                          {isSelected && <Check className="size-4 text-gold-ink shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Modesty & Coverage Preference */}
                <div className="space-y-2 pt-1 border-t border-border">
                  <label className="text-xs font-semibold text-foreground/90 uppercase tracking-wider flex items-center justify-between">
                    <span>Modesty & Silhouette Preference</span>
                    <span className="text-[10px] text-gold-ink font-medium">Profile Linked</span>
                  </label>
                  <select
                    value={modestyFilter}
                    onChange={(e) => setModestyFilter(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-secondary px-3 text-xs sm:text-sm font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-gold/40"
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

                {/* 6. Optional Centerpiece Garment */}
                <div className="space-y-2 pt-1 border-t border-border">
                  <label className="text-xs font-semibold text-foreground/90 uppercase tracking-wider flex items-center justify-between">
                    <span>Hero Item to Style Around</span>
                    <span className="text-[10px] text-muted-foreground/80 font-normal">
                      Optional
                    </span>
                  </label>
                  <select
                    value={heroItemId}
                    onChange={(e) => setHeroItemId(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-secondary px-3 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-gold/40"
                  >
                    <option value="none">No specific piece (Let AI choose full look)</option>
                    {activeGalleryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} ({item.category?.name || "Garment"})
                      </option>
                    ))}
                  </select>

                  {heroItem && (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary border border-border text-xs">
                      <div className="size-10 rounded-md overflow-hidden bg-card border border-border shrink-0 checkerboard flex items-center justify-center">
                        <img
                          src={
                            cleanedImages[heroItem.id] ||
                            heroItem.bg_removed_url ||
                            heroItem.image_url
                          }
                          alt={heroItem.title || "Hero piece"}
                          className="h-full w-full object-contain drop-shadow-xs"
                        />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-medium text-foreground truncate">{heroItem.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {heroItem.primary_color || "Color"} · {heroItem.fabric_type || "Fabric"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Exclusivity Toggle (Uploaded vs All) */}
                {uploadedWardrobe.length > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10/50 p-3 text-xs">
                    <div>
                      <p className="font-medium text-emerald-300 flex items-center gap-1.5">
                        <Check className="size-3.5 text-emerald-300" />
                        <span>Use Only Uploaded Photos</span>
                      </p>
                      <p className="text-[11px] text-emerald-300 mt-0.5">
                        Curate exclusively from your {uploadedWardrobe.length} uploaded clothing
                        photo(s)
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={useOnlyUploadedFilter}
                      onChange={(e) => setUseOnlyUploadedFilter(e.target.checked)}
                      className="size-4 rounded-sm border-emerald-400 text-emerald-300 cursor-pointer"
                    />
                  </div>
                )}

                {/* Submit Action Button */}
                <Button
                  type="submit"
                  disabled={isCurating}
                  size="lg"
                  className="w-full mt-4 gap-2 font-medium py-3 rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-70"
                >
                  {isCurating ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-gold-ink" />
                      <span>Styling your closet...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate AI Outfit Recommendations</span>
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Output Presentation Area */}
          <div className="lg:col-span-7 space-y-6">
            {isCurating ? (
              /* Loading State */
              <div className="rounded-2xl border border-dashed border-gold/30 bg-gold/10 p-12 text-center space-y-6">
                <div className="relative mx-auto flex size-16 items-center justify-center rounded-full bg-card shadow-xs border border-gold/30">
                  <Sparkles className="size-8 text-gold-ink animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-display font-medium text-foreground">
                    Curating Occasion Ensemble...
                  </h3>
                  <p className="text-xs text-gold-ink max-w-md mx-auto font-mono">
                    {curationStage || "Harmonizing silhouettes & removing clothing backgrounds..."}
                  </p>
                </div>
                <div className="max-w-xs mx-auto h-1.5 bg-gold/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gold rounded-full animate-pulse w-3/4" />
                </div>
              </div>
            ) : recommendations && recommendations.length > 0 ? (
              /* Results Cards */
              <div className="space-y-6">
                {infoMessage && (
                  <div className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-2.5 text-xs text-gold-ink flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Info className="size-4 text-gold-ink shrink-0" />
                      <span>{infoMessage}</span>
                    </div>
                    {isRemovingBackgrounds && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-card border-gold/30 text-gold-ink gap-1 animate-pulse"
                      >
                        <Sparkles className="size-2.5 text-gold-ink" />
                        <span>Auto-cleaning backgrounds...</span>
                      </Badge>
                    )}
                  </div>
                )}

                {/* Presentation Toolbar: Option Tabs & Background Removal Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
                      Ensemble:
                    </span>
                    {recommendations.map((rec, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveOptionTab(idx)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          activeOptionTab === idx
                            ? "bg-gold/15 text-gold-ink shadow-sm"
                            : "bg-card text-muted-foreground border border-border hover:bg-secondary"
                        }`}
                      >
                        {rec.option_name.split(":")[0] || `Option ${idx + 1}`}
                      </button>
                    ))}
                  </div>

                  {/* Clean Visual Presentation Toggles */}
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowCheckerboard(!showCheckerboard)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                        showCheckerboard
                          ? "bg-gold/15 text-gold-ink border-gold"
                          : "bg-card text-muted-foreground border-border hover:bg-secondary"
                      }`}
                      title="Toggle transparent grid background"
                    >
                      <SlidersHorizontal className="size-3" />
                      <span>{showCheckerboard ? "Studio Backdrop" : "Checkerboard Canvas"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowOriginalsToggle(!showOriginalsToggle)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                    >
                      <Eye className="size-3" />
                      <span>{showOriginalsToggle ? "View Cutouts" : "Compare Originals"}</span>
                    </button>
                  </div>
                </div>

                {/* Active Recommendation Card */}
                {currentOption && (
                  <motion.div
                    key={activeOptionTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-xs space-y-6"
                  >
                    {/* Header */}
                    <div className="space-y-2 border-b border-border pb-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-gold/10 text-gold-ink border-gold/30 text-xs">
                          {effectiveOccasion}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {selectedTimeOfDay}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {selectedVibe}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs border-emerald-500/30 bg-emerald-500/10/60 text-emerald-300 font-medium flex items-center gap-1"
                        >
                          <Sparkles className="size-3 text-emerald-300" />
                          <span>Backgrounds Auto-Removed</span>
                        </Badge>
                      </div>
                      <h2 className="text-2xl font-display font-semibold text-foreground">
                        {currentOption.option_name}
                      </h2>
                      <p className="text-sm text-muted-foreground italic leading-relaxed">
                        "{currentOption.style_reasoning}"
                      </p>
                    </div>

                    {/* Wardrobe Items with Background Automatically Removed */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-foreground/90 uppercase tracking-wider flex items-center gap-2">
                          <span>Curated Garment Pieces ({matchedItems.length})</span>
                          <span className="text-[10px] text-emerald-300 font-normal bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                            Clean Cutouts
                          </span>
                        </h4>
                        <span className="text-[11px] text-muted-foreground/80 font-normal">
                          From your uploaded closet
                        </span>
                      </div>

                      {matchedItems.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {matchedItems.map((item) => {
                            const cleanedUrl = cleanedImages[item.id] || item.bg_removed_url;
                            const displaySrc = showOriginalsToggle
                              ? item.image_url
                              : cleanedUrl || item.image_url;

                            return (
                              <div
                                key={item.id}
                                className="group relative rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-all flex flex-col"
                              >
                                {/* Studio Presentation Box with Auto-Removed Background */}
                                <div
                                  className={`relative aspect-square w-full overflow-hidden p-3 flex items-center justify-center transition-colors ${
                                    showCheckerboard ? "checkerboard" : "bg-secondary"
                                  }`}
                                >
                                  <img
                                    src={displaySrc}
                                    alt={item.title || "Garment"}
                                    className="max-h-full max-w-full object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.14)] group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute top-2 right-2">
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] bg-card backdrop-blur-xs border-border text-foreground/90 shadow-2xs"
                                    >
                                      {showOriginalsToggle ? "Original" : "Studio Cutout"}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="p-2.5 space-y-0.5 flex-1 flex flex-col justify-between">
                                  <div>
                                    <Badge
                                      variant="secondary"
                                      className="text-[9px] px-1.5 py-0 font-normal"
                                    >
                                      {item.category?.name || "Garment"}
                                    </Badge>
                                    <p className="text-xs font-medium text-foreground truncate mt-1">
                                      {item.title}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {item.primary_color || ""}{" "}
                                      {item.fabric_type ? `· ${item.fabric_type}` : ""}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-border bg-secondary p-4 text-xs text-muted-foreground">
                          Curated pieces: {currentOption.selected_item_ids.join(", ")}
                        </div>
                      )}
                    </div>

                    {/* Outfit Breakdown Details */}
                    <div className="rounded-xl border border-border bg-secondary p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="size-4 text-gold-ink" />
                        <span>Outfit Breakdown</span>
                      </h4>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="border-b sm:border-b-0 sm:border-r border-border pb-2 sm:pb-0 sm:pr-3">
                          <dt className="text-muted-foreground/80 font-medium">
                            Top / Main Ensemble
                          </dt>
                          <dd className="font-semibold text-foreground mt-0.5">
                            {currentOption.outfit_breakdown.top_or_full_body}
                          </dd>
                        </div>
                        {currentOption.outfit_breakdown.bottom && (
                          <div className="border-b sm:border-b-0 border-border pb-2 sm:pb-0">
                            <dt className="text-muted-foreground/80 font-medium">
                              Bottom / Trousers
                            </dt>
                            <dd className="font-semibold text-foreground mt-0.5">
                              {currentOption.outfit_breakdown.bottom}
                            </dd>
                          </div>
                        )}
                        <div className="border-b sm:border-b-0 sm:border-r border-border pb-2 sm:pb-0 sm:pr-3">
                          <dt className="text-muted-foreground/80 font-medium">Footwear</dt>
                          <dd className="font-semibold text-foreground mt-0.5">
                            {currentOption.outfit_breakdown.footwear}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground/80 font-medium">
                            Jewelry & Accents
                          </dt>
                          <dd className="font-semibold text-foreground mt-0.5">
                            {currentOption.outfit_breakdown.jewelry_and_accessories.join(", ") ||
                              "None"}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Step-by-Step Styling Instructions */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-foreground/90 uppercase tracking-wider flex items-center gap-1.5">
                        <Compass className="size-4 text-gold-ink" />
                        <span>Styling & Proportions Directive for {effectiveOccasion}</span>
                      </h4>
                      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed bg-gold/10 border border-gold/20 rounded-xl p-3.5">
                        {currentOption.styling_instructions}
                      </p>
                    </div>

                    {/* Hair & Makeup Inspiration Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-2xs">
                        <div className="flex items-center gap-2 text-foreground">
                          <div className="size-7 rounded-full bg-gold/10 flex items-center justify-center text-gold-ink">
                            <Scissors className="size-3.5" />
                          </div>
                          <h5 className="text-xs font-semibold uppercase tracking-wider">
                            Hairstyle Recommendation
                          </h5>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {currentOption.hair_style_recommendation}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-2xs">
                        <div className="flex items-center gap-2 text-foreground">
                          <div className="size-7 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-300">
                            <Palette className="size-3.5" />
                          </div>
                          <h5 className="text-xs font-semibold uppercase tracking-wider">
                            Makeup Inspiration
                          </h5>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {currentOption.makeup_inspiration}
                        </p>
                      </div>
                    </div>

                    {/* Conversion Trigger for Guests: Save My Wardrobe */}
                    {isGuest && (
                      <div className="rounded-xl border border-gold/30 bg-gradient-to-r from-gold/10 to-transparent p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-gold text-primary-foreground shrink-0 shadow-xs">
                            <Sparkles className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              Save your session wardrobe & styling formulas permanently
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Sign up to transfer your temporary session clothing photos and
                              isolated cutouts into your account.
                            </p>
                          </div>
                        </div>
                        <Button
                          id="guest-save-wardrobe-outfit-btn"
                          onClick={() => promptSaveGuestWardrobe()}
                          size="sm"
                          className="text-xs font-medium shrink-0 cursor-pointer shadow-xs gap-1.5"
                        >
                          <span>Save My Wardrobe</span>
                        </Button>
                      </div>
                    )}

                    {/* Virtual Fitting Studio Link */}
                    <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        Ready to see this look placed over your body proportions?
                      </p>
                      <Button
                        asChild
                        size="default"
                        className="gap-2 cursor-pointer w-full sm:w-auto"
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
              /* Initial State */
              <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-5 shadow-xs">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-gold/10 text-gold-ink border border-gold/30">
                  <Sparkles className="size-7" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-xl font-display font-medium text-foreground">
                    Occasion-Driven AI Stylist
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Select any occasion on the left (or type your own custom event). Atelier Ora
                    will curate tailored ensembles exclusively from your uploaded wardrobe gallery,
                    with clothing backgrounds automatically removed for a clean studio presentation.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  <Button onClick={handleCurateOutfit} className="gap-2 cursor-pointer text-xs">
                    <span>Curate Look for {effectiveOccasion}</span>
                  </Button>
                  <Button
                    onClick={() => setIsAddModalOpen(true)}
                    variant="outline"
                    className="gap-1.5 text-xs cursor-pointer border-border"
                  >
                    <Upload className="size-3.5 text-muted-foreground" />
                    <span>Upload Clothing Photo</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveItemFromModal}
        categories={categories}
        occasions={occasions}
      />
    </main>
  );
}
