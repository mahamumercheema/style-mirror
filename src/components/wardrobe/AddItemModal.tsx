import { useState, useRef } from "react";
import {
  FASHION_COLORS,
  FASHION_FABRICS,
  FASHION_SEASONS,
  type DEFAULT_CATEGORIES,
  type DEFAULT_OCCASIONS,
} from "@/lib/wardrobe-service";
import type {
  CategoryEntity,
  OccasionEntity,
  CreateWardrobeItemInput,
  WardrobeItemWithDetails,
} from "@/types/wardrobe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Heart, Image as ImageIcon, Loader2, Sparkles, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryEntity[];
  occasions: OccasionEntity[];
  onSave: (input: CreateWardrobeItemInput) => Promise<WardrobeItemWithDetails | void> | void;
}

const PRESET_SAMPLE_IMAGES = [
  {
    name: "Embroidered Kurti",
    url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
    catId: 4,
    color: "Emerald Green",
    fabric: "Raw Silk",
  },
  {
    name: "Linen Blazer",
    url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80",
    catId: 6,
    color: "Beige / Camel",
    fabric: "Linen",
  },
  {
    name: "Gharara Suit",
    url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
    catId: 14,
    color: "Crimson Red",
    fabric: "Silk",
  },
  {
    name: "Classic Denim Jeans",
    url: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80",
    catId: 8,
    color: "Navy Blue",
    fabric: "Denim",
  },
  {
    name: "Velvet Evening Gown",
    url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80",
    catId: 16,
    color: "Navy Blue",
    fabric: "Velvet",
  },
  {
    name: "Golden Khussa",
    url: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80",
    catId: 23,
    color: "Gold",
    fabric: "Raw Silk",
  },
];

