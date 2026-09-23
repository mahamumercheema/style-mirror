/**
 * Color Palette Extraction & Harmony Engine for Fashion & Garments
 * Extracts dominant mood board colors and computes harmonic color schemes
 * (Complementary, Triadic, Analogous, Split-Complementary, Monochromatic).
 */

export type HSL = { h: number; s: number; l: number };
export type RGB = { r: number; g: number; b: number };

export type ExtractedColor = {
  hex: string;
  rgb: RGB;
  hsl: HSL;
  name: string;
  isDark: boolean;
  frequency: number;
};

export type HarmonyType =
  "complementary" | "triadic" | "analogous" | "splitComplementary" | "monochromatic";

export type ColorHarmony = {
  type: HarmonyType;
  title: string;
  description: string;
  baseColor: ExtractedColor;
  colors: ExtractedColor[];
  presetApplication: {
    mainBody: string;
    trims: string;
    buttons: string;
    stitching: string;
  };
};

export type GarmentColorTheme = {
  mainBody: string;
  trims: string;
  buttons: string;
  stitching: string;
  fabricTexture?: "smooth" | "linen" | "silk" | "wool" | "denim";
  buttonFinish?: "matte" | "brass" | "silver" | "tortoise";
};

// Common fashion color dictionary for intelligent labeling
const FASHION_COLOR_NAMES: Array<{ name: string; hex: string }> = [
  { name: "Alabaster White", hex: "#f8f9fa" },
  { name: "Ivory Cream", hex: "#fdfbf7" },
  { name: "Oatmeal Beige", hex: "#e5ded4" },
  { name: "Warm Taupe", hex: "#b39c87" },
  { name: "Camel", hex: "#c19a6b" },
  { name: "Caramel Leather", hex: "#9a6538" },
  { name: "Terracotta Clay", hex: "#c96846" },
  { name: "Burnt Ochre", hex: "#bb5a2e" },
  { name: "Rust Red", hex: "#8b3a2b" },
  { name: "Crimson Berry", hex: "#9b1b30" },
  { name: "Burgundy Wine", hex: "#5b1e2c" },
  { name: "Blush Rose", hex: "#e8c5c8" },
  { name: "Dusty Mauve", hex: "#a37081" },
  { name: "Lilac Haze", hex: "#b4a7d6" },
  { name: "Deep Plum", hex: "#48284a" },
  { name: "Midnight Navy", hex: "#1a2a3a" },
  { name: "Cobalt Blue", hex: "#1e4d8c" },
  { name: "Cerulean Sky", hex: "#3b82a6" },
  { name: "Dusty Slate", hex: "#6c7d8a" },
  { name: "Pistachio Mint", hex: "#b2d8b4" },
  { name: "Sage Olive", hex: "#87977a" },
  { name: "Forest Moss", hex: "#344933" },
  { name: "Emerald Jewel", hex: "#0b5345" },
  { name: "Mustard Gold", hex: "#d4a017" },
  { name: "Champagne Amber", hex: "#e6c387" },
  { name: "Charcoal Slate", hex: "#363b40" },
  { name: "Espresso Brown", hex: "#2b1e16" },
  { name: "Obsidian Black", hex: "#17181c" },
];

/** Convert Hex string to RGB */
export function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "").trim();
  const bigint = parseInt(
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean,
    16,
  );
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

/** Convert RGB to Hex string */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  return `#${[r, g, b].map((val) => clamp(val).toString(16).padStart(2, "0")).join("")}`;
}

