import {
  PARENT_CATEGORY_GROUPS,
  FASHION_SEASONS,
  type DEFAULT_CATEGORIES,
  type DEFAULT_OCCASIONS,
} from "@/lib/wardrobe-service";
import type { CategoryEntity, OccasionEntity, ParentCategoryType } from "@/types/wardrobe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, RotateCcw, Search, Sparkles } from "lucide-react";

interface CategoryOccasionFilterBarProps {
  categories: CategoryEntity[];
  occasions: OccasionEntity[];
  selectedParentType: string;
  onSelectParentType: (parentType: string) => void;
  selectedCategoryId: number | null;
  onSelectCategoryId: (id: number | null) => void;
  selectedOccasionId: number | null;
  onSelectOccasionId: (id: number | null) => void;
  selectedSeason: string;
  onSelectSeason: (season: string) => void;
  showFavoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onResetFilters: () => void;
  totalFilteredCount: number;
  totalCount: number;
}

export function CategoryOccasionFilterBar({
  categories,
  occasions,
  selectedParentType,
  onSelectParentType,
  selectedCategoryId,
  onSelectCategoryId,
  selectedOccasionId,
  onSelectOccasionId,
  selectedSeason,
  onSelectSeason,
  showFavoritesOnly,
  onToggleFavoritesOnly,
  searchQuery,
  onSearchQueryChange,
  onResetFilters,
  totalFilteredCount,
  totalCount,
}: CategoryOccasionFilterBarProps) {
  // Filter subcategories that belong to the currently selected parent group
  const visibleCategories =
    selectedParentType === "All"
      ? categories
      : categories.filter((c) => c.parent_type === selectedParentType);

  const hasActiveFilters =
    selectedParentType !== "All" ||
    selectedCategoryId !== null ||
    selectedOccasionId !== null ||
    selectedSeason !== "All Season" ||
    showFavoritesOnly ||
    searchQuery.trim().length > 0;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
      {/* Search & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by title, color, fabric, category..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm bg-background"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Season Filter Dropdown */}
          <select
            value={selectedSeason}
            onChange={(e) => onSelectSeason(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-ring"
            aria-label="Filter by season"
          >
            {FASHION_SEASONS.map((s) => (
              <option key={s} value={s}>
                {s === "All Season" ? "All Seasons" : `${s} Season`}
              </option>
            ))}
          </select>

          {/* Favorites Only Toggle */}
          <Button
            type="button"
            variant={showFavoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={onToggleFavoritesOnly}
            className={`h-9 gap-1.5 text-xs font-medium cursor-pointer transition-all ${
              showFavoritesOnly
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart
              className={`size-3.5 ${showFavoritesOnly ? "fill-white text-white" : "text-rose-500"}`}
            />
            <span>Favorites</span>
          </Button>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* 1. Category Navigation Bar (Tops, Bottoms, Full Body / Ethnic, Footwear, Accessories) */}
      <div className="space-y-2 border-t border-border/60 pt-3">
        <div className="flex items-center justify-between">
          <span className="eyebrow text-[11px] text-muted-foreground">Categories</span>
          <span className="text-[11px] text-muted-foreground">
            Showing <strong className="text-foreground">{totalFilteredCount}</strong> of{" "}
            {totalCount} items
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {PARENT_CATEGORY_GROUPS.map((parent) => {
            const isSelected = selectedParentType === parent;
            return (
              <button
                key={parent}
                type="button"
                onClick={() => {
                  onSelectParentType(parent);
                  onSelectCategoryId(null); // reset specific subcategory when switching parent
                }}
                className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "bg-secondary/60 text-secondary-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {parent === "Full Body / Ethnic Set" ? "Ethnic & Full Body Sets" : parent}
              </button>
            );
          })}
        </div>

        {/* Sub-Category Pills (e.g. Shalwar Kameez, Gharara, Frock, Kurti, Jeans, etc.) */}
        {visibleCategories.length > 0 && selectedParentType !== "All" && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => onSelectCategoryId(null)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] transition-colors cursor-pointer ${
                selectedCategoryId === null
                  ? "bg-foreground text-background font-medium"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All {selectedParentType}
            </button>
            {visibleCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategoryId(isSelected ? null : cat.id)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-foreground text-background font-medium"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Occasions Filter Bar (Office, Casual, Wedding/Festive, Formal, Dinner, etc.) */}
      <div className="space-y-2 border-t border-border/60 pt-3">
        <div className="flex items-center justify-between">
          <span className="eyebrow text-[11px] text-muted-foreground">Filter by Occasion</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => onSelectOccasionId(null)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs transition-all cursor-pointer ${
              selectedOccasionId === null
                ? "bg-primary/90 text-primary-foreground font-medium"
                : "border border-border/80 bg-background text-muted-foreground hover:text-foreground hover:border-foreground/40"
            }`}
          >
            All Occasions
          </button>
          {occasions.map((occ) => {
            const isSelected = selectedOccasionId === occ.id;
            return (
              <button
                key={occ.id}
                type="button"
                onClick={() => onSelectOccasionId(isSelected ? null : occ.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-medium shadow-xs"
                    : "border border-border/80 bg-background text-muted-foreground hover:text-foreground hover:border-foreground/40"
                }`}
              >
                {occ.name?.includes("Wedding") && <Sparkles className="size-3 text-amber-500" />}
                <span>{occ.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