export function AddItemModal({
  isOpen,
  onClose,
  categories,
  occasions,
  onSave,
}: AddItemModalProps) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [selectedOccasions, setSelectedOccasions] = useState<number[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [fabricType, setFabricType] = useState("");
  const [season, setSeason] = useState("All Season");
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageInputTab, setImageInputTab] = useState<"upload" | "url" | "presets">("upload");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, WebP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") {
        setImageUrl(e.target.result);
        toast.success("Image uploaded successfully");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const toggleOccasion = (id: number) => {
    setSelectedOccasions((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      toast.error("Please provide an image for the wardrobe item.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCategory = categories.find((c) => c.id === categoryId);

      const input: CreateWardrobeItemInput = {
        title: title.trim() || selectedCategory?.name || "Wardrobe Item",
        category_id: typeof categoryId === "number" ? categoryId : null,
        image_url: imageUrl,
        thumbnail_url: imageUrl,
        primary_color: primaryColor.trim() || undefined,
        secondary_color: secondaryColor.trim() || undefined,
        fabric_type: fabricType.trim() || undefined,
        season,
        is_favorite: isFavorite,
        occasion_ids: selectedOccasions,
      };

      await onSave(input);
      toast.success("New wardrobe item added to your closet!");
      onClose();
    } catch (err) {
      toast.error((err as Error).message || "Failed to save item");
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
      <div className="relative w-full max-w-xl border border-border bg-card text-card-foreground p-6 rounded-2xl shadow-2xl my-auto transition-all max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <UploadCloud className="size-4" />
            </span>
            <div>
              <h2 className="text-lg font-semibold leading-none">Add Item to Wardrobe</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Upload clothing or accessories with smart categorization & occasion tags
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

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* Image Upload Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Garment / Item Photo *</Label>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setImageInputTab("upload")}
                  className={`px-2 py-0.5 rounded-sm transition-colors cursor-pointer ${
                    imageInputTab === "upload"
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Upload File
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setImageInputTab("url")}
                  className={`px-2 py-0.5 rounded-sm transition-colors cursor-pointer ${
                    imageInputTab === "url"
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Image URL
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setImageInputTab("presets")}
                  className={`px-2 py-0.5 rounded-sm transition-colors cursor-pointer ${
                    imageInputTab === "presets"
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Presets
                </button>
              </div>
            </div>

            {imageInputTab === "upload" && (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : imageUrl
                      ? "border-border bg-secondary/20"
                      : "border-border hover:border-primary/50 hover:bg-muted/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />

                {imageUrl ? (
                  <div className="flex items-center gap-4 w-full">
                    <img
                      src={imageUrl}
                      alt="Uploaded preview"
                      className="size-24 rounded-lg object-cover border border-border shadow-xs shrink-0"
                    />
                    <div className="text-left text-xs">
                      <p className="font-medium text-foreground">Photo ready for wardrobe</p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        Click or drag new photo to replace
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageUrl("");
                        }}
                        className="text-destructive text-[11px] hover:underline mt-2 inline-block cursor-pointer"
                      >
                        Remove photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="size-8 text-muted-foreground mb-1.5" />
                    <p className="text-xs font-medium text-foreground">
                      Click to upload photo or drag & drop
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      PNG, JPG, WebP from your device or camera
                    </p>
                  </>
                )}
              </div>
            )}

            {imageInputTab === "url" && (
              <div className="space-y-2">
                <Input
                  type="url"
                  placeholder="https://example.com/clothing-image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="text-xs h-9"
                />
                {imageUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <img
                      src={imageUrl}
                      alt="URL preview"
                      className="size-16 rounded-md object-cover border border-border"
                      onError={() => toast.error("Could not load image from this URL")}
                    />
                    <span className="text-xs text-muted-foreground">URL image preview</span>
                  </div>
                )}
              </div>
            )}

            {imageInputTab === "presets" && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                {PRESET_SAMPLE_IMAGES.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setImageUrl(preset.url);
                      setTitle(preset.name);
                      setCategoryId(preset.catId);
                      setPrimaryColor(preset.color);
                      setFabricType(preset.fabric);
                      toast.success(`Selected ${preset.name}`);
                    }}
                    className={`group relative rounded-lg border overflow-hidden p-1 text-left transition-all cursor-pointer ${
                      imageUrl === preset.url
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="aspect-square w-full object-cover rounded-md"
                    />
                    <span className="block text-[10px] font-medium truncate mt-1 text-foreground">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Item Title */}
          <div className="space-y-1.5">
            <Label htmlFor="item-title" className="text-xs font-medium">
              Item Title / Name
            </Label>
            <Input
              id="item-title"
              placeholder="e.g., Royal Blue Embroidered Kurti, Straight Fit Jeans"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          {/* Category Dropdown (Grouped by Parent Type) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-category" className="text-xs font-medium">
                Category *
              </Label>
              <select
                id="item-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">Select Category...</option>
                {/* Group by parent_type */}
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

            {/* Season Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="item-season" className="text-xs font-medium">
                Season
              </Label>
              <select
                id="item-season"
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

          {/* Color & Fabric Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-color" className="text-xs font-medium">
                Primary Color
              </Label>
              <select
                id="item-color"
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
              <Label htmlFor="item-fabric" className="text-xs font-medium">
                Fabric Type
              </Label>
              <select
                id="item-fabric"
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

          {/* Occasion Tags (Multi-select pills) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Suitable Occasions (Multi-Select)</Label>
              <span className="text-[11px] text-muted-foreground">
                {selectedOccasions.length} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {occasions.map((occ) => {
                const isSelected = selectedOccasions.includes(occ.id);
                return (
                  <button
                    key={occ.id}
                    type="button"
                    onClick={() => toggleOccasion(occ.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-medium shadow-xs"
                        : "border border-border/80 bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30"
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
              <div>
                <p className="text-xs font-medium text-foreground">Mark as Favorite Item</p>
                <p className="text-[11px] text-muted-foreground">
                  Quickly filter and access this piece in your closet
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              id="modal-favorite-toggle"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="size-4 rounded-sm border-border text-primary cursor-pointer"
            />
          </div>

          {/* Action Buttons */}
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
              disabled={isSubmitting || !imageUrl}
              className="text-xs font-medium cursor-pointer shadow-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving to Closet...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  <span>Save to Closet</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
