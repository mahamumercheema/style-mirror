import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { WardrobeItemWithDetails } from "@/types/wardrobe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit3, Heart, MoreVertical, Shirt, Sparkles, Trash2, ExternalLink } from "lucide-react";

interface WardrobeItemCardProps {
  item: WardrobeItemWithDetails;
  onToggleFavorite: (itemId: string) => void;
  onEdit: (item: WardrobeItemWithDetails) => void;
  onDelete: (itemId: string) => void;
}

export function WardrobeItemCard({
  item,
  onToggleFavorite,
  onEdit,
  onDelete,
}: WardrobeItemCardProps) {
  const [imageError, setImageError] = useState(false);

  // Fallback styling for categories
  const parentType = item.category?.parent_type || "Clothing";

  const getParentTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "Tops":
        return "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20";
      case "Bottoms":
        return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20";
      case "Full Body / Ethnic Set":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
      case "Footwear":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
      case "Accessories":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20";
      default:
        return "bg-secondary text-secondary-foreground border-border";
    }
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs transition-all duration-200 hover:shadow-md hover:border-border/80">
      {/* Top Image Container */}
      <div className="relative aspect-3/4 w-full overflow-hidden bg-muted/60">
        {!imageError ? (
          <img
            src={item.thumbnail_url || item.image_url}
            alt={item.title || "Wardrobe item"}
            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-secondary/40 p-4 text-center text-muted-foreground">
            <Shirt className="size-10 mb-2 opacity-50" />
            <p className="text-xs font-medium">{item.title || "Clothing Item"}</p>
          </div>
        )}

        {/* Favorite Heart Button (Top-Right) */}
        <button
          type="button"
          aria-label={item.is_favorite ? "Remove from favorites" : "Add to favorites"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.id);
          }}
          className={`absolute right-2.5 top-2.5 z-10 flex size-8 items-center justify-center rounded-full backdrop-blur-md transition-all cursor-pointer shadow-xs ${
            item.is_favorite
              ? "bg-rose-500 text-white hover:bg-rose-600 scale-105"
              : "bg-black/40 text-white/80 hover:bg-black/60 hover:text-white"
          }`}
        >
          <Heart
            className={`size-4 transition-transform active:scale-125 ${
              item.is_favorite ? "fill-white text-white" : ""
            }`}
          />
        </button>

        {/* Category Pill (Top-Left) */}
        <div className="absolute left-2.5 top-2.5 z-10">
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold tracking-wide backdrop-blur-md ${getParentTypeBadgeStyle(
              parentType,
            )}`}
          >
            {item.category?.name || parentType}
          </Badge>
        </div>

        {/* Floating Try-On CTA on Hover */}
        <div className="absolute inset-x-2 bottom-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            asChild
            size="sm"
            className="w-full h-8 text-xs font-medium shadow-md bg-primary/95 hover:bg-primary backdrop-blur-xs cursor-pointer gap-1.5"
          >
            <Link to="/studio">
              <Shirt className="size-3.5" />
              <span>Try On in Studio</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Item Metadata */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4 justify-between space-y-2.5">
        <div>
          {/* Title & Actions Menu */}
          <div className="flex items-start justify-between gap-1.5">
            <h3
              className="font-medium text-sm leading-snug line-clamp-1 text-foreground"
              title={item.title || "Wardrobe Item"}
            >
              {item.title || item.category?.name || "Wardrobe Item"}
            </h3>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                  aria-label="Item actions"
                >
                  <MoreVertical className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 text-xs shadow-md">
                <DropdownMenuItem
                  onClick={() => onEdit(item)}
                  className="gap-2 cursor-pointer text-xs"
                >
                  <Edit3 className="size-3.5 text-muted-foreground" />
                  <span>Edit Details</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(item.id)}
                  className="gap-2 cursor-pointer text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Color, Fabric, Season Details */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 flex-wrap">
            {item.primary_color && (
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full border border-border/80 bg-foreground/20" />
                <span className="font-medium text-foreground/80">{item.primary_color}</span>
              </span>
            )}
            {item.fabric_type && (
              <>
                <span>•</span>
                <span>{item.fabric_type}</span>
              </>
            )}
            {item.season && (
              <>
                <span>•</span>
                <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px]">
                  {item.season}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Occasion Tags (Many-to-Many junction badges) */}
        {item.occasions && item.occasions.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-border/40">
            {item.occasions.slice(0, 2).map((occ) => (
              <span
                key={occ.id}
                className="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] text-secondary-foreground font-medium"
              >
                {occ.name?.includes("Wedding") && <Sparkles className="size-2.5 text-amber-500" />}
                <span className="truncate max-w-[100px]">{occ.name}</span>
              </span>
            ))}
            {item.occasions.length > 2 && (
              <span className="text-[10px] text-muted-foreground font-medium">
                +{item.occasions.length - 2} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
