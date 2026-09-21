import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Loader2, Shirt, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchProductPreview, type ProductPreview } from "@/lib/product.functions";

export function ClothingLinkPanel({
  preview,
  onPreview,
}: {
  preview: ProductPreview | null;
  onPreview: (preview: ProductPreview) => void;
}) {
  const getPreview = useServerFn(fetchProductPreview);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <section className="surface p-6">
      <p className="eyebrow">Step 03 — The garment</p>
      <h2 className="mt-1 text-2xl">Paste a clothing link</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        We read the shop page's own preview image and title. A photo on a plain or cut-out
        background layers best.
      </p>

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
        <Button type="submit" disabled={loading || !url.trim()}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Shirt className="size-4" />}
          {loading ? "Fetching" : "Fetch item"}
        </Button>
      </form>

      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground underline-offset-4 hover:underline">
        <Upload className="size-3.5" />
        or upload a garment image instead
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleLocalFile(event.target.files?.[0])}
        />
      </label>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <div className="mt-6 flex gap-4">
          <div className="checkerboard size-28 animate-pulse rounded-md" />
          <div className="flex-1 space-y-2 py-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
          </div>
        </div>
      ) : preview ? (
        <div className="mt-6 flex items-center gap-4 rounded-md border border-border p-4">
          <img
            src={preview.imageDataUrl}
            alt={preview.title}
            className="checkerboard size-28 rounded-md object-contain"
          />
          <div className="min-w-0">
            <p className="eyebrow">{preview.siteName ?? "Item"}</p>
            <p className="mt-1 truncate font-medium">{preview.title}</p>
            {preview.sourceUrl ? (
              <a
                href={preview.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                {preview.sourceUrl}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
