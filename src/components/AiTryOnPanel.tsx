import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Download, Loader2, RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useGarmentCategory } from "@/hooks/use-garment-category";
import { CATEGORY_LABELS, type GarmentCategory } from "@/lib/garment-category";
import type { ProductPreview } from "@/lib/product.functions";
import { generateTryOn, type TryOnResult } from "@/lib/tryon.functions";
import { cn } from "@/lib/utils";

const MAX_EDGE = 1024;

/** Shrinks a data-URL image to at most 1024px on its long edge (JPEG). URLs pass through. */
async function prepareImage(src: string) {
  if (!src.startsWith("data:")) return src;
  const img = new Image();
  img.src = src;
  await img.decode();
  const ratio = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * ratio);
  canvas.height = Math.round(img.naturalHeight * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.fillStyle = "#ffffff"; // flatten transparent PNGs onto white
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.92);
}

/** Leffa's working resolution (3:4). */
const LEFFA_WIDTH = 768;
const LEFFA_HEIGHT = 1024;

type Rect = { x: number; y: number; width: number; height: number };

/**
 * Fits the person photo into Leffa's 768×1024 frame without distortion. Instead of the
 * white bars Leffa would add, the spare space is filled with a blurred copy of the photo
 * (natural context for the model). Returns where the real photo sits, to crop back later.
 */
async function preparePerson(src: string): Promise<{ dataUrl: string; photoRect: Rect }> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = LEFFA_WIDTH;
  canvas.height = LEFFA_HEIGHT;
  const ctx = canvas.getContext("2d");
  const fullFrame = { x: 0, y: 0, width: LEFFA_WIDTH, height: LEFFA_HEIGHT };
  if (!ctx) return { dataUrl: await prepareImage(src), photoRect: fullFrame };

  const fit = Math.min(LEFFA_WIDTH / img.naturalWidth, LEFFA_HEIGHT / img.naturalHeight);
  const cover = Math.max(LEFFA_WIDTH / img.naturalWidth, LEFFA_HEIGHT / img.naturalHeight);
  // Blurred fill behind the photo
  ctx.filter = "blur(24px)";
  const coverW = img.naturalWidth * cover;
  const coverH = img.naturalHeight * cover;
  ctx.drawImage(img, (LEFFA_WIDTH - coverW) / 2, (LEFFA_HEIGHT - coverH) / 2, coverW, coverH);
  ctx.filter = "none";
  // The sharp photo, centred at its true proportions
  const width = Math.round(img.naturalWidth * fit);
  const height = Math.round(img.naturalHeight * fit);
  const photoRect = {
    x: Math.round((LEFFA_WIDTH - width) / 2),
    y: Math.round((LEFFA_HEIGHT - height) / 2),
    width,
    height,
  };
  ctx.drawImage(img, photoRect.x, photoRect.y, width, height);
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.94), photoRect };
}

