import { useEffect, useState } from "react";
import { AlertCircle, Download, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AiTryOn } from "@/hooks/use-ai-try-on";
import type { GarmentCardsTryOn } from "@/hooks/use-garment-cards-try-on";
import { FRAME_LABEL, IMAGE_FRAME } from "@/lib/frame-styles";
import { OUTFIT_SLOT_LABELS, SKIP_REASONS } from "@/lib/outfit";
import { cn } from "@/lib/utils";

/**
 * Try-on button for the "Add garments" cards: sends the photo with every filled card, each as
 * its own category, layered top → sweater → jacket with pants separately.
 */
export function GarmentCardsTryOnButton({
  cards,
  onEdit,
  className,
}: {
  cards: GarmentCardsTryOn;
  onEdit: () => void;
  className?: string;
}) {
  const { filled, layers, busy } = cards;
  const latest = cards.looks[0];
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        onClick={() => void cards.start()}
        disabled={busy || layers.length === 0}
        className="w-full gap-2 sm:w-auto"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        {busy ? "Working..." : "Try it on"}
      </Button>
      <div className="space-y-1 text-[11px] leading-relaxed text-muted-foreground">
        {filled.length === 0 ? (
          <p>Add a top, pants, jacket or sweater below to try them on.</p>
        ) : (
          <p>
            Your {filled.length === 1 ? "garment" : `${filled.length} garments`}:{" "}
            {filled.map((slot) => OUTFIT_SLOT_LABELS[slot]).join(", ")}.{" "}
            <button
              type="button"
              onClick={onEdit}
              disabled={busy}
              className="cursor-pointer text-cobalt-text underline-offset-2 hover:underline"
            >
              Edit
            </button>
          </p>
        )}
        {layers.length > 0 ? (
          <p>
            Layered {layers.map((slot) => OUTFIT_SLOT_LABELS[slot].toLowerCase()).join(", then ")} (
            {layers.length === 1 ? "1 run" : `${layers.length} runs`} of your free daily try-ons).
          </p>
        ) : null}
        {latest && !busy
          ? latest.skipped
              .filter((item) => item.reason === "no-image")
              .map(({ slot }) => (
                <p key={slot} className="text-cobalt-text">
                  {OUTFIT_SLOT_LABELS[slot]} wasn't rendered: {SKIP_REASONS["no-image"]}. Upload a
                  photo of it instead.
                </p>
              ))
          : null}
      </div>
    </div>
  );
}

/** What the photo frame shows: the person photo or the generated look */
export type TryOnView = Pick<
  AiTryOn,
  "personPhoto" | "phase" | "error" | "elapsed" | "busy" | "statusText" | "download"
> & {
  result: { imageDataUrl: string; elapsedMs: number } | null;
  /** What was tried on, e.g. "Top" or "Pants + Top" */
  resultLabel: string | null;
  resultAlt: string;
  /** Re-runs the try-on, with a new seed for a different result */
  tryOn: (seed?: number) => Promise<void>;
};

/** "Your photo" column: the person photo, replaced by the generated look once it's ready. */
export function TryOnPhotoFrame({ tryOn }: { tryOn: TryOnView }) {
  const { personPhoto, phase, result, error, elapsed, busy, statusText, resultLabel, resultAlt } =
    tryOn;
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
                    ? "border-cobalt-border text-cobalt-text"
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
          alt={showResult ? resultAlt : "Your photo"}
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
            Generated in {Math.round(result.elapsedMs / 1000)}s · {resultLabel}
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
