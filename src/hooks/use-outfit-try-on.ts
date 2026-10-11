import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { cropToPhoto, prepareImage, preparePerson, type TryOnPhase } from "@/hooks/use-ai-try-on";
import {
  MAX_OUTFIT_LAYERS,
  OUTFIT_SLOT_LABELS,
  planOutfitLayers,
  type OutfitPayload,
  type OutfitSlot,
  type SkippedItem,
} from "@/lib/outfit";
import { generateTryOn } from "@/lib/tryon.functions";

/** One sent outfit and how its try-on went, newest first in the history */
export type OutfitLook = {
  id: number;
  payload: OutfitPayload;
  /** Rendered slots, in the order they were put on */
  layers: OutfitSlot[];
  skipped: SkippedItem[];
  status: "working" | "done" | "error";
  resultDataUrl: string | null;
  elapsedMs: number;
};

let nextLookId = 1;

/**
 * Outfit try-on: dresses the person photo in each layer in turn (body outward), each
 * run starting from the previous run's result, and keeps a history of the looks sent.
 */
export function useOutfitTryOn(
  personPhoto: string,
  /** Layers rendered per look; extra items are listed as skipped */
  { maxLayers = MAX_OUTFIT_LAYERS }: { maxLayers?: number } = {},
) {
  const runTryOn = useServerFn(generateTryOn);
  const [phase, setPhase] = useState<TryOnPhase>("idle");
  const [looks, setLooks] = useState<OutfitLook[]>([]);
  /** The look shown in the photo frame */
  const [shownId, setShownId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState<{ step: number; total: number; slot: OutfitSlot }>();

  useEffect(() => {
    setPhase("idle");
    setShownId(null);
    setError(null);
  }, [personPhoto]);

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
  const updateLook = (id: number, patch: Partial<OutfitLook>) =>
    setLooks((current) => current.map((look) => (look.id === id ? { ...look, ...patch } : look)));

  const run = async (id: number, payload: OutfitPayload, seed: number) => {
    const { layers } = planOutfitLayers(payload, maxLayers);
    if (layers.length === 0) return;
    setError(null);
    setShownId(id);
    setPhase("preparing");
    updateLook(id, { status: "working" });
    const started = Date.now();
    try {
      const person = await preparePerson(personPhoto);
      // Leffa returns the full padded frame, which feeds straight into the next layer
      let current = person.dataUrl;
      for (const [index, layer] of layers.entries()) {
        setProgress({ step: index + 1, total: layers.length, slot: layer.slot });
        setPhase("preparing");
        const garmentImage = await prepareImage(layer.image);
        setPhase("generating");
        const generated = await runTryOn({
          data: { personImage: current, garmentImage, category: layer.category, seed },
        });
        current = generated.imageDataUrl;
      }
      updateLook(id, {
        status: "done",
        resultDataUrl: await cropToPhoto(current, person.photoRect),
        elapsedMs: Date.now() - started,
      });
      setPhase("done");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The try-on failed. Please try again.");
      updateLook(id, { status: "error" });
      setPhase("error");
    } finally {
      setProgress(undefined);
    }
  };

  /** Sends an outfit: adds it to the history and starts its try-on */
  const send = async (payload: OutfitPayload) => {
    if (busy) return;
    const { layers, skipped } = planOutfitLayers(payload, maxLayers);
    const look: OutfitLook = {
      id: nextLookId++,
      payload,
      layers: layers.map((layer) => layer.slot),
      skipped,
      status: layers.length > 0 ? "working" : "done",
      resultDataUrl: null,
      elapsedMs: 0,
    };
    setLooks((current) => [look, ...current]);
    await run(look.id, payload, 42);
  };

  const shown = looks.find((look) => look.id === shownId) ?? null;

  const show = (id: number) => {
    if (busy) return;
    const look = looks.find((candidate) => candidate.id === id);
    if (!look) return;
    setShownId(id);
    setError(look.status === "error" ? "This look's try-on failed. Please try again." : null);
    setPhase(look.status === "error" ? "error" : look.resultDataUrl ? "done" : "idle");
  };

  /** Re-runs the shown look (a new seed gives a different result) */
  const tryOn = async (seed = 42) => {
    if (!shown || busy) return;
    await run(shown.id, shown.payload, seed);
  };

  const download = () => {
    if (!shown?.resultDataUrl) return;
    const link = document.createElement("a");
    link.download = `atelier-ora-look-${shown.layers.join("-")}.png`;
    link.href = shown.resultDataUrl;
    link.click();
  };

  const resultLabel = shown
    ? shown.layers.map((slot) => OUTFIT_SLOT_LABELS[slot]).join(" + ")
    : null;

  const statusText = !progress
    ? null
    : `${progress.total > 1 ? `Layer ${progress.step} of ${progress.total}: ` : ""}${
        phase === "preparing" ? "preparing" : "fitting"
      } the ${OUTFIT_SLOT_LABELS[progress.slot].toLowerCase()}...`;

  return {
    personPhoto,
    phase,
    looks,
    shownId,
    result:
      shown?.status === "done" && shown.resultDataUrl
        ? { imageDataUrl: shown.resultDataUrl, elapsedMs: shown.elapsedMs }
        : null,
    resultLabel,
    resultAlt: resultLabel ? `You wearing the look: ${resultLabel}` : "Your look",
    error,
    elapsed,
    busy,
    statusText: statusText ? statusText[0]!.toUpperCase() + statusText.slice(1) : null,
    send,
    show,
    tryOn,
    download,
  };
}

export type OutfitTryOn = ReturnType<typeof useOutfitTryOn>;
