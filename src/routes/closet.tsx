import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  getCategories,
  getOccasions,
  getStoredWardrobeItems,
  saveWardrobeItem,
  updateWardrobeItem,
  deleteWardrobeItem,
  toggleFavoriteWardrobeItem,
  seedSampleWardrobe,
  MOCK_WARDROBE_ITEMS,
  PARENT_CATEGORY_GROUPS,
  FASHION_SEASONS,
} from "@/lib/wardrobe-service";
import type {
  WardrobeItemWithDetails,
  CreateWardrobeItemInput,
  UpdateWardrobeItemInput,
  CategoryEntity,
  OccasionEntity,
} from "@/types/wardrobe";
import { WardrobeItemCard } from "@/components/wardrobe/WardrobeItemCard";
import { AddItemModal } from "@/components/wardrobe/AddItemModal";
import { EditItemModal } from "@/components/wardrobe/EditItemModal";
import { HeaderAuthButtons } from "@/components/HeaderAuthButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  ArrowRight,
  Filter,
  Heart,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Shirt,
  Sparkles,
  Layers,
  User,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/closet")({
  head: () => ({
    meta: [
      { title: "My Wardrobe & Closet — Virtual Try Room" },
      {
        name: "description",
        content:
          "Manage your personal digital wardrobe. Organize Western and traditional ethnic attire, categorize items by occasion, and curate your wardrobe for virtual try-on.",
      },
      { property: "og:title", content: "My Wardrobe & Closet — Virtual Try Room" },
      {
        property: "og:description",
        content:
          "Digital closet and wardrobe management engine for smart AI outfit curation and virtual fitting.",
      },
    ],
  }),
  component: ClosetRouteWrapper,
});

// ============================================================================
// Error Boundary to prevent "This page didn't load" crash
// ============================================================================
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ClosetErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || "An unexpected error occurred." };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ClosetErrorBoundary caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-12">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="size-6" />
            </div>
            <h2 className="text-xl font-display font-semibold">Wardrobe Engine Recovery</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              We encountered a temporary rendering issue. Your wardrobe has been safely preserved
              with offline mock data.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button onClick={this.handleReset} size="sm" className="cursor-pointer">
                Reload Wardrobe View
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/studio">Go to Fitting Studio</Link>
              </Button>
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

function ClosetRouteWrapper() {
  return (
    <ClosetErrorBoundary>
      <ClosetPage />
    </ClosetErrorBoundary>
  );
}

// Category tabs explicitly requested
const CATEGORY_TABS = [
  "All",
  "Tops",
  "Bottoms",
  "Full-Body / Ethnic",
  "Footwear",
  "Jewelry & Accessories",
];

// Occasion tags explicitly requested
const OCCASION_TAGS = ["Office", "Casual", "Dinner", "Wedding"];

