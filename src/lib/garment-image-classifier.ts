/**
 * Zero-shot CLIP (openai/clip-vit-base-patch32, MIT) run in the browser with transformers.js —
 * free, no account or token. Categorises a garment when the product's text doesn't name it, and
 * picks the best try-on photo from a shop page. The quantized text and vision models (~154 MB
 * together) download once and are cached; text prompts and images are each embedded once.
 */
import type { GarmentCategory } from "./garment-category";

const MODEL_ID = "Xenova/clip-vit-base-patch32";
/** CLIP's learned temperature: cosine similarity × 100 gives the zero-shot logits */
const LOGIT_SCALE = 100;

/** Several phrasings per category; probabilities are summed per category. */
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

type Embedder = {
  embedTexts: (texts: string[]) => Promise<number[][]>;
  embedImages: (imageUrls: string[]) => Promise<number[][]>;
};

let embedderPromise: Promise<Embedder> | null = null;

function normalise(data: ArrayLike<number>, start: number, size: number) {
  const vector = Array.from({ length: size }, (_, i) => Number(data[start + i]));
  const norm = Math.hypot(...vector) || 1;
  return vector.map((value) => value / norm);
}

function rows(tensor: { data: ArrayLike<number>; dims: number[] }) {
  const [count, size] = tensor.dims as [number, number];
  return Array.from({ length: count }, (_, row) => normalise(tensor.data, row * size, size));
}

function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const {
        AutoProcessor,
        AutoTokenizer,
        CLIPTextModelWithProjection,
        CLIPVisionModelWithProjection,
        RawImage,
      } = await import("@huggingface/transformers");
      const [tokenizer, textModel, processor, visionModel] = await Promise.all([
        AutoTokenizer.from_pretrained(MODEL_ID),
        CLIPTextModelWithProjection.from_pretrained(MODEL_ID, { dtype: "q8" }),
        AutoProcessor.from_pretrained(MODEL_ID),
        CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, { dtype: "q8" }),
      ]);
      const textCache = new Map<string, number[]>();
      return {
        embedTexts: async (texts) => {
          const missing = texts.filter((text) => !textCache.has(text));
          if (missing.length > 0) {
            const inputs = tokenizer(missing, { padding: true, truncation: true });
            const { text_embeds } = await textModel(inputs);
            rows(text_embeds).forEach((vector, i) => textCache.set(missing[i]!, vector));
          }
          return texts.map((text) => textCache.get(text)!);
        },
        embedImages: async (imageUrls) => {
          const images = await Promise.all(imageUrls.map((url) => RawImage.read(url)));
          const { image_embeds } = await visionModel(await processor(images));
          return rows(image_embeds);
        },
      } satisfies Embedder;
    })().catch((error) => {
      embedderPromise = null;
      throw error;
    });
  }
  return embedderPromise;
}

/** Starts downloading the model in the background so the first ranking is quick. */
export function preloadGarmentModel() {
  void getEmbedder().catch(() => {});
}

/** Zero-shot probabilities of one image over a set of prompt embeddings */
function softmaxOver(image: number[], prompts: number[][]) {
  const logits = prompts.map(
    (prompt) => LOGIT_SCALE * prompt.reduce((sum, value, i) => sum + value * image[i]!, 0),
  );
  const max = Math.max(...logits);
  const exps = logits.map((logit) => Math.exp(logit - max));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

/** Below this share the image is ambiguous and the user should confirm the category. */
export const CONFIDENT_IMAGE_SHARE = 0.55;

export async function classifyGarmentImage(imageUrl: string): Promise<ImageCategoryResult> {
  const { embedTexts, embedImages } = await getEmbedder();
  const categories = Object.keys(PROMPTS) as GarmentCategory[];
  const labels = categories.flatMap((category) => PROMPTS[category]);
  const [[image], prompts] = await Promise.all([embedImages([imageUrl]), embedTexts(labels)]);
  const probabilities = softmaxOver(image!, prompts);
  const scores: Record<GarmentCategory, number> = { upper_body: 0, lower_body: 0, dresses: 0 };
  labels.forEach((label, i) => {
    const category = categories.find((c) => PROMPTS[c].includes(label))!;
    scores[category] += probabilities[i]!;
  });
  const [category, best] = (Object.entries(scores) as Array<[GarmentCategory, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0]!;
  return { category, confidence: best, scores };
}

/**
 * What makes a good try-on photo, as independent questions. Each is a small zero-shot choice
 * whose options carry a weight (1 = ideal); a photo's score is the product of its answers, so
 * one bad trait (back view, close-up, size chart) sinks it.
 */
const TRY_ON_QUESTIONS: Array<Array<[prompt: string, weight: number]>> = [
  // Which way it faces
  [
    ["a photo of clothing seen from the front", 1],
    ["a photo of clothing seen from the back", 0.1],
    ["a photo of a person turned to the side", 0.35],
  ],
  // Whether the whole garment is in frame
  [
    ["a photo showing the entire garment from neckline to hem", 1],
    ["a close-up photo showing only part of the garment, cropped", 0.3],
    ["a close-up of fabric texture, embroidery or a button", 0.1],
  ],
  // What else is in the picture
  [
    ["a garment on its own against a plain background, no person", 1],
    ["a model standing still against a plain studio background", 0.8],
    ["a lifestyle photo of a person in a room or outdoors", 0.4],
    ["a person sitting or posing with props", 0.4],
  ],
  // Whether it is a clothing photo at all
  [
    ["a photo of clothing", 1],
    ["a size chart, text or a logo", 0.05],
    ["shoes, a bag or jewellery", 0.2],
  ],
];

/** Try-on suitability per image (0–1, higher is better), in the order given. */
export async function scoreTryOnImages(imageUrls: string[]): Promise<number[]> {
  const { embedTexts, embedImages } = await getEmbedder();
  const [images, questions] = await Promise.all([
    embedImages(imageUrls),
    Promise.all(TRY_ON_QUESTIONS.map((options) => embedTexts(options.map(([prompt]) => prompt)))),
  ]);
  return images.map((image) =>
    TRY_ON_QUESTIONS.reduce((score, options, q) => {
      const probabilities = softmaxOver(image, questions[q]!);
      return score * options.reduce((sum, [, weight], i) => sum + weight * probabilities[i]!, 0);
    }, 1),
  );
}
