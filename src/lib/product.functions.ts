import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ProductPreview = {
  title: string;
  siteName: string | null;
  sourceUrl: string;
  /** Clothing image inlined as a data URL so the canvas stays untainted. */
  imageDataUrl: string;
  /**
   * Shop-link items only: every usable product photo found on the page (data URLs, best guess
   * first, includes imageDataUrl). The browser ranks these to pick the best try-on shot.
   */
  imageCandidates?: string[] | undefined;
  /** Shop's product description (og:description / meta description / JSON-LD) */
  description?: string | null | undefined;
  /** Shop-provided category or product type, when the page publishes one */
  productCategory?: string | null | undefined;
  /** Closet items only: the wardrobe's parent category (Tops, Bottoms, Full Body…) */
  closetParentType?: string | null | undefined;
};

/** Category and description from schema.org Product JSON-LD and common shop metadata. */
function structuredProductInfo(html: string) {
  let name: string | null = null;
  let category: string | null = null;
  let description: string | null = null;
  const images: string[] = [];
  for (const [, block] of html.matchAll(
    /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed: unknown = JSON.parse(block ?? "");
      const nodes: unknown[] = Array.isArray(parsed)
        ? parsed
        : ((parsed as { "@graph"?: unknown[] })["@graph"] ?? [parsed]);
      for (const node of nodes) {
        const item = node as {
          "@type"?: unknown;
          name?: unknown;
          category?: unknown;
          description?: unknown;
          image?: unknown;
          hasVariant?: unknown;
        };
        const types = ([] as unknown[]).concat(item["@type"] ?? []);
        if (!types.includes("Product") && !types.includes("ProductGroup")) continue;
        if (!name && typeof item.name === "string") name = decodeEntities(item.name.trim());
        if (!category && item.category) {
          category = ([] as unknown[]).concat(item.category).map(String).join(" ");
        }
        if (!description && typeof item.description === "string") description = item.description;
        const variants = ([] as unknown[]).concat(item.hasVariant ?? []);
        for (const image of [
          item.image,
          ...variants.map((v) => (v as { image?: unknown }).image),
        ]) {
          images.push(...jsonLdImageUrls(image));
        }
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  // Shopify and similar storefronts expose a product type in their page JSON
  const productType = html.match(/"product_?[tT]ype"\s*:\s*"([^"]{2,60})"/)?.[1] ?? null;
  return {
    name,
    category: [category, productType].filter(Boolean).join(" ") || null,
    description,
    images,
  };
}

/** schema.org `image` is a URL, an ImageObject, or an array of either. */
function jsonLdImageUrls(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(jsonLdImageUrls);
  if (value && typeof value === "object") {
    const url =
      (value as { url?: unknown; contentUrl?: unknown }).url ??
      (value as { contentUrl?: unknown }).contentUrl;
    return typeof url === "string" ? [url] : [];
  }
  return [];
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function decodeEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function metaContent(html: string, property: string) {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)\\s*=\\s*["']${property}["'][^>]*content\\s*=\\s*["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]*(?:property|name)\\s*=\\s*["']${property}["']`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1].trim());
  }
  return null;
}

function allMetaContents(html: string, property: string) {
  const values: string[] = [];
  for (const [tag] of html.matchAll(/<meta[^>]+>/gi)) {
    if (!new RegExp(`(?:property|name)\\s*=\\s*["']${property}["']`, "i").test(tag)) continue;
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (content) values.push(decodeEntities(content.trim()));
  }
  return values;
}

function attribute(tag: string, name: string) {
  const value = tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];
  return value ? decodeEntities(value.trim()) : null;
}

/** Largest entry of a srcset ("a.jpg 400w, b.jpg 1000w") */
function largestSrcset(srcset: string | null) {
  if (!srcset) return null;
  let best: { url: string; size: number } | null = null;
  for (const entry of srcset.split(/,\s+/)) {
    const [url, descriptor] = entry.trim().split(/\s+/);
    const size = Number.parseFloat(descriptor ?? "") || 1;
    if (url && (!best || size > best.size)) best = { url, size };
  }
  return best?.url ?? null;
}

function words(value: string) {
  return new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

/** File name without extension, size suffix or Shopify's appended UUID */
function fileStem(url: string) {
  const name = url.split("?")[0]!.split("/").pop() ?? "";
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/_[0-9a-f]{8}-[0-9a-f-]{27}$/i, "")
    .replace(/_\d+x\d*$/i, "")
    .toLowerCase();
}

/** Whole words in an image's file name that mark site chrome rather than product photos */
const NON_PRODUCT_IMAGE =
  /(?:^|[^a-z])(?:logo|icon|sprite|payment|badge|avatar|banner|placeholder|loader|spinner|flag|social|footer|header|swatch|size[-_]?chart)s?(?:[^a-z]|$)|\.(?:svg|gif)$/i;

type ImageSource = "structured" | "meta" | "gallery" | "page";

/**
 * Every plausible photo of *this* product, best guess first: schema.org and og:image first,
 * then page images whose alt text matches the product title or whose file name matches the
 * main image (gallery shots), and only then other large page images.
 */
function collectImageCandidates(
  html: string,
  base: string,
  title: string,
  structuredImages: string[],
): Array<{ url: string; source: ImageSource }> {
  const found: Array<{ url: string; source: ImageSource }> = [];
  const seen = new Set<string>();
  const add = (raw: string | null, source: ImageSource) => {
    if (!raw || raw.startsWith("data:")) return;
    let url: URL;
    try {
      url = new URL(raw, base);
    } catch {
      return;
    }
    if (NON_PRODUCT_IMAGE.test(url.pathname.split("/").pop() ?? "")) return;
    // Shopify CDNs resize on request: ask for a size that suits the try-on model
    if (url.pathname.includes("/cdn/shop/") || url.hostname === "cdn.shopify.com") {
      url.searchParams.set("width", "1000");
    }
    const key = `${url.hostname}${url.pathname.replace(/_\d+x\d*(?=\.)/, "")}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ url: url.toString(), source });
  };

  for (const image of structuredImages) add(image, "structured");
  for (const property of ["og:image:secure_url", "og:image", "twitter:image"]) {
    for (const image of allMetaContents(html, property)) add(image, "meta");
  }

  const titleWords = words(title);
  const mainStems = found.map((candidate) => fileStem(candidate.url).replace(/[_-]?\d+$/, ""));
  const others: string[] = [];
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    const src =
      attribute(tag, "data-zoom-image") ??
      attribute(tag, "data-large_image") ??
      largestSrcset(attribute(tag, "srcset") ?? attribute(tag, "data-srcset")) ??
      attribute(tag, "data-src") ??
      attribute(tag, "src");
    if (!src) continue;
    const width = Number(attribute(tag, "width"));
    if (width && width < 150) continue;
    const altWords = [...words(attribute(tag, "alt") ?? "")];
    const altMatches =
      altWords.length >= 2 &&
      altWords.filter((word) => titleWords.has(word)).length / altWords.length >= 0.8;
    const stem = fileStem(src).replace(/[_-]?\d+$/, "");
    const stemMatches = stem.length >= 5 && mainStems.includes(stem);
    if (altMatches || stemMatches) add(src, "gallery");
    else others.push(src);
  }
  // Galleries rendered by JavaScript keep their full-size URLs in embedded JSON: take any
  // URL sharing a known gallery file name, then generic zoom keys (Amazon's "hiRes", Next.js
  // page data…) only when nothing product-specific turned up, since they can be other items
  if (mainStems.length > 0) {
    for (const [, raw] of html.matchAll(
      /"((?:https?:)?(?:\\?\/){2}[^"\s]+?\.(?:jpe?g|png|webp|avif)(?:\?[^"\s]*)?)"/gi,
    )) {
      const url = unescapeJsonUrl(raw!);
      if (mainStems.includes(fileStem(url).replace(/[_-]?\d+$/, ""))) add(url, "gallery");
    }
  }
  if (found.length < 2) {
    for (const [, raw] of html.matchAll(
      /"(?:hiRes|large|zoom(?:Image)?|original|full(?:size|Size)?|highRes)(?:Url|URL|_url)?"\s*:\s*"((?:https?:)?\\?\/\\?\/[^"\s]+)"/g,
    )) {
      add(unescapeJsonUrl(raw!), "gallery");
    }
  }
  // Unrelated page images ("you may also like") only when the page offers nothing better
  if (found.length < 2) for (const src of others) add(src, "page");
  return found;
}

function unescapeJsonUrl(value: string) {
  return value
    .replace(/\\\//g, "/")
    .replace(/\\u002[fF]/g, "/")
    .replace(/\\u0026/g, "&");
}

/** Pixel size from the image header (PNG, JPEG, GIF, WebP); null for other formats */
function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 30) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49) {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }
  if (view.getUint32(0) === 0x52494646 && view.getUint32(8) === 0x57454250) {
    const chunk = String.fromCharCode(...bytes.subarray(12, 16));
    if (chunk === "VP8 ") {
      return {
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
      };
    }
    if (chunk === "VP8L") {
      const bits = view.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") {
      const w = bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16);
      const h = bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16);
      return { width: w + 1, height: h + 1 };
    }
    return null;
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1]!;
      const length = view.getUint16(offset + 2);
      // SOF0–SOF15 carry the frame size, except DHT (C4), JPG (C8) and DAC (CC)
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) };
      }
      offset += 2 + length;
    }
  }
  return null;
}

const SOURCE_SCORE: Record<ImageSource, number> = {
  structured: 3,
  meta: 2.5,
  gallery: 2.5,
  page: 0,
};

/** Upfront guess before the browser's image ranking: product-tagged, large, portrait-ish */
function heuristicScore(source: ImageSource, size: { width: number; height: number } | null) {
  let score = SOURCE_SCORE[source];
  if (size) {
    const shortSide = Math.min(size.width, size.height);
    score += Math.min(shortSide, 1000) / 500;
    const ratio = size.width / size.height;
    if (ratio > 1.4)
      score -= 2; // wide banners and lifestyle crops
    else if (ratio >= 0.55 && ratio <= 1.1) score += 0.5;
  }
  return score;
}

const MAX_CANDIDATES = 8;
const CANDIDATE_TIMEOUT_MS = 10_000;
/** Below this the photo is a thumbnail, too small to try on */
const MIN_SIDE_PX = 250;

function toDataUrl(contentType: string, bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${contentType};base64,${btoa(binary)}`;
}

/** Statuses bot protection answers with (Cloudflare, Akamai, rate limits) */
const BLOCKED_STATUSES = new Set([401, 403, 429, 503]);
const BLOCKED_MESSAGE =
  "This shop blocks automated access to its pages. Save the product photo and use \u201cupload a garment image\u201d instead.";

type ShopifyProduct = {
  title?: string;
  description?: string;
  type?: string;
  images?: string[];
  variants?: Array<{ id?: number; featured_image?: { src?: string } | null }>;
};

/**
 * Shopify stores (a large share of fashion shops) publish every product's title and full
 * photo gallery at /products/<handle>.js, even when the page itself is rendered by scripts.
 */
async function fetchShopifyProduct(target: URL, headers: Record<string, string>) {
  const match = target.pathname.match(/^(.*\/products\/[^/]+?)(?:\.\w+)?\/?$/);
  if (!match) return null;
  try {
    const response = await fetch(`${target.origin}${match[1]}.js`, {
      headers: { ...headers, accept: "application/json" },
      redirect: "follow",
      signal: AbortSignal.timeout(CANDIDATE_TIMEOUT_MS),
    });
    // Shopify serves this JSON as text/javascript
    if (!response.ok || !/json|javascript/.test(response.headers.get("content-type") ?? "")) {
      return null;
    }
    const product = (await response.json()) as ShopifyProduct;
    if (!Array.isArray(product.images) || product.images.length === 0) return null;
    // A ?variant= link shows that colour first
    const variantId = Number(target.searchParams.get("variant"));
    const variantImage = product.variants?.find((v) => v.id === variantId)?.featured_image?.src;
    return {
      ...product,
      images: variantImage ? [variantImage, ...product.images] : product.images,
    };
  } catch {
    return null;
  }
}

function plainText(html: string) {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export const fetchProductPreview = createServerFn({ method: "POST" })
  .validator((data) => z.object({ url: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<ProductPreview> => {
    let target: URL;
    try {
      target = new URL(
        data.url.trim().startsWith("http") ? data.url.trim() : `https://${data.url.trim()}`,
      );
    } catch {
      throw new Error("That doesn't look like a valid link.");
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      throw new Error("Only http and https links are supported.");
    }

    const headers = {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
      "accept-language": "en-US,en;q=0.9",
    };

    const [pageResponse, shopify] = await Promise.all([
      fetch(target.toString(), {
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
      }).catch(() => null),
      fetchShopifyProduct(target, headers),
    ]);
    const pageType = pageResponse?.headers.get("content-type") ?? "";

    // A direct link to the garment photo
    if (pageResponse?.ok && pageType.startsWith("image/") && !pageType.includes("svg")) {
      const bytes = new Uint8Array(await pageResponse.arrayBuffer());
      if (bytes.length > MAX_IMAGE_BYTES) throw new Error("That image is too large.");
      const name = decodeURIComponent(target.pathname.split("/").pop() ?? "");
      return {
        title: name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") || "Clothing item",
        siteName: target.hostname.replace(/^www\./, ""),
        sourceUrl: target.toString(),
        imageDataUrl: toDataUrl(pageType.split(";")[0]!, bytes),
      };
    }

    if (!pageResponse?.ok && !shopify) {
      if (!pageResponse) throw new Error("Couldn't reach that shop. Check the link and try again.");
      if (BLOCKED_STATUSES.has(pageResponse.status)) throw new Error(BLOCKED_MESSAGE);
      throw new Error(`The shop returned ${pageResponse.status} for that link.`);
    }
    const html = pageResponse?.ok ? (await pageResponse.text()).slice(0, 1_500_000) : "";
    const structured = structuredProductInfo(html);

    const title =
      shopify?.title?.replace(/\s+/g, " ").trim() ??
      structured.name ??
      metaContent(html, "og:title") ??
      metaContent(html, "twitter:title") ??
      (decodeEntities(html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim() ?? "") || null) ??
      decodeEntities(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "");

    const pageUrl = (pageResponse?.ok && pageResponse.url) || target.toString();
    const candidates = collectImageCandidates(html, pageUrl, title, [
      ...(shopify?.images ?? []),
      ...structured.images,
    ]).slice(0, MAX_CANDIDATES + 4);
    if (candidates.length === 0) {
      throw new Error(
        /captcha|cf-chl|access denied|are you a robot/i.test(html)
          ? BLOCKED_MESSAGE
          : "No product photo found on that page. Try the product's own page, or upload the photo.",
      );
    }

    const downloaded = await Promise.all(
      candidates.map(async ({ url, source }, order) => {
        try {
          const response = await fetch(url, {
            headers: { ...headers, accept: "image/*", referer: target.origin },
            redirect: "follow",
            signal: AbortSignal.timeout(CANDIDATE_TIMEOUT_MS),
          });
          const contentType = response.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
          if (!response.ok || !contentType.startsWith("image/") || contentType.includes("svg")) {
            return null;
          }
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return null;
          const size = imageSize(bytes);
          if (size && Math.min(size.width, size.height) < MIN_SIDE_PX) return null;
          return {
            dataUrl: toDataUrl(contentType, bytes),
            // Earlier candidates win ties
            score: heuristicScore(source, size) - order * 0.01,
          };
        } catch {
          return null;
        }
      }),
    );
    const ranked = downloaded
      .filter((candidate) => candidate !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CANDIDATES);
    if (ranked.length === 0) {
      throw new Error("Found a product image but couldn't download it.");
    }

    return {
      title: title || "Clothing item",
      siteName: metaContent(html, "og:site_name") ?? target.hostname.replace(/^www\./, ""),
      sourceUrl: target.toString(),
      imageDataUrl: ranked[0]!.dataUrl,
      imageCandidates: ranked.map((candidate) => candidate.dataUrl),
      description:
        metaContent(html, "og:description") ??
        metaContent(html, "description") ??
        structured.description?.slice(0, 600) ??
        (shopify?.description ? plainText(shopify.description).slice(0, 600) : null),
      productCategory:
        metaContent(html, "product:category") ?? structured.category ?? (shopify?.type || null),
    };
  });