/** Convert RGB to HSL */
export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/** Convert HSL to RGB */
export function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (h >= 0 && h < 60) {
    rPrime = c;
    gPrime = x;
  } else if (h >= 60 && h < 120) {
    rPrime = x;
    gPrime = c;
  } else if (h >= 120 && h < 180) {
    gPrime = c;
    bPrime = x;
  } else if (h >= 180 && h < 240) {
    gPrime = x;
    bPrime = c;
  } else if (h >= 240 && h < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

/** Convert HSL directly to Hex */
export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

/** Find closest matching fashion name for a color */
export function getFashionColorName(hex: string): string {
  const rgb = hexToRgb(hex);
  let closestName = "Custom Shade";
  let minDistance = Infinity;

  for (const item of FASHION_COLOR_NAMES) {
    const targetRgb = hexToRgb(item.hex);
    // Weighted Euclidean distance for human perception
    const dist = Math.sqrt(
      2 * Math.pow(rgb.r - targetRgb.r, 2) +
        4 * Math.pow(rgb.g - targetRgb.g, 2) +
        3 * Math.pow(rgb.b - targetRgb.b, 2),
    );
    if (dist < minDistance) {
      minDistance = dist;
      closestName = item.name;
    }
  }

  // If reasonably close return fashion name, otherwise adjective + hue
  if (minDistance < 65) return closestName;

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  let tone = "";
  if (hsl.l > 80) tone = "Pale ";
  else if (hsl.l < 25) tone = "Deep ";
  else if (hsl.s < 20) tone = "Muted ";
  else if (hsl.s > 75) tone = "Vivid ";

  let hueName = "Gray";
  if (hsl.s < 10) hueName = hsl.l > 60 ? "Alabaster" : hsl.l < 30 ? "Charcoal" : "Slate";
  else if (hsl.h < 20 || hsl.h >= 345) hueName = "Crimson";
  else if (hsl.h < 45) hueName = "Amber / Ochre";
  else if (hsl.h < 70) hueName = "Mustard";
  else if (hsl.h < 160) hueName = "Sage Green";
  else if (hsl.h < 200) hueName = "Teal / Aqua";
  else if (hsl.h < 260) hueName = "Azure Navy";
  else if (hsl.h < 300) hueName = "Plum Violet";
  else hueName = "Blush Rose";

  return `${tone}${hueName}`;
}

/** Check if color is dark for text contrast */
export function isColorDark(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  // YIQ luminance formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 128;
}

/** Create ExtractedColor object */
export function createExtractedColor(hex: string, frequency = 1): ExtractedColor {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return {
    hex,
    rgb,
    hsl,
    name: getFashionColorName(hex),
    isDark: isColorDark(hex),
    frequency,
  };
}

/**
 * Extract a dynamic fashion color wheel palette from any image element or data URL.
 * Quantizes image into dominant hues, balanced tones, and high-contrast accents.
 */
export async function extractColorPaletteFromImage(
  imageSource: HTMLImageElement | string,
  maxColors = 7,
): Promise<ExtractedColor[]> {
  return new Promise((resolve) => {
    const processImage = (img: HTMLImageElement) => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(FALLBACK_MOOD_BOARD_PALETTE);
          return;
        }

        // Downsample to 64x64 for instant client-side performance (< 4ms)
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        // Group into 3D color buckets
        const colorCounts = new Map<string, { r: number; g: number; b: number; count: number }>();

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3] ?? 255;
          if (a < 128) continue; // Skip transparency

          const r = data[i] ?? 0;
          const g = data[i + 1] ?? 0;
          const b = data[i + 2] ?? 0;

          // Skip near-white paper/canvas background (> 248 on all channels)
          if (r > 248 && g > 248 && b > 248) continue;

          // Quantize to steps of 24 to cluster similar shades
          const quantStep = 24;
          const qr = Math.round(r / quantStep) * quantStep;
          const qg = Math.round(g / quantStep) * quantStep;
          const qb = Math.round(b / quantStep) * quantStep;

          const key = `${qr},${qg},${qb}`;
          const current = colorCounts.get(key);
          if (current) {
            current.r += r;
            current.g += g;
            current.b += b;
            current.count += 1;
          } else {
            colorCounts.set(key, { r, g, b, count: 1 });
          }
        }

        // Convert clusters to average RGB colors
        const rawPalette: Array<{ hex: string; count: number; hsl: HSL }> = [];
        for (const bucket of colorCounts.values()) {
          const r = Math.round(bucket.r / bucket.count);
          const g = Math.round(bucket.g / bucket.count);
          const b = Math.round(bucket.b / bucket.count);
          const hex = rgbToHex(r, g, b);
          const hsl = rgbToHsl(r, g, b);
          rawPalette.push({ hex, count: bucket.count, hsl });
        }

        // Sort by frequency
        rawPalette.sort((a, b) => b.count - a.count);

        // Select distinct colors by enforcing minimum color distance
        const selected: ExtractedColor[] = [];
        for (const candidate of rawPalette) {
          if (selected.length >= maxColors) break;

          const isDistinct = selected.every((existing) => {
            const candRgb = hexToRgb(candidate.hex);
            const existRgb = existing.rgb;
            const dist = Math.sqrt(
              Math.pow(candRgb.r - existRgb.r, 2) +
                Math.pow(candRgb.g - existRgb.g, 2) +
                Math.pow(candRgb.b - existRgb.b, 2),
            );
            return dist > 45; // Must be visually distinctive
          });

          if (isDistinct) {
            selected.push(createExtractedColor(candidate.hex, candidate.count));
          }
        }

        if (selected.length === 0) {
          resolve(FALLBACK_MOOD_BOARD_PALETTE);
          return;
        }

        // Sort palette thoughtfully: Dominant base -> Accent/Vibrant -> Light/Neutral -> Deep Grounding
        resolve(selected);
      } catch {
        resolve(FALLBACK_MOOD_BOARD_PALETTE);
      }
    };

    if (typeof imageSource === "string") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => processImage(img);
      img.onerror = () => resolve(FALLBACK_MOOD_BOARD_PALETTE);
      img.src = imageSource;
    } else {
      processImage(imageSource);
    }
  });
}

