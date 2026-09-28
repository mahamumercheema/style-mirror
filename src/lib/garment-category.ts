/**
 * Decides which Leffa garment mode fits a product: upper body, lower body, or a full
 * dress/outfit. Uses the product's own text first; callers fall back to image analysis
 * (garment-image-classifier.ts) and finally to asking the user.
 */
export type GarmentCategory = "upper_body" | "lower_body" | "dresses";

export type CategorySource = "closet" | "shop category" | "title" | "link" | "description";

export type CategoryGuess = {
  category: GarmentCategory;
  source: CategorySource;
  /** The word(s) that decided it, for showing the user why */
  evidence: string;
};

export const CATEGORY_LABELS: Record<GarmentCategory, string> = {
  upper_body: "Top",
  lower_body: "Bottom",
  dresses: "Dress / full outfit",
};

// Western and South Asian terms. Multi-word terms are matched before single words.
const TERMS: Record<GarmentCategory, string[]> = {
  upper_body: [
    "t-shirt",
    "t shirt",
    "tshirt",
    "tee",
    "shirt",
    "top",
    "blouse",
    "jacket",
    "blazer",
    "coat",
    "overcoat",
    "trench",
    "parka",
    "puffer",
    "cardigan",
    "sweater",
    "jumper",
    "hoodie",
    "sweatshirt",
    "pullover",
    "vest",
    "waistcoat",
    "polo",
    "tank",
    "camisole",
    "cami",
    "tunic",
    "kurta",
    "kurti",
    "kameez",
    "choli",
    "shrug",
    "bomber",
    "gilet",
    "windbreaker",
    "bodysuit",
    "crop top",
    "henley",
  ],
  lower_body: [
    "trousers",
    "trouser",
    "pants",
    "pant",
    "jeans",
    "shorts",
    "skirt",
    "leggings",
    "legging",
    "joggers",
    "jogger",
    "sweatpants",
    "chinos",
    "chino",
    "culottes",
    "palazzo",
    "palazzos",
    "shalwar",
    "salwar",
    "churidar",
    "capri",
    "capris",
    "cargos",
    "tights",
    "bottoms",
  ],
  dresses: [
    "dress",
    "gown",
    "frock",
    "jumpsuit",
    "romper",
    "playsuit",
    "overalls",
    "dungarees",
    "saree",
    "sari",
    "lehenga",
    "anarkali",
    "abaya",
    "kaftan",
    "caftan",
    "co-ord",
    "co ord",
    "coord",
    "two-piece",
    "two piece",
    "2-piece",
    "2 piece",
    "three-piece",
    "three piece",
    "3-piece",
    "3 piece",
    "suit",
    "tracksuit",
    "set",
    "outfit",
    "sharara",
    "gharara",
    "shalwar kameez",
    "salwar kameez",
  ],
};

type Match = { category: GarmentCategory; term: string; index: number };

function findTerms(text: string): Match[] {
  const lower = ` ${text.toLowerCase().replace(/[_/|]+/g, " ")} `;
  const matches: Match[] = [];
  const taken: Array<[number, number]> = [];
  const all = (Object.entries(TERMS) as Array<[GarmentCategory, string[]]>)
    .flatMap(([category, terms]) => terms.map((term) => ({ category, term })))
    .sort((a, b) => b.term.length - a.term.length); // longest first: "crop top" before "top"
  for (const { category, term } of all) {
    const pattern = new RegExp(`(?<![a-z])${term.replace(/[-\s]/g, "[-\\s]?")}s?(?![a-z])`, "g");
    for (const m of lower.matchAll(pattern)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (taken.some(([s, e]) => start < e && end > s)) continue;
      taken.push([start, end]);
      matches.push({ category, term, index: start });
    }
  }
  return matches.sort((a, b) => a.index - b.index);
}

/**
 * Classifies one piece of text:
 * - "shalwar kameez", "kurta with trousers": a top and a bottom named together → full outfit
 * - otherwise the last garment word wins ("shirt dress" → dress, "dress shirt" → shirt)
 */
export function classifyText(text: string): { category: GarmentCategory; evidence: string } | null {
  const matches = findTerms(text);
  if (matches.length === 0) return null;
  const upper = matches.find((m) => m.category === "upper_body");
  const lowerMatch = matches.find((m) => m.category === "lower_body");
  const full = matches.find((m) => m.category === "dresses");
  if (upper && lowerMatch && !full) {
    return { category: "dresses", evidence: `${upper.term} + ${lowerMatch.term}` };
  }
  const last = matches[matches.length - 1]!;
  return { category: last.category, evidence: last.term };
}

/** Words from the product link's path, e.g. ".../products/casual-suit-e8318" → "casual suit e8318" */
function linkWords(sourceUrl: string | null | undefined) {
  if (!sourceUrl) return "";
  try {
    return decodeURIComponent(new URL(sourceUrl).pathname).replace(/[-_/.]+/g, " ");
  } catch {
    return "";
  }
}

/** First sentence only: later sentences are often styling tips ("pair it with jeans"). */
function firstSentence(text: string | null | undefined) {
  return (text ?? "").split(/(?<=[.!?])\s/)[0] ?? "";
}

const CLOSET_TYPES: Record<string, GarmentCategory> = {
  Tops: "upper_body",
  Bottoms: "lower_body",
  "Full Body / Ethnic Set": "dresses",
  "Full-Body / Ethnic": "dresses",
};

export function guessCategoryFromProduct(product: {
  title?: string | null | undefined;
  description?: string | null | undefined;
  productCategory?: string | null | undefined;
  sourceUrl?: string | null | undefined;
  closetParentType?: string | null | undefined;
}): CategoryGuess | null {
  const closet = product.closetParentType ? CLOSET_TYPES[product.closetParentType] : undefined;
  if (closet) return { category: closet, source: "closet", evidence: product.closetParentType! };

  const sources: Array<[CategorySource, string]> = [
    ["shop category", product.productCategory ?? ""],
    ["title", product.title ?? ""],
    ["link", linkWords(product.sourceUrl)],
    ["description", firstSentence(product.description)],
  ];
  for (const [source, text] of sources) {
    const result = text ? classifyText(text) : null;
    if (result) return { ...result, source };
  }
  return null;
}
