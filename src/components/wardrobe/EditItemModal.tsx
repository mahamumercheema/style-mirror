import { useState, useEffect } from "react";
import { FASHION_COLORS, FASHION_FABRICS, FASHION_SEASONS } from "@/lib/wardrobe-service";
import type {
  CategoryEntity,
  OccasionEntity,
  WardrobeItemWithDetails,
  UpdateWardrobeItemInput,
} from "@/types/wardrobe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Edit3, Heart, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface EditItemModalProps {
  item: WardrobeItemWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryEntity[];
  occasions: OccasionEntity[];
  onUpdate: (itemId: string, updates: UpdateWardrobeItemInput) => Promise<void> | void;
}

export function EditItemModal({
  item,
  isOpen,
  onClose,
  categories,
  occasions,
  onUpdate,
}: EditItemModalProps) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [selectedOccasions, setSelectedOccasions] = useState<number[]>([]);
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [fabricType, setFabricType] = useState("");
  const [season, setSeason] = useState("All Season");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.title || "");
      setCategoryId(item.category_id ?? "");
      setSelectedOccasions(item.occasions ? item.occasions.map((o) => o.id) : []);
      setPrimaryColor(item.primary_color || "");
      setSecondaryColor(item.secondary_color || "");
      setFabricType(item.fabric_type || "");
      setSeason(item.season || "All Season");
      setIsFavorite(item.is_favorite);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const toggleOccasion = (id: number) => {
    setSelectedOccasions((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updates: UpdateWardrobeItemInput = {
        title: title.trim() || item.category?.name || "Wardrobe Item",
        category_id: typeof categoryId === "number" ? categoryId : null,
        primary_color: primaryColor.trim() || undefined,
        secondary_color: secondaryColor.trim() || undefined,
        fabric_type: fabricType.trim() || undefined,
        season,
        is_favorite: isFavorite,
        occasion_ids: selectedOccasions,
      };

      await onUpdate(item.id, updates);
      toast.success("Wardrobe item details updated!");
      onClose();
    } catch (err) {
      toast.error((err as Error).message || "Failed to update item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg border border-border bg-card text-card-foreground p-6 rounded-2xl shadow-2xl my-auto transition-all max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <Edit3 className="size-3.5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold leading-none">Edit Wardrobe Item</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Update classification, fabric, colors and occasions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Item Preview */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-2.5">
            <img
              src={item.thumbnail_url || item.image_url}
              alt={item.title || "Item preview"}
              className="size-16 rounded-md object-cover border border-border shrink-0"
            />
            <div className="text-xs">
              <p className="font-semibold text-foreground">{item.title || "Wardrobe Item"}</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                Current Category: {item.category?.name || "Uncategorized"}
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-title" className="text-xs font-medium">
              Item Title / Name
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          {/* Category & Season */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-category" className="text-xs font-medium">
                Category
              </Label>
              <select
                id="edit-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-ring"
              >
                <option value="">Select Category...</option>
                {["Tops", "Bottoms", "Full Body / Ethnic Set", "Footwear", "Accessories"].map(
                  (parent) => (
                    <optgroup key={parent} label={parent}>
                      {categories
                        .filter((c) => c.parent_type === parent)
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                    </optgroup>
                  ),
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-season" className="text-xs font-medium">
                Season
              </Label>
              <select
                id="edit-season"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-ring"
              >
                {FASHION_SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Color & Fabric */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-color" className="text-xs font-medium">
                Primary Color
              </Label>
              <select
                id="edit-color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-ring"
              >
                <option value="">Select Color...</option>
                {FASHION_COLORS.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-fabric" className="text-xs font-medium">
                Fabric Type
              </Label>
              <select
                id="edit-fabric"
                value={fabricType}
                onChange={(e) => setFabricType(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-ring"
              >
                <option value="">Select Fabric...</option>
                {FASHION_FABRICS.map((fab) => (
                  <option key={fab} value={fab}>
                    {fab}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Occasion Tags (Multi-select) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Suitable Occasions</Label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {occasions.map((occ) => {
                const isSelected = selectedOccasions.includes(occ.id);
                return (
                  <button
                    key={occ.id}
                    type="button"
                    onClick={() => toggleOccasion(occ.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-medium shadow-xs"
                        : "border border-border/80 bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isSelected && <Check className="size-3" />}
                    <span>{occ.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Favorite Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex items-center gap-2">
              <Heart
                className={`size-4 ${isFavorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground"}`}
              />
              <span className="text-xs font-medium text-foreground">Favorite Piece</span>
            </div>
            <input
              type="checkbox"
              id="edit-favorite-toggle"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="size-4 rounded-sm border-border text-primary cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs font-medium cursor-pointer shadow-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
