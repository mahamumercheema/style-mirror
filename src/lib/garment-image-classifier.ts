/**
 * Fallback garment categoriser: zero-shot CLIP (openai/clip-vit-base-patch32, MIT) run in the
 * browser with transformers.js — free, no account or token. Only used when the product's
 * text doesn't name the garment. The quantized model (~154 MB) downloads once and is cached.
 */
import type { GarmentCategory } from "./garment-category";

const MODEL_ID = "Xenova/clip-vit-base-patch32";

/** Several phrasings per category; scores are summed per category. */
const PROMPTS: Record<GarmentCategory, string[]> = {
  upper_body: [
    "a product photo of a shirt or top",
    "a product photo of a jacket or coat",
    "a product photo of a sweater or hoodie",
    "a person wearing a top, cropped at the waist",
  ],
  lower_body: [
    "a product photo of trousers or jeans",
    "a product photo of a skirt",
    "a product photo of shorts",
    "a person wearing trousers, shown from the waist down",
  ],
  dresses: [
    "a product photo of a dress",
    "a product photo of a jumpsuit",
    "a matching two-piece outfit set",
    "a person wearing a full-length dress or outfit",
  ],
};

export type ImageCategoryResult = {
  category: GarmentCategory;
  /** Share of the total score for the winning category (0–1) */
  confidence: number;
  scores: Record<GarmentCategory, number>;
};

type ZeroShot = (
  image: string,
  labels: string[],
) => Promise<Array<{ label: string; score: number }>>;

let classifierPromise: Promise<ZeroShot> | null = null;

function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      return (await pipeline("zero-shot-image-classification", MODEL_ID, {
        dtype: "q8",
      })) as unknown as ZeroShot;
    })().catch((error) => {
      classifierPromise = null;
      throw error;
    });
  }
  return classifierPromise;
}

/** Below this share the image is ambiguous and the user should confirm the category. */
export const CONFIDENT_IMAGE_SHARE = 0.55;

export async function classifyGarmentImage(imageUrl: string): Promise<ImageCategoryResult> {
  const classify = await getClassifier();
  const labels = Object.values(PROMPTS).flat();
  const results = await classify(imageUrl, labels);
  const scores: Record<GarmentCategory, number> = { upper_body: 0, lower_body: 0, dresses: 0 };
  for (const { label, score } of results) {
    const category = (Object.keys(PROMPTS) as GarmentCategory[]).find((c) =>
      PROMPTS[c].includes(label),
    );
    if (category) scores[category] += score;
  }
  const total = scores.upper_body + scores.lower_body + scores.dresses || 1;
  const [category, best] = (Object.entries(scores) as Array<[GarmentCategory, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0]!;
  return { category, confidence: best / total, scores };
}
