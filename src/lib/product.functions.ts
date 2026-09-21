import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ProductPreview = {
  title: string;
  siteName: string | null;
  sourceUrl: string;
  /** Clothing image inlined as a data URL so the canvas stays untainted. */
  imageDataUrl: string;
};

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
  .inputValidator((data) => z.object({ url: z.string().min(1) }).parse(data))
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

    return {
      title: title || "Clothing item",
      siteName: metaContent(html, "og:site_name") ?? target.hostname.replace(/^www\./, ""),
      sourceUrl: target.toString(),
      imageDataUrl: `data:${contentType};base64,${btoa(binary)}`,
    };
  });
