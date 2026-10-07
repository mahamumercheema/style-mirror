import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { useGarmentCategory } from "@/hooks/use-garment-category";
import type { ProductPreview } from "@/lib/product.functions";
import { generateTryOn, type TryOnResult } from "@/lib/tryon.functions";

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

/**
 * Leffa try-on state for a person photo and garment: category detection, generation and
 * download. The step's layout composes the pieces below (button, frame, type picker).
 */
export function useAiTryOn(personPhoto: string, garment: ProductPreview | null) {
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
    if (!garment || !category || busy) return;
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
    if (!result || !garment) return;
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

  return {
    garment,
    personPhoto,
    detected,
    category,
    phase,
    result,
    error,
    elapsed,
    busy,
    statusText,
    tryOn,
    download,
  };
}

export type AiTryOn = ReturnType<typeof useAiTryOn>;