function ClosetPage() {
  const { user } = useAuth();
  const activeUserId = user?.id || "guest_user";

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<WardrobeItemWithDetails[]>(MOCK_WARDROBE_ITEMS);

  // Filters State
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("All");
  const [selectedOccasionTag, setSelectedOccasionTag] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>("All Season");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WardrobeItemWithDetails | null>(null);

  // Categories & Occasions definition
  const allCategories: CategoryEntity[] = useMemo(() => {
    try {
      return getCategories();
    } catch {
      return [];
    }
  }, []);

  const allOccasions: OccasionEntity[] = useMemo(() => {
    try {
      return getOccasions();
    } catch {
      return [];
    }
  }, []);

  // Safe load of items
  const refreshItems = useCallback(() => {
    try {
      const loaded = getStoredWardrobeItems(activeUserId);
      if (Array.isArray(loaded) && loaded.length > 0) {
        setItems(loaded);
      } else {
        setItems(MOCK_WARDROBE_ITEMS);
      }
    } catch (err) {
      console.warn("Falling back to mock wardrobe items:", err);
      setItems(MOCK_WARDROBE_ITEMS);
    } finally {
      setIsLoading(false);
    }
  }, [activeUserId]);

  useEffect(() => {
    refreshItems();
  }, [refreshItems]);

  // Safe filtering of items
  const filteredItems = useMemo(() => {
    try {
      return items.filter((item) => {
        // 1. Category Tab Filter
        if (selectedCategoryTab !== "All") {
          const itemParent = item.category?.parent_type;
          if (selectedCategoryTab === "Full-Body / Ethnic") {
            if (itemParent !== "Full-Body / Ethnic" && itemParent !== "Full Body / Ethnic Set") {
              return false;
            }
          } else if (selectedCategoryTab === "Jewelry & Accessories") {
            if (itemParent !== "Jewelry & Accessories" && itemParent !== "Accessories") {
              return false;
            }
          } else {
            if (itemParent !== selectedCategoryTab) {
              return false;
            }
          }
        }

        // 2. Occasion Filter
        if (selectedOccasionTag !== null) {
          const hasOccasion = item.occasions?.some((o) =>
            o.name?.toLowerCase().includes(selectedOccasionTag.toLowerCase()),
          );
          if (!hasOccasion) return false;
        }

        // 3. Season Filter
        if (selectedSeason !== "All Season") {
          if (item.season && item.season !== selectedSeason && item.season !== "All Season") {
            return false;
          }
        }

        // 4. Favorites Filter
        if (showFavoritesOnly && !item.is_favorite) {
          return false;
        }

        // 5. Search Filter
        if (searchQuery.trim().length > 0) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = item.title?.toLowerCase().includes(q);
          const matchColor =
            item.primary_color?.toLowerCase().includes(q) ||
            item.secondary_color?.toLowerCase().includes(q);
          const matchFabric = item.fabric_type?.toLowerCase().includes(q);
          const matchCat = item.category?.name?.toLowerCase().includes(q);
          const matchOcc = item.occasions?.some((o) => o?.name?.toLowerCase().includes(q));

          if (!matchTitle && !matchColor && !matchFabric && !matchCat && !matchOcc) {
            return false;
          }
        }

        return true;
      });
    } catch (err) {
      console.error("Filter calculation error:", err);
      return items;
    }
  }, [
    items,
    selectedCategoryTab,
    selectedOccasionTag,
    selectedSeason,
    showFavoritesOnly,
    searchQuery,
  ]);

  // Actions
  const handleToggleFavorite = (itemId: string) => {
    try {
      const newFavState = toggleFavoriteWardrobeItem(activeUserId, itemId);
      setItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, is_favorite: newFavState } : it)),
      );
      toast.success(newFavState ? "Added to favorites ❤️" : "Removed from favorites");
    } catch {
      setItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, is_favorite: !it.is_favorite } : it)),
      );
    }
  };

  const handleSaveNewItem = (input: CreateWardrobeItemInput) => {
    try {
      const created = saveWardrobeItem(activeUserId, input);
      setItems((prev) => [created, ...prev]);
      toast.success(`"${created.title}" added to your wardrobe!`);
    } catch (err) {
      console.error("Save item error:", err);
      toast.error("Could not save item.");
    }
  };

  const handleUpdateItem = (itemId: string, updates: UpdateWardrobeItemInput) => {
    try {
      const updated = updateWardrobeItem(activeUserId, itemId, updates);
      if (updated) {
        setItems((prev) => prev.map((it) => (it.id === itemId ? updated : it)));
        toast.success("Wardrobe item updated!");
      }
    } catch (err) {
      console.error("Update item error:", err);
      toast.error("Could not update item.");
    }
  };

  const handleDeleteItem = (itemId: string) => {
    try {
      deleteWardrobeItem(activeUserId, itemId);
      setItems((prev) => prev.filter((it) => it.id !== itemId));
      toast.success("Item removed from wardrobe");
    } catch (err) {
      console.error("Delete item error:", err);
      setItems((prev) => prev.filter((it) => it.id !== itemId));
    }
  };

  const handleResetFilters = () => {
    setSelectedCategoryTab("All");
    setSelectedOccasionTag(null);
    setSelectedSeason("All Season");
    setShowFavoritesOnly(false);
    setSearchQuery("");
  };

  const handleSeedDefaults = () => {
    const seeded = seedSampleWardrobe(activeUserId);
    setItems(seeded);
    toast.success("Sample wardrobe restored with Western & traditional ethnic pieces!");
  };

  const favoriteCount = items.filter((i) => i.is_favorite).length;

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Top Navigation */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-20">
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
              <Shirt className="size-4 text-primary" />
              <span>My Wardrobe</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button asChild variant="ghost" size="sm" className="text-xs font-medium gap-1.5">
              <Link to="/generate">
                <Sparkles className="size-3.5 text-amber-600" />
                <span>AI Stylist</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-xs font-medium gap-1.5">
              <Link to="/studio">
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Fitting Studio</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-xs font-medium gap-1.5">
              <Link to="/profile">
                <User className="size-3.5" />
                <span className="hidden sm:inline">Fit Settings</span>
              </Link>
            </Button>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <HeaderAuthButtons />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-8 sm:pt-10 space-y-8">
        {/* ========================================================================= */}
        {/* 1. Top Header: Page Title "My Wardrobe" & "Add New Item" Button */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <p className="eyebrow text-primary">Smart Outfit Engine</p>
              <Badge variant="outline" className="text-[10px] bg-secondary/80 font-mono">
                Phase 2 Engine
              </Badge>
            </div>
            <h1 className="mt-1 text-3xl sm:text-4xl md:text-5xl font-display font-semibold tracking-tight text-foreground">
              My Wardrobe
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              Curate your personal collection of Western attire, traditional ethnic wear (Shalwar
              Kameez, Gharara, Frocks), footwear, and jewelry for real-time virtual try-on.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <Button
              asChild
              variant="outline"
              size="default"
              className="gap-2 font-medium border-amber-300 bg-amber-50/50 hover:bg-amber-100/60 text-amber-900 cursor-pointer"
            >
              <Link to="/generate">
                <Sparkles className="size-4 text-amber-600" />
                <span>AI Stylist</span>
              </Link>
            </Button>
            <Button
              id="add-new-item-header-btn"
              onClick={() => setIsAddModalOpen(true)}
              size="default"
              className="gap-2 font-medium shadow-sm cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" />
              <span>Add New Item</span>
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. Category & Occasion Navigation Filter Bar */}
        {/* ========================================================================= */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
          {/* Search, Season, Favorites Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, fabric, color, or style..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm bg-background"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Season Selector */}
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-ring"
                aria-label="Filter by season"
              >
                {FASHION_SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "All Season" ? "All Seasons" : `${s} Season`}
                  </option>
                ))}
              </select>

              {/* Favorites Toggle */}
              <Button
                type="button"
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`h-9 gap-1.5 text-xs font-medium cursor-pointer transition-all ${
                  showFavoritesOnly
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart
                  className={`size-3.5 ${showFavoritesOnly ? "fill-white text-white" : "text-rose-500"}`}
                />
                <span>Favorites ({favoriteCount})</span>
              </Button>

              {/* Reset Filters */}
              {(selectedCategoryTab !== "All" ||
                selectedOccasionTag !== null ||
                selectedSeason !== "All Season" ||
                showFavoritesOnly ||
                searchQuery.trim().length > 0) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <RotateCcw className="size-3" />
                  <span>Reset</span>
                </Button>
              )}
            </div>
          </div>

          {/* Category Tabs: Scrollable or Tabbed Filters */}
          <div className="space-y-2 border-t border-border/60 pt-3">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-[11px] text-muted-foreground">Category Tabs</span>
              <span className="text-[11px] text-muted-foreground">
                Showing <strong className="text-foreground">{filteredItems.length}</strong> of{" "}
                {items.length} items
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORY_TABS.map((tab) => {
                const isSelected = selectedCategoryTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedCategoryTab(tab)}
                    className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "bg-secondary/60 text-secondary-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Occasion Filters: Multi-Select / Tag Bar */}
          <div className="space-y-2 border-t border-border/60 pt-3">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-[11px] text-muted-foreground">Occasion Filters</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedOccasionTag(null)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs transition-all cursor-pointer ${
                  selectedOccasionTag === null
                    ? "bg-primary/90 text-primary-foreground font-medium"
                    : "border border-border/80 bg-background text-muted-foreground hover:text-foreground hover:border-foreground/40"
                }`}
              >
                All Occasions
              </button>
              {OCCASION_TAGS.map((tag) => {
                const isSelected = selectedOccasionTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedOccasionTag(isSelected ? null : tag)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-medium shadow-xs"
                        : "border border-border/80 bg-background text-muted-foreground hover:text-foreground hover:border-foreground/40"
                    }`}
                  >
                    {tag === "Wedding" && <Sparkles className="size-3 text-amber-500" />}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. Wardrobe Grid View (Resilient with Loading & Fallbacks) */}
        {/* ========================================================================= */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading your digital wardrobe...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5">
            {filteredItems.map((item) => (
              <WardrobeItemCard
                key={item.id}
                item={item}
                onToggleFavorite={handleToggleFavorite}
                onEdit={setEditingItem}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Shirt className="size-7 opacity-60" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-display font-medium text-foreground">
                No garments found in this view
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Try clearing your filters, or click "Add New Item" to add your favorite clothes,
                shoes, or jewelry.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                onClick={handleResetFilters}
                variant="outline"
                size="sm"
                className="gap-1.5 cursor-pointer text-xs"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset Filters</span>
              </Button>
              <Button
                onClick={handleSeedDefaults}
                variant="outline"
                size="sm"
                className="gap-1.5 cursor-pointer text-xs"
              >
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Restore Sample Outfits</span>
              </Button>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                size="sm"
                className="gap-1.5 cursor-pointer text-xs"
              >
                <Plus className="size-3.5" />
                <span>Add Item</span>
              </Button>
            </div>
          </div>
        )}

        {/* Direct Link to Fitting Studio Banner */}
        <section className="rounded-xl border border-border bg-gradient-to-r from-card via-secondary/20 to-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-display font-medium text-foreground flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="size-4 text-amber-500" />
              <span>Ready for Virtual Fitting?</span>
            </h3>
            <p className="text-xs text-muted-foreground max-w-xl">
              Take any item from your closet directly into our TensorFlow MoveNet studio to try it
              on over your full-body photo.
            </p>
          </div>
          <Button asChild size="default" className="gap-2 shrink-0 cursor-pointer">
            <Link to="/studio">
              <span>Open Fitting Room</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 4. Functional Upload Modal (Add New Item) */}
      {/* ========================================================================= */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveNewItem}
        categories={allCategories}
        occasions={allOccasions}
      />

      {/* 5. Edit Item Modal */}
      {editingItem && (
        <EditItemModal
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          onUpdate={handleUpdateItem}
          item={editingItem}
          categories={allCategories}
          occasions={allOccasions}
        />
      )}
    </main>
  );
}
