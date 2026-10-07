import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crop, Link2, Loader2, Shirt, Sparkles, Upload } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { GarmentCropDialog } from "@/components/GarmentCropDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchProductPreview, type ProductPreview } from "@/lib/product.functions";
import { getStoredWardrobeItems } from "@/lib/wardrobe-service";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export function ClothingLinkPanel({
  preview,
  onPreview,
}: {
  preview: ProductPreview | null;
  onPreview: (preview: ProductPreview) => void;
}) {
  const { user } = useAuth();
  const getPreview = useServerFn(fetchProductPreview);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClosetPicker, setShowClosetPicker] = useState(false);
  const [rankingPhotos, setRankingPhotos] = useState(false);
  /** Bumped by every new item or manual photo pick so a late ranking can't override it */
  const selectionVersion = useRef(0);
  /** Image waiting in the crop step, and the item it becomes */
  const [cropping, setCropping] = useState<{ src: string; base: ProductPreview } | null>(null);

  const wardrobeItems = getStoredWardrobeItems(user?.id || "guest_user");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    const version = ++selectionVersion.current;
    try {
      const fetched = await getPreview({ data: { url } });
      onPreview(fetched);
      void rankPhotos(fetched, version);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't read that product page.");
    } finally {
      setLoading(false);
    }
  };

  /** Re-orders the page's photos so the one best suited to try-on comes first and is used */
  const rankPhotos = async (fetched: ProductPreview, version: number) => {
    const candidates = fetched.imageCandidates ?? [];
    if (candidates.length < 2) return;
    setRankingPhotos(true);
    try {
      const { scoreTryOnImages } = await import("@/lib/garment-image-classifier");
      const scores = await scoreTryOnImages(candidates);
      if (version !== selectionVersion.current) return;
      const ranked = candidates
        .map((dataUrl, index) => ({ dataUrl, score: scores[index] ?? 0 }))
        .sort((a, b) => b.score - a.score)
        .map((candidate) => candidate.dataUrl);
      onPreview({ ...fetched, imageDataUrl: ranked[0]!, imageCandidates: ranked });
    } catch {
      // Ranking unavailable (offline, model blocked): keep the server's best guess
    } finally {
      if (version === selectionVersion.current) setRankingPhotos(false);
    }
  };

  const choosePhoto = (dataUrl: string) => {
    if (!preview) return;
    selectionVersion.current++;
    setRankingPhotos(false);
    onPreview({ ...preview, imageDataUrl: dataUrl });
  };

  const handleLocalFile = (file: File | undefined | null) => {
    if (!file) return;
    selectionVersion.current++;
    setRankingPhotos(false);
    const reader = new FileReader();
    // Uploads are often screenshots: crop to the garment before it's used
    reader.onload = () => {
      const src = String(reader.result);
      setCropping({
        src,
        base: {
          title: file.name.replace(/\.[^.]+$/, ""),
          siteName: "Uploaded",
          sourceUrl: "",
          imageDataUrl: src,
        },
      });
    };
    reader.readAsDataURL(file);
  };

  const finishCrop = (dataUrl: string) => {
    if (!cropping) return;
    selectionVersion.current++;
    setRankingPhotos(false);
    const { base } = cropping;
    // A cropped shop photo replaces its entry in the photo strip
    const candidates = base.imageCandidates?.map((candidate) =>
      candidate === base.imageDataUrl ? dataUrl : candidate,
    );
    onPreview({ ...base, imageDataUrl: dataUrl, imageCandidates: candidates });
    setCropping(null);
  };

  const handleSelectWardrobeItem = (item: (typeof wardrobeItems)[0]) => {
    selectionVersion.current++;
    setRankingPhotos(false);
    onPreview({
      title: item.title || "Wardrobe Item",
      siteName: item.category?.name || "My Closet",
      sourceUrl: "",
      imageDataUrl: item.image_url,
      closetParentType: item.category?.parent_type ?? null,
    });
    setShowClosetPicker(false);
  };

  return (
    <div className="space-y-4">
      {/* Shop Link Form */}
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Link2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            // Start the photo-ranking model download while the user pastes a link
            onFocus={() =>
              void import("@/lib/garment-image-classifier").then((m) => m.preloadGarmentModel())
            }
            placeholder="Paste a product link"
            aria-label="Product link"
            className="pl-9"
            inputMode="url"
          />
        </div>
        <Button type="submit" disabled={loading || !url.trim()} className="cursor-pointer">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Shirt className="size-4" />}
          {loading ? "Fetching" : "Fetch item"}
        </Button>
      </form>

      <div className="space-y-3">
        {/* A full-size button: uploading a photo is as common as pasting a link */}
        <label
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "w-full gap-2 px-4 focus-within:ring-1 focus-within:ring-ring",
          )}
        >
          <Upload className="size-4" />
          Upload a garment image
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              handleLocalFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs">
          <button
            type="button"
            onClick={() => setShowClosetPicker(!showClosetPicker)}
            className="flex cursor-pointer items-center gap-1 text-gold-ink hover:underline"
          >
            <Shirt className="size-3" />
            <span>{showClosetPicker ? "Hide closet" : "Pick from my closet"}</span>
          </button>
          {preview ? (
            <button
              type="button"
              onClick={() => setCropping({ src: preview.imageDataUrl, base: preview })}
              className="flex cursor-pointer items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
            >
              <Crop className="size-3" />
              <span>Crop image</span>
            </button>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">
          For best results, use the product photo only, not a full-page screenshot.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {/* Closet Quick Picker */}
      {showClosetPicker && (
        <div className="space-y-3 rounded-md border border-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Sparkles className="size-3.5 text-gold-ink" />
              <span>Items from your Closet ({wardrobeItems.length})</span>
            </span>
            <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
              <Link to="/closet">Manage Full Closet →</Link>
            </Button>
          </div>

          {wardrobeItems.length > 0 ? (
            <div className="grid max-h-48 grid-cols-3 gap-3 overflow-y-auto p-1 sm:grid-cols-4">
              {wardrobeItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectWardrobeItem(item)}
                  className="group flex min-w-0 cursor-pointer flex-col rounded-lg border border-border bg-card p-2 text-left transition-all hover:border-primary"
                >
                  <img
                    src={item.thumbnail_url || item.image_url}
                    alt={item.title || "Garment"}
                    className="aspect-square w-full rounded-md object-cover"
                  />
                  <span className="mt-1.5 truncate text-[11px] font-medium text-foreground">
                    {item.title || "Garment"}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {item.category?.name || "Clothing"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-2 text-xs text-muted-foreground">
              No items in your closet yet. Go to{" "}
              <Link to="/closet" className="underline">
                My Closet
              </Link>{" "}
              to add items.
            </p>
          )}
        </div>
      )}

      {!preview && !loading && wardrobeItems.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border/70 bg-secondary/20 p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Sparkles className="size-3.5 text-gold-ink" />
            <span>Try on a sample garment immediately:</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {wardrobeItems.slice(0, 4).map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSelectWardrobeItem(item)}
                className="h-8 max-w-full cursor-pointer gap-1.5 bg-background text-xs hover:border-primary"
              >
                <img
                  src={item.thumbnail_url || item.image_url}
                  alt=""
                  className="size-4 rounded-full object-cover"
                />
                <span className="max-w-[140px] truncate">{item.title}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {!loading && preview?.imageCandidates && preview.imageCandidates.length > 1 ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {rankingPhotos ? (
              <>
                <Loader2 className="size-3.5 shrink-0 animate-spin" />
                Finding the photo that works best for try-on…
              </>
            ) : (
              <>
                <Sparkles className="size-3.5 shrink-0 text-gold-ink" />
                {preview.imageCandidates.length} photos on this page. We picked the clearest front
                view of the garment; tap another to use it instead.
              </>
            )}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {preview.imageCandidates.map((dataUrl, index) => {
              const selected = dataUrl === preview.imageDataUrl;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => choosePhoto(dataUrl)}
                  aria-pressed={selected}
                  aria-label={`Use photo ${index + 1}`}
                  className={cn(
                    "relative shrink-0 cursor-pointer overflow-hidden rounded-md border transition-colors",
                    selected
                      ? "border-gold ring-1 ring-gold"
                      : "border-border hover:border-gold/60",
                  )}
                >
                  <img src={dataUrl} alt="" className="h-24 w-16 object-cover" />
                  {index === 0 && !rankingPhotos ? (
                    <span className="absolute inset-x-0 bottom-0 bg-background/85 py-0.5 text-center text-[9px] font-medium uppercase tracking-[0.15em] text-gold-ink">
                      Best
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <GarmentCropDialog
        src={cropping?.src ?? null}
        onCancel={() => setCropping(null)}
        onConfirm={finishCrop}
      />
    </div>
  );
}