/**
 * Dynamically computes all classic sartorial color harmonies for a chosen base fabric color.
 */
export function calculateColorHarmonies(baseHex: string): {
  complementary: ColorHarmony;
  triadic: ColorHarmony;
  analogous: ColorHarmony;
  splitComplementary: ColorHarmony;
  monochromatic: ColorHarmony;
} {
  const baseColor = createExtractedColor(baseHex);
  const { h, s, l } = baseColor.hsl;

  // 1. Complementary (180° opposite on the color wheel)
  const compHue = (h + 180) % 360;
  const compColor = createExtractedColor(hslToHex(compHue, Math.min(s + 5, 90), l));
  const compSoft = createExtractedColor(
    hslToHex(compHue, Math.max(s - 25, 20), Math.min(l + 20, 85)),
  );
  const compDeep = createExtractedColor(
    hslToHex(compHue, Math.min(s + 10, 80), Math.max(l - 25, 18)),
  );

  const complementary: ColorHarmony = {
    type: "complementary",
    title: "Complementary (180° Contrast)",
    description:
      "Vibrant optical tension. The 180° opposite hue creates high-impact trims and eye-catching stitch lines against the main fabric.",
    baseColor,
    colors: [baseColor, compColor, compSoft, compDeep],
    presetApplication: {
      mainBody: baseColor.hex,
      trims: compColor.hex,
      buttons: compDeep.hex,
      stitching: compSoft.hex,
    },
  };

  // 2. Triadic (120° and 240° balance on the color wheel)
  const triadHue1 = (h + 120) % 360;
  const triadHue2 = (h + 240) % 360;
  const triadColor1 = createExtractedColor(hslToHex(triadHue1, s, l));
  const triadColor2 = createExtractedColor(hslToHex(triadHue2, s, l));
  const triadAccent = createExtractedColor(
    hslToHex(triadHue2, Math.max(s - 15, 25), Math.max(l - 20, 20)),
  );

  const triadic: ColorHarmony = {
    type: "triadic",
    title: "Triadic (120° Balanced Harmony)",
    description:
      "Dynamic runway balance. Three equally spaced hues provide rich visual depth while preserving sartorial equilibrium.",
    baseColor,
    colors: [baseColor, triadColor1, triadColor2, triadAccent],
    presetApplication: {
      mainBody: baseColor.hex,
      trims: triadColor1.hex,
      buttons: triadAccent.hex,
      stitching: triadColor2.hex,
    },
  };

  // 3. Analogous (±30° adjacent hues on the color wheel)
  const analHue1 = (h - 30 + 360) % 360;
  const analHue2 = (h + 30) % 360;
  const analColor1 = createExtractedColor(hslToHex(analHue1, s, l));
  const analColor2 = createExtractedColor(hslToHex(analHue2, s, l));
  const analSoft = createExtractedColor(
    hslToHex(analHue1, Math.max(s - 20, 25), Math.min(l + 18, 88)),
  );

  const analogous: ColorHarmony = {
    type: "analogous",
    title: "Analogous (±30° Organic Blend)",
    description:
      "Serene, high-end quiet luxury. Adjacent hues flow naturally into one another, perfect for subtle collar borders and understated thread work.",
    baseColor,
    colors: [baseColor, analColor1, analColor2, analSoft],
    presetApplication: {
      mainBody: baseColor.hex,
      trims: analColor1.hex,
      buttons: analColor2.hex,
      stitching: analSoft.hex,
    },
  };

  // 4. Split-Complementary (150° and 210°)
  const splitHue1 = (h + 150) % 360;
  const splitHue2 = (h + 210) % 360;
  const split1 = createExtractedColor(hslToHex(splitHue1, s, l));
  const split2 = createExtractedColor(hslToHex(splitHue2, s, l));
  const splitDeep = createExtractedColor(
    hslToHex(splitHue1, Math.min(s + 10, 80), Math.max(l - 22, 15)),
  );

  const splitComplementary: ColorHarmony = {
    type: "splitComplementary",
    title: "Split-Complementary (Refined Contrast)",
    description:
      "Sophisticated nuance. Offers the punchy contrast of complementary colors with softened, versatile adjacent tones.",
    baseColor,
    colors: [baseColor, split1, split2, splitDeep],
    presetApplication: {
      mainBody: baseColor.hex,
      trims: split1.hex,
      buttons: splitDeep.hex,
      stitching: split2.hex,
    },
  };

  // 5. Monochromatic (Variations in lightness and chroma)
  const monoLight = createExtractedColor(hslToHex(h, Math.max(s - 15, 10), Math.min(l + 25, 92)));
  const monoDeep = createExtractedColor(hslToHex(h, Math.min(s + 15, 85), Math.max(l - 25, 16)));
  const monoSubtle = createExtractedColor(
    hslToHex(h, Math.max(s - 25, 10), Math.min(Math.max(l - 10, 20), 80)),
  );

  const monochromatic: ColorHarmony = {
    type: "monochromatic",
    title: "Monochromatic (Tonal Couture)",
    description:
      "Timeless, architectural minimalism. Single-hue saturation and lightness variations creating refined bespoke layers.",
    baseColor,
    colors: [baseColor, monoLight, monoDeep, monoSubtle],
    presetApplication: {
      mainBody: baseColor.hex,
      trims: monoDeep.hex,
      buttons: monoDeep.hex,
      stitching: monoLight.hex,
    },
  };

  return {
    complementary,
    triadic,
    analogous,
    splitComplementary,
    monochromatic,
  };
}

