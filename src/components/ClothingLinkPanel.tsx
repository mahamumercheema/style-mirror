import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Loader2, Shirt, Sparkles, Upload } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchProductPreview, type ProductPreview } from "@/lib/product.functions";
import { getStoredWardrobeItems } from "@/lib/wardrobe-service";
import { useAuth } from "@/context/AuthContext";

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

  const wardrobeItems = getStoredWardrobeItems(user?.id || "guest_user");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      onPreview(await getPreview({ data: { url } }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't read that product page.");
    } finally {
      setLoading(false);
    }
  };

  const handleLocalFile = (file: File | undefined | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      onPreview({
        title: file.name.replace(/\.[^.]+$/, ""),
        siteName: "Uploaded",
        sourceUrl: "",
        imageDataUrl: String(reader.result),
      });
    reader.readAsDataURL(file);
  };

  const handleSelectWardrobeItem = (item: (typeof wardrobeItems)[0]) => {
    onPreview({
      title: item.title || "Wardrobe Item",
      siteName: item.category?.name || "My Closet",
      sourceUrl: "",
      imageDataUrl: item.image_url,
    });
    setShowClosetPicker(false);
  };

  return (
    <section className="surface p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="eyebrow">Step 03 — The garment</p>
          <h2 className="mt-1 text-2xl">Choose garment to try on</h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowClosetPicker(!showClosetPicker)}
          className="gap-1.5 text-xs self-start sm:self-auto cursor-pointer"
        >
          <Shirt className="size-3.5 text-primary" />
          <span>{showClosetPicker ? "Hide Closet Picker" : "Pick from My Closet"}</span>
        </Button>
      </div>

      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Pick an item directly from your digital closet, paste an online product link, or upload an
        image.
      </p>

      {/* Closet Quick Picker Bar */}
      {showClosetPicker && (
        <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Items from your Closet ({wardrobeItems.length})</span>
            </span>
            <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
              <Link to="/closet">Manage Full Closet →</Link>
            </Button>
          </div>

          {wardrobeItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-48 overflow-y-auto p-1">
              {wardrobeItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectWardrobeItem(item)}
                  className="group flex flex-col rounded-lg border border-border bg-card p-2 text-left hover:border-primary hover:shadow-xs transition-all cursor-pointer"
                >
                  <img
                    src={item.thumbnail_url || item.image_url}
                    alt={item.title || "Garment"}
                    className="aspect-square w-full rounded-md object-cover"
                  />
                  <span className="text-[11px] font-medium text-foreground truncate mt-1.5">
                    {item.title || "Garment"}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {item.category?.name || "Clothing"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">
              No items in your closet yet. Go to{" "}
              <Link to="/closet" className="underline">
                My Closet
              </Link>{" "}
              to add items.
            </p>
          )}
        </div>
      )}

      {/* Shop Link Form */}
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Link2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://shop.example.com/linen-overshirt"
            className="pl-9"
            inputMode="url"
          />
        </div>
        <Button type="submit" disabled={loading || !url.trim()} className="cursor-pointer">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Shirt className="size-4" />}
          {loading ? "Fetching" : "Fetch item"}
        </Button>
      </form>

      <div className="mt-3 flex items-center gap-4 text-xs">
        <label className="inline-flex cursor-pointer items-center gap-2 text-muted-foreground underline-offset-4 hover:underline">
          <Upload className="size-3.5" />
          or upload a garment image instead
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleLocalFile(event.target.files?.[0])}
          />
        </label>
        <span className="text-border">·</span>
        <button
          type="button"
          onClick={() => setShowClosetPicker(true)}
          className="text-primary hover:underline cursor-pointer flex items-center gap-1"
        >
          <Shirt className="size-3" />
          <span>Select from closet</span>
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      {!preview && !loading && wardrobeItems.length > 0 && (
        <div className="mt-5 rounded-lg border border-border/70 bg-secondary/20 p-3.5 space-y-2">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-500" />
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
                className="text-xs gap-1.5 h-8 bg-background cursor-pointer hover:border-primary shadow-2xs"
              >
                <img
                  src={item.thumbnail_url || item.image_url}
                  alt=""
                  className="size-4 rounded-full object-cover"
                />
                <span className="truncate max-w-[140px]">{item.title}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex gap-4">
          <div className="checkerboard size-28 animate-pulse rounded-md" />
          <div className="flex-1 space-y-2 py-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
          </div>
        </div>
      ) : preview ? (
        <div className="mt-6 flex items-center gap-4 rounded-md border border-border p-4 bg-card shadow-xs">
          <img
            src={preview.imageDataUrl}
            alt={preview.title}
            className="checkerboard size-28 rounded-md object-contain"
          />
          <div className="min-w-0">
            <p className="eyebrow">{preview.siteName ?? "Item"}</p>
            <p className="mt-1 truncate font-medium text-foreground">{preview.title}</p>
            {preview.sourceUrl ? (
              <a
                href={preview.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                {preview.sourceUrl}
              </a>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">Loaded for Fitting Room</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
