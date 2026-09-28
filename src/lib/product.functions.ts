import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ProductPreview = {
  title: string;
  siteName: string | null;
  sourceUrl: string;
  /** Clothing image inlined as a data URL so the canvas stays untainted. */
  imageDataUrl: string;
  /** Shop's product description (og:description / meta description / JSON-LD) */
  description?: string | null | undefined;
  /** Shop-provided category or product type, when the page publishes one */
  productCategory?: string | null | undefined;
  /** Closet items only: the wardrobe's parent category (Tops, Bottoms, Full Body…) */
  closetParentType?: string | null | undefined;
};

/** Category and description from schema.org Product JSON-LD and common shop metadata. */
function structuredProductInfo(html: string) {
  let category: string | null = null;
  let description: string | null = null;
  for (const [, block] of html.matchAll(
    /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed: unknown = JSON.parse(block ?? "");
      const nodes: unknown[] = Array.isArray(parsed)
        ? parsed
        : ((parsed as { "@graph"?: unknown[] })["@graph"] ?? [parsed]);
      for (const node of nodes) {
        const item = node as { "@type"?: unknown; category?: unknown; description?: unknown };
        const types = ([] as unknown[]).concat(item["@type"] ?? []);
        if (!types.includes("Product") && !types.includes("ProductGroup")) continue;
        if (!category && item.category) {
          category = ([] as unknown[]).concat(item.category).map(String).join(" ");
        }
        if (!description && typeof item.description === "string") description = item.description;
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  // Shopify and similar storefronts expose a product type in their page JSON
  const productType = html.match(/"product_?[tT]ype"\s*:\s*"([^"]{2,60})"/)?.[1] ?? null;
  return {
    category: [category, productType].filter(Boolean).join(" ") || null,
    description,
  };
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

function firstImageFallback(html: string, base: string) {
  const candidates = [...html.matchAll(/<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi)];
  for (const candidate of candidates) {
    const src = candidate[1];
    if (!src || src.startsWith("data:")) continue;
    try {
      return new URL(decodeEntities(src), base).toString();
    } catch {
      continue;
    }
  }
  return null;
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

    const pageResponse = await fetch(target.toString(), { headers, redirect: "follow" });
    if (!pageResponse.ok) {
      throw new Error(`The shop returned ${pageResponse.status} for that link.`);
    }
    const html = (await pageResponse.text()).slice(0, 800_000);

    const title =
      metaContent(html, "og:title") ??
      metaContent(html, "twitter:title") ??
      decodeEntities(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "") ??
      "Clothing item";

    const rawImage =
      metaContent(html, "og:image:secure_url") ??
      metaContent(html, "og:image") ??
      metaContent(html, "twitter:image") ??
      firstImageFallback(html, pageResponse.url || target.toString());

    if (!rawImage) {
      throw new Error("No product image found on that page. Try the direct product page link.");
    }

    const imageUrl = new URL(rawImage, pageResponse.url || target.toString()).toString();
    const imageResponse = await fetch(imageUrl, {
      headers: { ...headers, accept: "image/*", referer: target.origin },
      redirect: "follow",
    });
    if (!imageResponse.ok) {
      throw new Error("Found a product image but couldn't download it.");
    }

    const buffer = await imageResponse.arrayBuffer();
    if (buffer.byteLength === 0) throw new Error("The product image was empty.");
    if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("That product image is too large.");

    const contentType = imageResponse.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }

    const structured = structuredProductInfo(html);
    return {
      title: title || "Clothing item",
      siteName: metaContent(html, "og:site_name") ?? target.hostname.replace(/^www\./, ""),
      sourceUrl: target.toString(),
      imageDataUrl: `data:${contentType};base64,${btoa(binary)}`,
      description:
        metaContent(html, "og:description") ??
        metaContent(html, "description") ??
        structured.description?.slice(0, 600) ??
        null,
      productCategory: metaContent(html, "product:category") ?? structured.category,
    };
  });
