import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FRAME_LABEL } from "@/lib/frame-styles";
import {
  ACCEPTED_IMAGE_TYPES,
  checkImageFile,
  linkDomain,
  OUTFIT_SLOT_LABELS,
  OUTFIT_SLOTS,
  readFileAsDataUrl,
  type OutfitSlot,
} from "@/lib/outfit";
import { fetchProductPreview } from "@/lib/product.functions";
import { cn } from "@/lib/utils";

/** A pasted product link */
export type GarmentLink = { type: "link"; src: string };

/** Per garment: an uploaded photo (data URL), a pasted link, or null */
export type GarmentUploads = Record<OutfitSlot, string | GarmentLink | null>;

/** The link as an absolute http(s) URL, or null when it isn't a usable web address */
function normaliseLink(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}

export const EMPTY_GARMENT_UPLOADS: GarmentUploads = {
  top: null,
  pants: null,
  jacket: null,
  sweater: null,
};

/** "Add garments": five labelled cards, each holding one garment photo or product link */
export function GarmentUploadCards({
  garments,
  onChange,
}: {
  garments: GarmentUploads;
  onChange: (garments: GarmentUploads) => void;
}) {
  const getPreview = useServerFn(fetchProductPreview);
  const [error, setError] = useState<string | null>(null);
  const [slotLoading, setSlotLoading] = useState<Partial<Record<OutfitSlot, boolean>>>({});
  const [slotErrors, setSlotErrors] = useState<Partial<Record<OutfitSlot, string | null>>>({});
  // Always reference the latest garments snapshot in async callbacks
  const garmentsRef = useRef(garments);
  garmentsRef.current = garments;

  const upload = async (slot: OutfitSlot, file: File | undefined) => {
    if (!file) return;
    const problem = checkImageFile(file);
    setError(problem);
    if (problem) return;
    onChange({ ...garmentsRef.current, [slot]: await readFileAsDataUrl(file) });
  };

  /** Saves a pasted link then immediately resolves it to a product image server-side */
  const addLink = (slot: OutfitSlot, text: string) => {
    const url = normaliseLink(text);
    if (!url) {
      setError("That doesn't look like a link. Paste a product page address.");
      return false;
    }
    setError(null);
    setSlotErrors((prev) => ({ ...prev, [slot]: null }));
    // Show the domain badge while fetching
    onChange({ ...garmentsRef.current, [slot]: { type: "link", src: url } });
    setSlotLoading((prev) => ({ ...prev, [slot]: true }));
    getPreview({ data: { url } })
      .then((preview) => {
        onChange({ ...garmentsRef.current, [slot]: preview.imageDataUrl });
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : "Couldn't get an image from this link — try uploading a photo instead.";
        setSlotErrors((prev) => ({ ...prev, [slot]: message }));
      })
      .finally(() => {
        setSlotLoading((prev) => ({ ...prev, [slot]: false }));
      });
    return true;
  };

  return (
    <section aria-labelledby="add-garments-title" className="space-y-3">
      <h2 id="add-garments-title" className={FRAME_LABEL}>
        Add garments
      </h2>
      {/* Phones: one row that scrolls sideways. Desktop side column: two across. */}
      <div className="flex gap-3 overflow-x-auto pb-1 min-[900px]:grid min-[900px]:grid-cols-2 min-[900px]:overflow-visible">
        {OUTFIT_SLOTS.map((slot) => (
          <GarmentCard
            key={slot}
            label={OUTFIT_SLOT_LABELS[slot]}
            value={garments[slot]}
            loading={slotLoading[slot] ?? false}
            fetchError={slotErrors[slot] ?? null}
            onFile={(file) => void upload(slot, file)}
            onLink={(text) => addLink(slot, text)}
            onRemove={() => {
              setSlotErrors((prev) => ({ ...prev, [slot]: null }));
              onChange({ ...garmentsRef.current, [slot]: null });
            }}
          />
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function GarmentCard({
  label,
  value,
  loading,
  fetchError,
  onFile,
  onLink,
  onRemove,
}: {
  label: string;
  value: string | GarmentLink | null;
  loading: boolean;
  fetchError: string | null;
  onFile: (file: File | undefined) => void;
  onLink: (text: string) => boolean;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [linkText, setLinkText] = useState("");
  const saveLink = (text: string) => {
    if (text.trim() && onLink(text)) setLinkText("");
  };
  const removeButton = (what: string) => (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove the ${label.toLowerCase()} ${what}`}
      className="absolute top-1 right-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-background/85 text-foreground"
    >
      <X className="size-3.5" />
    </button>
  );
  return (
    <div className="relative flex w-40 shrink-0 flex-col gap-2 rounded-md border border-border p-2 min-[900px]:w-auto">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="relative aspect-square overflow-hidden rounded-sm bg-foreground/10">
        {loading ? (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 p-2">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="text-center text-[10px] text-muted-foreground">Fetching image…</span>
          </div>
        ) : typeof value === "string" ? (
          <>
            <img src={value} alt={label} className="size-full object-contain p-1" />
            {removeButton("photo")}
          </>
        ) : value ? (
          <>
            <div className="flex size-full flex-col items-center justify-center gap-1.5 p-2">
              {fetchError ? (
                <p className="text-center text-[10px] leading-tight text-destructive">
                  {fetchError}
                </p>
              ) : (
                <a
                  href={value.src}
                  target="_blank"
                  rel="noreferrer"
                  title={value.src}
                  className="max-w-full truncate rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] text-foreground hover:border-cobalt-border"
                >
                  {linkDomain(value.src)}
                </a>
              )}
            </div>
            {removeButton("link")}
          </>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-label={`Upload a ${label.toLowerCase()} photo`}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-auto min-h-8 w-full gap-1.5 whitespace-normal px-2 py-1.5 text-[10px] leading-tight tracking-[0.08em]",
        )}
      >
        <Upload className="size-3.5 shrink-0" />
        <span>Upload photo</span>
      </button>
      <Input
        value={linkText}
        onChange={(event) => setLinkText(event.target.value)}
        // Saved as soon as a link is pasted; typed links on Enter or when leaving the field
        onPaste={(event) => {
          event.preventDefault();
          const pasted = event.clipboardData.getData("text");
          setLinkText(pasted);
          saveLink(pasted);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            saveLink(linkText);
          }
        }}
        onBlur={() => saveLink(linkText)}
        placeholder="or paste link"
        aria-label={`Or paste a ${label.toLowerCase()} product link`}
        inputMode="url"
        className="h-8 px-2 text-[11px]"
      />
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
