/**
 * AI virtual try-on via the free, MIT-licensed Leffa model hosted on Hugging Face
 * (https://huggingface.co/spaces/franciszzj/Leffa, ZeroGPU free tier).
 *
 * Server-side only: HF_TOKEN is read from the server environment (.env.local locally)
 * and is never sent to the browser, returned, or logged. Images pass through memory only.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { GarmentCategory } from "./garment-category";

const LEFFA_SPACE = "https://franciszzj-leffa.hf.space";
const LEFFA_API = `${LEFFA_SPACE}/gradio_api`;
const LEFFA_ENDPOINT = "leffa_predict_vt";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 170_000;

export type TryOnResult = {
  imageDataUrl: string;
  /** Wall-clock time for the whole request, including any queue wait */
  elapsedMs: number;
  category: GarmentCategory;
};

/** Leffa's VITON-HD checkpoint only covers tops; DressCode covers bottoms and dresses. */
const MODEL_FOR: Record<GarmentCategory, "viton_hd" | "dress_code"> = {
  upper_body: "viton_hd",
  lower_body: "dress_code",
  dresses: "dress_code",
};

/** Errors whose message is safe and useful to show the user. */
class TryOnError extends Error {}

function getToken() {
  const token = process.env["HF_TOKEN"]?.trim();
  if (!token || !token.startsWith("hf_") || token === "hf_your_token_here") {
    throw new TryOnError(
      "Virtual try-on isn't set up yet: a Hugging Face token needs to be added on the server.",
    );
  }
  return token;
}

type DecodedImage = { bytes: Uint8Array<ArrayBuffer>; mime: string };

const IMAGE_SIGNATURES: Array<{ mime: string; test: (b: Uint8Array) => boolean }> = [
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    mime: "image/webp",
    test: (b) =>
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
];

/** Accepts a base64 data URL or an https image URL; checks the bytes are a real image. */
async function loadImage(input: string, label: string): Promise<DecodedImage> {
  let bytes: Uint8Array<ArrayBuffer>;
  if (input.startsWith("data:")) {
    const base64 = input.match(/^data:[\w/+.-]+;base64,(.+)$/s)?.[1];
    if (!base64) throw new TryOnError(`The ${label} isn't a valid image.`);
    bytes = new Uint8Array(Buffer.from(base64, "base64"));
  } else {
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      throw new TryOnError(`The ${label} isn't a valid image.`);
    }
    if (url.protocol !== "https:") throw new TryOnError(`The ${label} must be an https image.`);
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new TryOnError(`Couldn't download the ${label}.`);
    bytes = new Uint8Array(await response.arrayBuffer());
  }
  if (bytes.byteLength === 0) throw new TryOnError(`The ${label} is empty.`);
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new TryOnError(`The ${label} is larger than 8 MB.`);
  }
  const kind = IMAGE_SIGNATURES.find((signature) => signature.test(bytes));
  if (!kind) throw new TryOnError(`The ${label} must be a JPG, PNG or WebP image.`);
  return { bytes, mime: kind.mime };
}

/** Plain-language versions of Leffa / ZeroGPU errors. */
function friendlyError(message: string) {
  if (/quota/i.test(message)) {
    const retry = message.match(/Try again in ([\d:]+)/i)?.[1];
    return `Today's free try-on allowance has been used up${
      retry ? ` — it resets in ${retry} (h:mm:ss)` : ""
    }. This runs on Hugging Face's free GPU tier, which has a small daily limit.`;
  }
  if (/sleep|building|paused|not running|\b50[234]\b/i.test(message)) {
    return "The free try-on model is starting up or temporarily unavailable. Please try again in a minute.";
  }
  return "The try-on model couldn't process these images. Try a clear, front-facing full-body photo and a plain product image.";
}

