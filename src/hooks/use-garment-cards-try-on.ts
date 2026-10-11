import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import type { GarmentUploads } from "@/components/GarmentUploadCards";
import { useOutfitTryOn } from "@/hooks/use-outfit-try-on";
import { LAYER_ORDER, OUTFIT_SLOTS, type OutfitItem, type OutfitPayload } from "@/lib/outfit";
import { fetchProductPreview } from "@/lib/product.functions";

/** The cards as an outfit; links carry no image until their pages are read */
function cardsToPayload(garments: GarmentUploads): OutfitPayload {
  const payload: OutfitPayload = {};
  for (const slot of OUTFIT_SLOTS) {
    const value = garments[slot];
    if (typeof value === "string") payload[slot] = { type: "image", src: value };
    else if (value) payload[slot] = { type: "link", src: value.src, imageDataUrl: null };
  }
  return payload;
}

/**
 * Try-on for the "Add garments" cards: the person photo plus every filled card, each sent as
 * its own category and layered body outward (top → sweater → jacket; pants separately). Every
 * filled card is rendered, one free-GPU run per garment.
 */
export function useGarmentCardsTryOn(personPhoto: string, garments: GarmentUploads) {
  const outfit = useOutfitTryOn(personPhoto, { maxLayers: Infinity });
  const getPreview = useServerFn(fetchProductPreview);
  const [readingLinks, setReadingLinks] = useState(false);
  /** Product photos already read from links, by URL */
  const linkImages = useRef(new Map<string, string | null>());

  const payload = useMemo(() => cardsToPayload(garments), [garments]);
  const filled = OUTFIT_SLOTS.filter((slot) => payload[slot]);
  /** Slots that will be dressed, in order (links count until their page turns out unreadable) */
  const layers = LAYER_ORDER.map((layer) => layer.slot).filter((slot) => payload[slot]);

  const start = async () => {
    if (outfit.busy || readingLinks || layers.length === 0) return;
    setReadingLinks(true);
    const resolved: OutfitPayload = {};
    try {
      // Product pages are read by our own server: browsers can't read other shops' pages
      await Promise.all(
        filled.map(async (slot) => {
          const item = payload[slot]!;
          let ready: OutfitItem = item;
          if (item.type === "link") {
            if (!linkImages.current.has(item.src)) {
              const image = await getPreview({ data: { url: item.src } })
                .then((preview) => preview.imageDataUrl)
                .catch(() => null);
              linkImages.current.set(item.src, image);
            }
            ready = { ...item, imageDataUrl: linkImages.current.get(item.src) ?? null };
          }
          resolved[slot] = ready;
        }),
      );
    } finally {
      setReadingLinks(false);
    }
    await outfit.send(resolved);
  };

  return {
    ...outfit,
    payload,
    filled,
    layers,
    start,
    busy: outfit.busy || readingLinks,
    phase: readingLinks ? ("preparing" as const) : outfit.phase,
    statusText: readingLinks ? "Reading your product links..." : outfit.statusText,
  };
}

export type GarmentCardsTryOn = ReturnType<typeof useGarmentCardsTryOn>;