/** Crops Leffa's output back to the photo's original framing (drops the padded margins). */
async function cropToPhoto(resultSrc: string, rect: Rect) {
  const img = new Image();
  img.src = resultSrc;
  await img.decode();
  const sx = img.naturalWidth / LEFFA_WIDTH;
  const sy = img.naturalHeight / LEFFA_HEIGHT;
  if (rect.width >= LEFFA_WIDTH - 1 && rect.height >= LEFFA_HEIGHT - 1) return resultSrc;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(rect.width * sx);
  canvas.height = Math.round(rect.height * sy);
  const ctx = canvas.getContext("2d");
  if (!ctx) return resultSrc;
  ctx.drawImage(
    img,
    rect.x * sx,
    rect.y * sy,
    rect.width * sx,
    rect.height * sy,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas.toDataURL("image/png");
}

type Phase = "idle" | "preparing" | "generating" | "done" | "error";

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

export function AiTryOnPanel({
  personPhoto,
  garment,
}: {
  personPhoto: string;
  garment: ProductPreview;
}) {
  const runTryOn = useServerFn(generateTryOn);
  const detected = useGarmentCategory(garment);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // A different garment or photo means a new try-on
  useEffect(() => {
    setPhase("idle");
    setResult(null);
    setError(null);
  }, [garment, personPhoto]);

  // Real elapsed time while Leffa works (no fake percentages)
  useEffect(() => {
    if (phase !== "generating") return;
    const started = Date.now();
    setElapsed(0);
    const timer = window.setInterval(
      () => setElapsed(Math.round((Date.now() - started) / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [phase]);

  const busy = phase === "preparing" || phase === "generating";
  const category = detected.category;

  const tryOn = async (seed = 42) => {
    if (!category || busy) return;
    setError(null);
    setPhase("preparing");
    try {
      const [person, garmentImage] = await Promise.all([
        preparePerson(personPhoto),
        prepareImage(garment.imageDataUrl),
      ]);
      setPhase("generating");
      const generated = await runTryOn({
        data: { personImage: person.dataUrl, garmentImage, category, seed },
      });
      // Leffa's own pixels, with only the padded margins removed
      setResult({
        ...generated,
        imageDataUrl: await cropToPhoto(generated.imageDataUrl, person.photoRect),
      });
      setPhase("done");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The try-on failed. Please try again.");
      setPhase("error");
    }
  };

  const download = () => {
    if (!result) return;
    const link = document.createElement("a");
    const slug =
      garment.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40) || "look";
    link.download = `atelier-ora-${slug}.png`;
    link.href = result.imageDataUrl;
    link.click();
  };

  const statusText =
    phase === "preparing"
      ? "Preparing your try-on..."
      : detected.analysingImage
        ? "Analyzing the garment..."
        : phase === "generating"
          ? "Fitting the garment and generating your look..."
          : null;

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start">
      {/* Inputs and controls */}
      <div className="surface space-y-6 p-6">
        <div>
          <p className="eyebrow">Step 04 — Try it on</p>
          <h2 className="mt-1 text-2xl">{garment.title}</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            An AI model generates a new photo of you wearing this garment.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { src: personPhoto, label: "Your photo" },
            { src: garment.imageDataUrl, label: "Garment" },
          ].map(({ src, label }) => (
            <figure key={label} className="space-y-1.5">
              <div className="checkerboard flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md">
                <img src={src} alt={label} className="h-full w-full object-contain" />
              </div>
              <figcaption className="eyebrow">{label}</figcaption>
            </figure>
          ))}
        </div>

        {/* Garment category (Leffa mode) */}
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
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground/80 hover:border-foreground/50",
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
            <p className="text-xs font-medium text-amber-700">
              {category
                ? "Not certain — please confirm the garment type."
                : "Couldn't identify the garment — please choose its type."}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {sourceNote(detected.source, detected.evidence)}
            </p>
          )}
        </div>

        <Button
          size="lg"
          onClick={() => void tryOn()}
          disabled={!category || busy || detected.analysingImage}
          className="w-full gap-2"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {busy ? "Working..." : "Try it on"}
        </Button>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Uses the free, open-source Leffa model on Hugging Face's free GPU tier, so there's a small
          daily limit. Your images are sent for this one request and not stored.
        </p>
      </div>

      {/* Result */}
      <div className="surface flex min-h-[28rem] flex-col items-center justify-center p-4">
        {phase === "done" && result ? (
          <div className="w-full space-y-4">
            <img
              src={result.imageDataUrl}
              alt={`You wearing ${garment.title}`}
              className="mx-auto max-h-[42rem] w-auto rounded-md"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Generated in {Math.round(result.elapsedMs / 1000)}s ·{" "}
                {CATEGORY_LABELS[result.category]}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void tryOn(Math.floor(Math.random() * 2 ** 31))}
                >
                  <RefreshCw className="size-3.5" />
                  Try again
                </Button>
                <Button size="sm" onClick={download}>
                  <Download className="size-3.5" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        ) : phase === "error" ? (
          <div role="alert" className="max-w-sm space-y-4 text-center">
            <AlertCircle className="mx-auto size-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void tryOn()}>
              <RefreshCw className="size-3.5" />
              Try again
            </Button>
          </div>
        ) : busy ? (
          <div className="space-y-3 text-center" aria-live="polite">
            <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" />
            <p className="font-display text-xl">{statusText}</p>
            {phase === "generating" ? (
              <p className="text-xs text-muted-foreground">
                {elapsed}s — usually 15–30s, longer if the free GPU queue is busy
              </p>
            ) : null}
          </div>
        ) : (
          <p className="max-w-xs text-center text-sm text-muted-foreground">
            Your generated look will appear here.
          </p>
        )}
      </div>
    </section>
  );
}