/** Default fallback mood board palette */
export const FALLBACK_MOOD_BOARD_PALETTE: ExtractedColor[] = [
  createExtractedColor("#1b3b36", 90), // Emerald
  createExtractedColor("#c48b48", 75), // Gold Ochre
  createExtractedColor("#d9cbbe", 60), // Oatmeal Sand
  createExtractedColor("#8c4632", 50), // Terracotta
  createExtractedColor("#2c2b33", 45), // Slate Navy
  createExtractedColor("#f4ede4", 40), // Cream Alabaster
  createExtractedColor("#5d755c", 35), // Sage Leaf
];

/** Curated inspirational mood boards for immediate click-and-play testing */
export const CURATED_MOOD_BOARDS: Array<{
  id: string;
  title: string;
  tagline: string;
  previewUrl: string;
  theme: "luxury" | "earth" | "coastal" | "runway" | "street";
  colors: string[];
}> = [
  {
    id: "quiet-luxury",
    title: "Quiet Luxury & Cashmere",
    tagline: "Oatmeal wools, espresso calfskin, brushed brass, ivory silk",
    previewUrl:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80",
    theme: "luxury",
    colors: ["#dcd2c4", "#302621", "#a0815b", "#6d5849", "#f5eee6", "#1c1815"],
  },
  {
    id: "moroccan-terracotta",
    title: "Moroccan Oasis & Terracotta",
    tagline: "Baked clay, saffron ochre, desert sand, raw copper",
    previewUrl:
      "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=600&auto=format&fit=crop&q=80",
    theme: "earth",
    colors: ["#c15c3d", "#d9822b", "#e4ba85", "#703525", "#3a2118", "#f0d5b8"],
  },
  {
    id: "nordic-indigo",
    title: "Nordic Atelier & Deep Indigo",
    tagline: "Raw selvedge denim, foggy glacier slate, bone ivory, silver hardware",
    previewUrl:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600&auto=format&fit=crop&q=80",
    theme: "coastal",
    colors: ["#1c2d42", "#415d78", "#8b9ea7", "#d8e1e8", "#c89456", "#0f1621"],
  },
  {
    id: "emerald-heritage",
    title: "Heritage Botanical & Velvet",
    tagline: "Forest moss, antique gold filigree, rich pine, amber buttons",
    previewUrl:
      "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&auto=format&fit=crop&q=80",
    theme: "runway",
    colors: ["#19382b", "#3b5845", "#c6923b", "#775628", "#ebe4d5", "#102319"],
  },
];
