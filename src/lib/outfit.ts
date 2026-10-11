/**
 * Outfit data for the "Add garments" cards: up to four labelled garments sent to the try-on
 * together, and the order Leffa dresses them in. Leffa puts on one garment per run, so each layer is a run on
 * top of the previous result.
 */
import type { GarmentCategory } from "./garment-category";

export type OutfitSlot = "top" | "pants" | "jacket" | "sweater";

/** Card order */
export const OUTFIT_SLOTS: OutfitSlot[] = ["top", "pants", "jacket", "sweater"];

export const OUTFIT_SLOT_LABELS: Record<OutfitSlot, string> = {
  top: "Top",
  pants: "Pants",
  jacket: "Jacket",
  sweater: "Sweater",
};

/**
 * One garment as the try-on receives it: an uploaded photo, or a product link with the
 * image read from its page (null when the page couldn't be read).
 */
export type OutfitItem =
  | { type: "image"; src: string; name?: string }
  | { type: "link"; src: string; imageDataUrl: string | null; title?: string };

/** The structured message the Try on button sends, e.g. { top: {type, src}, pants: {...} } */
export type OutfitPayload = Partial<Record<OutfitSlot, OutfitItem>>;

/** The image to try on for an item, if it has one */
export function itemImage(item: OutfitItem) {
  return item.type === "image" ? item.src : item.imageDataUrl;
}

export function linkDomain(url: string) {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Body outward: Pants (independent), then Top → Sweater → Jacket, so a sweater always goes
 * on before (under) a jacket.
 */
export const LAYER_ORDER: Array<{ slot: OutfitSlot; category: GarmentCategory }> = [
  { slot: "pants", category: "lower_body" },
  { slot: "top", category: "upper_body" },
  { slot: "sweater", category: "upper_body" },
  { slot: "jacket", category: "upper_body" },
];

/** Each layer is a separate run on the free GPU (about 3 minutes of the daily allowance). */
export const MAX_OUTFIT_LAYERS = 2;

export type OutfitLayer = { slot: OutfitSlot; category: GarmentCategory; image: string };
export type SkippedItem = { slot: OutfitSlot; reason: "no-image" | "layer-limit" };

/** Which items get rendered, in what order, and which don't (and why). */
export function planOutfitLayers(payload: OutfitPayload, maxLayers = MAX_OUTFIT_LAYERS) {
  const layers: OutfitLayer[] = [];
  const skipped: SkippedItem[] = [];
  for (const { slot, category } of LAYER_ORDER) {
    const item = payload[slot];
    if (!item) continue;
    const image = itemImage(item);
    if (!image) skipped.push({ slot, reason: "no-image" });
    else if (layers.length >= maxLayers) skipped.push({ slot, reason: "layer-limit" });
    else layers.push({ slot, category, image });
  }
  return { layers, skipped };
}

export const SKIP_REASONS: Record<SkippedItem["reason"], string> = {
  "no-image": "no image could be read from its link",
  "layer-limit": `try-on is limited to ${MAX_OUTFIT_LAYERS} layers per look`,
};

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Null when the file is usable, otherwise why not */
export function checkImageFile(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "Use a JPG, PNG or WebP image.";
  if (file.size > MAX_UPLOAD_BYTES) return "That image is over 10 MB.";
  return null;
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}