async function callLeffa(
  person: DecodedImage,
  garment: DecodedImage,
  category: GarmentCategory,
  seed: number,
  token: string,
): Promise<string> {
  const auth = { Authorization: `Bearer ${token}` };
  const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const extension = (mime: string) => mime.split("/")[1] ?? "jpg";

  // 1. Upload both images to the Space's temporary storage
  const form = new FormData();
  form.append(
    "files",
    new Blob([person.bytes], { type: person.mime }),
    `person.${extension(person.mime)}`,
  );
  form.append(
    "files",
    new Blob([garment.bytes], { type: garment.mime }),
    `garment.${extension(garment.mime)}`,
  );
  const upload = await fetch(`${LEFFA_API}/upload`, {
    method: "POST",
    headers: auth,
    body: form,
    signal,
  });
  if (!upload.ok) throw new TryOnError(friendlyError(`upload ${upload.status}`));
  const [personPath, garmentPath] = (await upload.json()) as string[];
  if (!personPath || !garmentPath) throw new TryOnError(friendlyError("upload returned nothing"));

  // 2. Look up the try-on endpoint and join the queue
  const config = await fetch(`${LEFFA_SPACE}/config`, { headers: auth, signal });
  if (!config.ok) throw new TryOnError(friendlyError(`config ${config.status}`));
  const { dependencies } = (await config.json()) as {
    dependencies: Array<{ id?: number; api_name?: string }>;
  };
  const index = dependencies.findIndex((d) => d.api_name === LEFFA_ENDPOINT);
  if (index < 0) {
    throw new TryOnError(
      "The try-on model's interface has changed, so it can't be used right now.",
    );
  }

  const file = (path: string) => ({ path, meta: { _type: "gradio.FileData" } });
  const sessionHash = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const join = await fetch(`${LEFFA_API}/queue/join`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        file(personPath),
        file(garmentPath),
        // Full-quality reference features (acceleration reuses them between steps)
        false,
        // Inference steps and guidance scale: the authors' tested defaults
        30,
        2.5,
        seed,
        MODEL_FOR[category],
        category,
        // Repaint: blend the generated garment back into the original pixels using the
        // clothing mask, so face, hair, hands, skin, background and lighting stay exactly
        // as photographed and only the garment area is generated
        true,
      ],
      fn_index: dependencies[index]?.id ?? index,
      session_hash: sessionHash,
      event_data: null,
      trigger_id: null,
    }),
    signal,
  });
  if (!join.ok) throw new TryOnError(friendlyError(`queue ${join.status}`));

  // 3. Read the event stream until the result (or an error) arrives
  const stream = await fetch(`${LEFFA_API}/queue/data?session_hash=${sessionHash}`, {
    headers: { ...auth, Accept: "text/event-stream" },
    signal,
  });
  if (!stream.ok || !stream.body) throw new TryOnError(friendlyError(`stream ${stream.status}`));
  const reader = stream.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith("data:")) continue;
      const message = JSON.parse(line.slice(5)) as {
        msg: string;
        success?: boolean;
        output?: { error?: string | null; data?: Array<{ url?: string; path?: string } | null> };
      };
      if (message.msg !== "process_completed") continue;
      await reader.cancel();
      if (!message.success) {
        throw new TryOnError(friendlyError(message.output?.error ?? "unknown"));
      }
      const image = message.output?.data?.[0];
      const url = image?.url ?? (image?.path ? `${LEFFA_API}/file=${image.path}` : null);
      if (!url) throw new TryOnError(friendlyError("no image returned"));

      // 4. Fetch the generated image and return it inline
      const result = await fetch(url, { headers: auth, signal });
      if (!result.ok) throw new TryOnError(friendlyError(`result ${result.status}`));
      const mime = result.headers.get("content-type")?.split(";")[0] ?? "image/png";
      const bytes = Buffer.from(await result.arrayBuffer());
      return `data:${mime};base64,${bytes.toString("base64")}`;
    }
  }
  throw new TryOnError(friendlyError("stream closed early"));
}

export const generateTryOn = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        personImage: z.string().min(32).max(12_000_000),
        garmentImage: z.string().min(8).max(12_000_000),
        category: z.enum(["upper_body", "lower_body", "dresses"]),
        seed: z
          .number()
          .int()
          .min(0)
          .max(2 ** 31 - 1)
          .default(42),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<TryOnResult> => {
    const started = Date.now();
    try {
      const token = getToken();
      const [person, garment] = await Promise.all([
        loadImage(data.personImage, "photo of you"),
        loadImage(data.garmentImage, "garment image"),
      ]);
      const imageDataUrl = await callLeffa(person, garment, data.category, data.seed, token);
      return { imageDataUrl, elapsedMs: Date.now() - started, category: data.category };
    } catch (error) {
      if (error instanceof TryOnError) throw error;
      if (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new Error(
          "The try-on took too long (the free GPU queue may be busy). Please try again.",
        );
      }
      // Log only the error type and message; never request details that could carry the token
      console.error("Try-on failed:", error instanceof Error ? error.message : "unknown error");
      throw new Error("The try-on service couldn't be reached. Please try again shortly.");
    }
  });
