import { useEffect, useState } from "react";
import { AlertCircle, Download, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AiTryOn } from "@/hooks/use-ai-try-on";
import { CATEGORY_LABELS, type GarmentCategory } from "@/lib/garment-category";
import { FRAME_LABEL, IMAGE_FRAME } from "@/lib/frame-styles";
import { cn } from "@/lib/utils";

function sourceNote(source: string | null, evidence: string | null) {
  switch (source) {
    case "closet":
      return "From its closet category";
    case "image":
      return `Detected from the product image${evidence ? ` (${evidence})` : ""}`;
    case "you":
      return "Chosen by you";
    case null:
      return null;
    default:
      return `Detected from the product ${source}${evidence ? ` (“${evidence}”)` : ""}`;
  }
}

export function TryOnButton({ tryOn, className }: { tryOn: AiTryOn; className?: string }) {
  const { garment, category, busy, detected } = tryOn;
  const hint = !garment
    ? "Add a garment first"
    : detected.analysingImage
      ? "Analyzing the garment..."
      : !category || detected.needsConfirmation
        ? "Confirm the garment type"
        : null;
  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <Button
        onClick={() => void tryOn.tryOn()}
        disabled={!garment || !category || busy || detected.analysingImage}
        className="w-full gap-2 sm:w-auto"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        {busy ? "Working..." : "Try it on"}
      </Button>
      {hint && !busy ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** "Your photo" column: the person photo, replaced by the generated look once it's ready. */
export function TryOnPhotoFrame({ tryOn }: { tryOn: AiTryOn }) {
  const { personPhoto, phase, result, error, elapsed, busy, statusText, garment } = tryOn;
  const [showOriginal, setShowOriginal] = useState(false);
  useEffect(() => setShowOriginal(false), [result]);
  const showResult = phase === "done" && result && !showOriginal;

  return (
    <div className="space-y-3">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <p className={FRAME_LABEL}>{showResult ? "Your look" : "Your photo"}</p>
        {phase === "done" && result ? (
          <div className="flex items-center gap-1" role="group" aria-label="Show">
            {(
              [
                ["Result", false],
                ["Original", true],
              ] as const
            ).map(([label, original]) => (
              <button
                key={label}
                type="button"
                aria-pressed={showOriginal === original}
                onClick={() => setShowOriginal(original)}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1 text-[11px] transition-colors",
                  showOriginal === original
                    ? "border-gold text-gold-ink"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div data-frame="photo" className={cn(IMAGE_FRAME, "bg-secondary")}>
        <img
          src={showResult ? result.imageDataUrl : personPhoto}
          alt={showResult && garment ? `You wearing ${garment.title}` : "Your photo"}
          className={cn(
            "absolute inset-0 size-full object-top",
            showResult ? "object-contain" : "object-cover",
          )}
        />
        {busy ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/75 p-6 text-center"
            aria-live="polite"
          >
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="font-display text-xl">{statusText}</p>
            {phase === "generating" ? (
              <p className="text-xs text-muted-foreground">
                {elapsed}s — usually 15–30s, longer if the free GPU queue is busy
              </p>
            ) : null}
          </div>
        ) : phase === "error" ? (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/85 p-6 text-center"
          >
            <AlertCircle className="size-8 text-destructive" />
            <p className="max-w-sm text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void tryOn.tryOn()}>
              <RefreshCw className="size-3.5" />
              Try again
            </Button>
          </div>
        ) : null}
      </div>

      {phase === "done" && result ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Generated in {Math.round(result.elapsedMs / 1000)}s · {CATEGORY_LABELS[result.category]}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void tryOn.tryOn(Math.floor(Math.random() * 2 ** 31))}
            >
              <RefreshCw className="size-3.5" />
              Try again
            </Button>
            <Button size="sm" onClick={tryOn.download}>
              <Download className="size-3.5" />
              Download
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Garment type (Leffa mode): detected automatically, always overridable */
export function GarmentTypePicker({ tryOn }: { tryOn: AiTryOn }) {
  const { detected, category, busy } = tryOn;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">What kind of garment is it?</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Garment type">
        {(Object.keys(CATEGORY_LABELS) as GarmentCategory[]).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={category === option}
            disabled={busy}
            onClick={() => detected.chooseCategory(option)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              category === option
                ? "border-gold bg-gold/10 text-gold-ink"
                : "border-border text-muted-foreground hover:border-foreground/50",
            )}
          >
            {CATEGORY_LABELS[option]}
          </button>
        ))}
      </div>
      {detected.analysingImage ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Analyzing the garment...
        </p>
      ) : detected.needsConfirmation ? (
        <p className="text-xs font-medium text-gold-ink">
          {category
            ? "Not certain — please confirm the garment type."
            : "Couldn't identify the garment — please choose its type."}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {sourceNote(detected.source, detected.evidence)}
        </p>
      )}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Try-on uses the free, open-source Leffa model on Hugging Face's free GPU tier, so there's a
        small daily limit. Your images are sent for this one request and not stored.
      </p>
    </div>
  );
}
