import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AtelierOraLogo } from "@/components/AtelierOraLogo";
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
import { HeaderAuthButtons } from "@/components/HeaderAuthButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
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
  Wand2,
  Eye,
  SlidersHorizontal,
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
  return (
    <GenerateErrorBoundary>
      <GeneratePage />
    </GenerateErrorBoundary>
  );
}

function GeneratePage() {
  const { user, promptSaveGuestWardrobe } = useAuth();
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
      if (isGuestUser(activeUserId)) {
        // For unauthenticated guest users, load strictly from browser sessionStorage
        const guestItems = getGuestSessionWardrobe();
        setWardrobe(guestItems);
      } else {
        const items = getStoredWardrobeItems(activeUserId);
        setWardrobe(items);
      }
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
    <main className="min-h-screen bg-[#faf8f6] text-[#1c1917] pb-24 selection:bg-amber-100">
      {/* Top Navigation */}
      <header className="border-b border-border/70 bg-card/70 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <AtelierOraLogo />
            <span className="text-border">/</span>
            <span className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5">
              <Sparkles className="size-4 text-amber-600" />
              <span>AI Stylist</span>
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              to="/closet"
              className="nav-link inline-flex items-center gap-1.5 text-foreground/75"
            >
              <Shirt className="size-3.5 text-foreground/60" />
              <span>My Closet</span>
            </Link>
            <Link
              to="/studio"
              className="nav-link inline-flex items-center gap-1.5 text-foreground/75"
            >
              <Sparkles className="size-3.5 text-gold" />
              <span className="hidden sm:inline">Fitting Studio</span>
            </Link>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <HeaderAuthButtons />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-8 sm:pt-10 space-y-8">
        {/* Page Header */}
        <div className="space-y-2 border-b border-stone-200/80 pb-6">
          <div className="flex items-center gap-2">
            <p className="eyebrow text-amber-700 tracking-wider">AI Styling & Occasion Filtering</p>
            <Badge
              variant="outline"
              className="text-[10px] bg-amber-50/70 border-amber-200 text-amber-800 font-mono"
            >
              Auto-Remove Backgrounds
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-semibold tracking-tight text-stone-900">
            AI Stylist & Occasion Outfits
          </h1>
          <p className="text-sm text-stone-600 max-w-3xl leading-relaxed">
            Select or enter any occasion to generate complete, bespoke outfit formulas created
            exclusively from your uploaded clothing photos. All clothing backgrounds are
            automatically removed for a clean, studio-grade visual presentation.
          </p>
        </div>

        {/* Gallery / Guest Session Status Indicator Banner */}
        {isGuest ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-200/80 text-amber-900 shrink-0 border border-amber-300">
                <Sparkles className="size-5 text-amber-800" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-stone-900 text-sm">
                    Guest Mode Session Wardrobe:
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono ${
                      activeGalleryItems.length > 0
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold"
                        : "bg-amber-100 text-amber-900 border-amber-300"
                    }`}
                  >
                    {activeGalleryItems.length} in-session photo
                    {activeGalleryItems.length === 1 ? "" : "s"}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-white text-stone-700 border border-stone-200"
                  >
                    Auto-Background Removal Active
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-amber-100/80 text-amber-800 border-amber-200"
                  >
                    Temporary Browser Session
                  </Badge>
                </div>
                <p className="text-xs text-stone-600 mt-0.5">
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
                  className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs cursor-pointer shadow-xs font-medium"
                >
                  <Sparkles className="size-3.5" />
                  <span>Save My Wardrobe</span>
                </Button>
              )}
              <Button
                onClick={() => setIsAddModalOpen(true)}
                size="sm"
                className="gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs cursor-pointer shadow-xs"
              >
                <Plus className="size-3.5" />
                <span>Upload Clothing</span>
              </Button>
              {activeGalleryItems.length > 0 ? (
                <Button
                  onClick={handleClearGuestSession}
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-stone-500 hover:text-destructive hover:bg-destructive/10 text-xs cursor-pointer"
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
                  className="gap-1 text-amber-800 border-amber-300 bg-white hover:bg-amber-50 text-xs cursor-pointer"
                >
                  <Sparkles className="size-3" />
                  <span>Load Sample Items</span>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 shrink-0 border border-amber-200">
                <Shirt className="size-5 text-amber-700" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-stone-900 text-sm">
                    Your Uploaded Wardrobe Gallery:
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono ${
                      uploadedWardrobe.length > 0
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {uploadedWardrobe.length} photo{uploadedWardrobe.length === 1 ? "" : "s"}{" "}
                    uploaded
                  </Badge>
                  {uploadedWardrobe.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] bg-stone-100 text-stone-700">
                      Auto-Background Removal Enabled
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
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
                className="gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs cursor-pointer shadow-xs"
              >
                <Plus className="size-3.5" />
                <span>Upload Clothing Photo</span>
              </Button>
            </div>
          </div>
        )}

        {/* Empty Guest Session Guidance Card */}
        {isGuest && activeGalleryItems.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-6 sm:p-8 text-center space-y-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              <Sparkles className="size-6 text-amber-700" />
            </div>
            <div className="space-y-1.5 max-w-lg mx-auto">
              <h3 className="text-lg font-display font-semibold text-stone-900">
                Guest Mode: No Clothes in Active Session Yet
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                As a guest user, outfit recommendations are created exclusively from clothing photos
                uploaded during your active session. Upload your garments now to automatically
                isolate them from their background and get tailored styling for any occasion.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="gap-2 bg-stone-900 hover:bg-stone-800 text-amber-100 text-xs shadow-xs cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Upload Clothing Photo</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleSeedGuestDemo}
                className="gap-2 border-amber-300 bg-white hover:bg-amber-100/60 text-amber-900 text-xs cursor-pointer"
              >
                <Sparkles className="size-3.5 text-amber-600" />
                <span>Load 4 Demo Garments into Session</span>
              </Button>
            </div>
          </div>
        )}

        {/* Main Grid: Form Controls & Output */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-6">
              <div className="border-b border-stone-100 pb-4">
                <h2 className="text-lg font-display font-medium text-stone-900 flex items-center gap-2">
                  <Compass className="size-5 text-amber-600" />
                  <span>Occasion & Styling Criteria</span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Select or enter your occasion to filter recommendations from your uploaded
                  clothes.
                </p>
              </div>

              <form onSubmit={handleCurateOutfit} className="space-y-5">
                {/* 1. Occasion Selector & Custom Entry */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                      Select or Enter Occasion *
                    </label>
                    <span className="text-[10px] text-amber-700 font-medium">
                      Filtering Gallery
                    </span>
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
                              ? "border-amber-600 bg-amber-50/70 text-amber-950 font-medium shadow-xs"
                              : "border-stone-200 bg-stone-50/50 hover:bg-stone-100 text-stone-700"
                          }`}
                        >
                          <span className="text-base shrink-0 mt-0.5">{occ.icon}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium leading-snug truncate">{occ.label}</p>
                            <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">
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
                      <span className="text-xs font-medium text-stone-700">
                        Or Enter Custom Occasion:
                      </span>
                      {isCustomOccasion && (
                        <span className="text-[10px] text-amber-600 font-semibold">
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
                            ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30"
                            : "border-stone-300 bg-stone-50/50"
                        }`}
                      />
                      {isCustomOccasion && customOccasionInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomOccasionInput("");
                            setIsCustomOccasion(false);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 hover:text-stone-700 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Occasion Target Indicator */}
                  <div className="rounded-lg bg-amber-50/80 border border-amber-200/80 p-2.5 flex items-center justify-between text-xs text-amber-900">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-amber-600 shrink-0" />
                      <span>
                        Target: <strong>{effectiveOccasion}</strong>
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-white border-amber-300 text-amber-800"
                    >
                      {occasionMatchedItems.length} gallery piece(s) suitable
                    </Badge>
                  </div>
                </div>

                {/* 2. Time of Day (Day / Evening / Night) */}
                <div className="space-y-2 pt-2 border-t border-stone-100">
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
                    <span>Modesty & Silhouette Preference</span>
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

                {/* 6. Optional Centerpiece Garment */}
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
                    {activeGalleryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} ({item.category?.name || "Garment"})
                      </option>
                    ))}
                  </select>

                  {heroItem && (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-stone-100 border border-stone-200 text-xs">
                      <div className="size-10 rounded-md overflow-hidden bg-white border border-stone-300 shrink-0 checkerboard flex items-center justify-center">
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
                        <p className="font-medium text-stone-900 truncate">{heroItem.title}</p>
                        <p className="text-[11px] text-stone-500 truncate">
                          {heroItem.primary_color || "Color"} · {heroItem.fabric_type || "Fabric"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Exclusivity Toggle (Uploaded vs All) */}
                {uploadedWardrobe.length > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
                    <div>
                      <p className="font-medium text-emerald-900 flex items-center gap-1.5">
                        <Check className="size-3.5 text-emerald-600" />
                        <span>Use Only Uploaded Photos</span>
                      </p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Curate exclusively from your {uploadedWardrobe.length} uploaded clothing
                        photo(s)
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={useOnlyUploadedFilter}
                      onChange={(e) => setUseOnlyUploadedFilter(e.target.checked)}
                      className="size-4 rounded-sm border-emerald-400 text-emerald-600 cursor-pointer"
                    />
                  </div>
                )}

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
                      <Wand2 className="size-4 text-amber-400" />
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
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-12 text-center space-y-6">
                <div className="relative mx-auto flex size-16 items-center justify-center rounded-full bg-white shadow-xs border border-amber-200">
                  <Sparkles className="size-8 text-amber-600 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-display font-medium text-stone-900">
                    Curating Occasion Ensemble...
                  </h3>
                  <p className="text-xs text-amber-800 max-w-md mx-auto font-mono">
                    {curationStage || "Harmonizing silhouettes & removing clothing backgrounds..."}
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
                  <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Info className="size-4 text-amber-600 shrink-0" />
                      <span>{infoMessage}</span>
                    </div>
                    {isRemovingBackgrounds && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-white border-amber-300 text-amber-800 gap-1 animate-pulse"
                      >
                        <Sparkles className="size-2.5 text-amber-600" />
                        <span>Auto-cleaning backgrounds...</span>
                      </Badge>
                    )}
                  </div>
                )}

                {/* Presentation Toolbar: Option Tabs & Background Removal Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 mr-1">
                      Ensemble:
                    </span>
                    {recommendations.map((rec, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveOptionTab(idx)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          activeOptionTab === idx
                            ? "bg-stone-900 text-amber-100 shadow-sm"
                            : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
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
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                      }`}
                      title="Toggle transparent grid background"
                    >
                      <SlidersHorizontal className="size-3" />
                      <span>{showCheckerboard ? "Studio Backdrop" : "Checkerboard Canvas"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowOriginalsToggle(!showOriginalsToggle)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-stone-500 hover:text-stone-900 hover:underline cursor-pointer"
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
                    className="rounded-2xl border border-stone-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6"
                  >
                    {/* Header */}
                    <div className="space-y-2 border-b border-stone-100 pb-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-amber-100 text-amber-900 border-amber-200 text-xs">
                          {effectiveOccasion}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-stone-600">
                          {selectedTimeOfDay}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-stone-600">
                          {selectedVibe}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs border-emerald-300 bg-emerald-50/60 text-emerald-900 font-medium flex items-center gap-1"
                        >
                          <Sparkles className="size-3 text-emerald-600" />
                          <span>Backgrounds Auto-Removed</span>
                        </Badge>
                      </div>
                      <h2 className="text-2xl font-display font-semibold text-stone-900">
                        {currentOption.option_name}
                      </h2>
                      <p className="text-sm text-stone-600 italic leading-relaxed">
                        "{currentOption.style_reasoning}"
                      </p>
                    </div>

                    {/* Wardrobe Items with Background Automatically Removed */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-2">
                          <span>Curated Garment Pieces ({matchedItems.length})</span>
                          <span className="text-[10px] text-emerald-700 font-normal bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                            Clean Cutouts
                          </span>
                        </h4>
                        <span className="text-[11px] text-stone-400 font-normal">
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
                                className="group relative rounded-xl border border-stone-200 bg-white overflow-hidden hover:shadow-md transition-all flex flex-col"
                              >
                                {/* Studio Presentation Box with Auto-Removed Background */}
                                <div
                                  className={`relative aspect-square w-full overflow-hidden p-3 flex items-center justify-center transition-colors ${
                                    showCheckerboard ? "checkerboard" : "bg-[#f5f3ef]"
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
                                      className="text-[9px] bg-white/90 backdrop-blur-xs border-stone-200 text-stone-700 shadow-2xs"
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
                                    <p className="text-xs font-medium text-stone-900 truncate mt-1">
                                      {item.title}
                                    </p>
                                    <p className="text-[10px] text-stone-500 truncate">
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
                        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-xs text-stone-500">
                          Curated pieces: {currentOption.selected_item_ids.join(", ")}
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
                        <span>Styling & Proportions Directive for {effectiveOccasion}</span>
                      </h4>
                      <p className="text-xs sm:text-sm text-stone-700 leading-relaxed bg-amber-50/30 border border-amber-100 rounded-xl p-3.5">
                        {currentOption.styling_instructions}
                      </p>
                    </div>

                    {/* Hair & Makeup Inspiration Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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

                    {/* Conversion Trigger for Guests: Save My Wardrobe */}
                    {isGuest && (
                      <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50/90 to-orange-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-amber-500 text-white shrink-0 shadow-xs">
                            <Sparkles className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-stone-900">
                              Save your session wardrobe & styling formulas permanently
                            </p>
                            <p className="text-[11px] text-stone-600">
                              Sign up to transfer your temporary session clothing photos and
                              isolated cutouts into your account.
                            </p>
                          </div>
                        </div>
                        <Button
                          id="guest-save-wardrobe-outfit-btn"
                          onClick={() => promptSaveGuestWardrobe()}
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium shrink-0 cursor-pointer shadow-xs gap-1.5"
                        >
                          <Sparkles className="size-3.5" />
                          <span>Save My Wardrobe</span>
                        </Button>
                      </div>
                    )}

                    {/* Virtual Fitting Studio Link */}
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
              /* Initial State */
              <div className="rounded-2xl border border-stone-200/90 bg-white p-10 text-center space-y-5 shadow-xs">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <Sparkles className="size-7" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-xl font-display font-medium text-stone-900">
                    Occasion-Driven AI Stylist
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                    Select any occasion on the left (or type your own custom event). Atelier Ora
                    will curate tailored ensembles exclusively from your uploaded wardrobe gallery,
                    with clothing backgrounds automatically removed for a clean studio presentation.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  <Button
                    onClick={handleCurateOutfit}
                    className="gap-2 bg-stone-900 hover:bg-stone-800 text-amber-50 cursor-pointer text-xs"
                  >
                    <Wand2 className="size-3.5 text-amber-400" />
                    <span>Curate Look for {effectiveOccasion}</span>
                  </Button>
                  <Button
                    onClick={() => setIsAddModalOpen(true)}
                    variant="outline"
                    className="gap-1.5 text-xs cursor-pointer border-stone-300"
                  >
                    <Upload className="size-3.5 text-stone-600" />
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
