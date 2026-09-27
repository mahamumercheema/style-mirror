/**
 * Client-side photo cleanup before pose detection:
 * removes the background (MediaPipe Selfie Segmentation via TF.js — free, on-device),
 * straightens a slightly tilted photo, and crops/centres the full body on a plain
 * neutral background.
 */
import { initTfBackend } from "./tf-backend";

/** Person mask for the cleaned image: 1 byte per pixel, 1 = person. */
export type Silhouette = { width: number; height: number; data: Uint8Array };

export type CleanedPhoto = {
  dataUrl: string;
  silhouette: Silhouette | null;
  /** Degrees the photo was rotated to straighten it (0 when untouched). */
  rotationDeg: number;
  backgroundRemoved: boolean;
};

const MAX_EDGE = 1280;
const NEUTRAL_BACKGROUND = "#f3f0eb";
/** Ignore tilts smaller than this; larger ones are more likely a pose than a camera tilt. */
const MIN_TILT_DEG = 0.75;
const MAX_TILT_DEG = 12;
/** A person should cover at least this share of the frame for the mask to be trusted. */
const MIN_PERSON_COVERAGE = 0.02;

type Segmenter = {
  segmentPeople: (
    input: HTMLCanvasElement,
  ) => Promise<Array<{ mask: { toImageData: () => Promise<ImageData> } }>>;
};

let segmenterPromise: Promise<Segmenter> | null = null;

async function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const [, bodySegmentation] = await Promise.all([
        initTfBackend(),
        import("@tensorflow-models/body-segmentation"),
      ]);
      const create = () =>
        bodySegmentation.createSegmenter(
          bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
          { runtime: "tfjs", modelType: "general" },
        );
      // The model download goes through a tfhub → Kaggle redirect that occasionally
      // fails transiently; retry once before giving up.
      const segmenter = await create().catch(() =>
        new Promise((resolve) => setTimeout(resolve, 1500)).then(create),
      );
      return segmenter as unknown as Segmenter;
    })().catch((error) => {
      segmenterPromise = null;
      throw error;
    });
  }
  return segmenterPromise;
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read that photo. Please try a different file."));
    img.src = src;
  });
}

export function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  return { canvas, ctx };
}

/**
 * Runs segmentation. Returns a binary mask (alpha 255 = person, for measuring) and a
 * soft mask (probability with a contrast curve, for smooth cut-out edges).
 */
async function segmentToMaskCanvas(source: HTMLCanvasElement) {
  const segmenter = await getSegmenter();
  const [person] = await segmenter.segmentPeople(source);
  if (!person) throw new Error("No person found in photo.");
  // Selfie segmentation encodes the person probability (0-255) in every channel
  const probability = await person.mask.toImageData();
  const { width, height } = probability;

  const binaryData = new ImageData(width, height);
  const softData = new ImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    const p = (probability.data[i * 4] ?? 0) / 255;
    binaryData.data[i * 4 + 3] = p > 0.5 ? 255 : 0;
    const t = Math.min(Math.max((p - 0.35) / 0.4, 0), 1);
    softData.data[i * 4 + 3] = Math.round(t * t * (3 - 2 * t) * 255);
  }

  const binary = createCanvas(width, height);
  binary.ctx.putImageData(binaryData, 0, 0);
  const soft = createCanvas(width, height);
  soft.ctx.putImageData(softData, 0, 0);
  return { canvas: binary.canvas, softCanvas: soft.canvas, data: binaryData };
}

type MaskStats = {
  coverage: number;
  box: { left: number; top: number; right: number; bottom: number };
  tiltDeg: number;
};

/**
 * Bounding box via row/column projections (ignoring specks) and body tilt from the
 * mask's second-order moments (principal axis angle relative to vertical).
 */
function analyseMask(mask: ImageData): MaskStats | null {
  const { width, height, data } = mask;
  const rows = new Uint32Array(height);
  const cols = new Uint32Array(width);
  let count = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((data[(y * width + x) * 4 + 3] ?? 0) > 127) {
        rows[y]!++;
        cols[x]!++;
        count++;
        sumX += x;
        sumY += y;
      }
    }
  }

  const coverage = count / (width * height);
  if (coverage < MIN_PERSON_COVERAGE) return null;

  const cx = sumX / count;
  const cy = sumY / count;
  let mu20 = 0;
  let mu02 = 0;
  let mu11 = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((data[(y * width + x) * 4 + 3] ?? 0) > 127) {
        const dx = x - cx;
        const dy = y - cy;
        mu20 += dx * dx;
        mu02 += dy * dy;
        mu11 += dx * dy;
      }
    }
  }
  let axisDeg = (0.5 * Math.atan2(2 * mu11, mu20 - mu02) * 180) / Math.PI;
  if (axisDeg < 0) axisDeg += 180;
  const tiltDeg = axisDeg - 90;

  const minRow = Math.max(2, Math.round(width * 0.004));
  const minCol = Math.max(2, Math.round(height * 0.004));
  const firstIndex = (arr: Uint32Array, min: number) => arr.findIndex((v) => v >= min);
  const lastIndex = (arr: Uint32Array, min: number) => {
    for (let i = arr.length - 1; i >= 0; i--) if ((arr[i] ?? 0) >= min) return i;
    return -1;
  };
  const top = firstIndex(rows, minRow);
  const bottom = lastIndex(rows, minRow);
  const left = firstIndex(cols, minCol);
  const right = lastIndex(cols, minCol);
  if (top < 0 || left < 0 || bottom <= top || right <= left) return null;

  return { coverage, box: { left, top, right, bottom }, tiltDeg };
}

async function toWorkingCanvas(src: string) {
  const img = await loadImage(src);
  const ratio = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const { canvas, ctx } = createCanvas(img.naturalWidth * ratio, img.naturalHeight * ratio);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function rotateCanvas(source: HTMLCanvasElement, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const width = source.width * cos + source.height * sin;
  const height = source.width * sin + source.height * cos;
  const { canvas, ctx } = createCanvas(width, height);
  ctx.fillStyle = NEUTRAL_BACKGROUND;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(radians);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

/**
 * Cleans a photo for measurement. Falls back to the unmodified photo if the
 * segmentation model can't load or can't find a person.
 */
export async function cleanupBodyPhoto(src: string): Promise<CleanedPhoto> {
  const fallback: CleanedPhoto = {
    dataUrl: src,
    silhouette: null,
    rotationDeg: 0,
    backgroundRemoved: false,
  };

  try {
    let working = await toWorkingCanvas(src);
    let mask = await segmentToMaskCanvas(working);
    let stats = analyseMask(mask.data);
    if (!stats) return fallback;

    // Straighten, then re-segment so the mask matches the rotated pixels exactly
    let rotationDeg = 0;
    if (Math.abs(stats.tiltDeg) >= MIN_TILT_DEG && Math.abs(stats.tiltDeg) <= MAX_TILT_DEG) {
      rotationDeg = -stats.tiltDeg;
      working = rotateCanvas(working, rotationDeg);
      mask = await segmentToMaskCanvas(working);
      stats = analyseMask(mask.data);
      if (!stats) return fallback;
    }

    // Crop to the person with breathing room, centred, at a 3:4 portrait ratio
    const { box } = stats;
    const personWidth = box.right - box.left + 1;
    const personHeight = box.bottom - box.top + 1;
    const pad = personHeight * 0.06;
    let cropHeight = personHeight + pad * 2;
    const cropWidth = Math.max(personWidth * 1.2, cropHeight * 0.75);
    cropHeight = Math.max(cropHeight, cropWidth / 0.75);
    const centerX = (box.left + box.right) / 2;
    const centerY = (box.top + box.bottom) / 2;
    const cropLeft = centerX - cropWidth / 2;
    const cropTop = centerY - cropHeight / 2;

    // Composite the person (soft mask as alpha) onto the neutral background
    const person = createCanvas(working.width, working.height);
    person.ctx.drawImage(working, 0, 0);
    person.ctx.globalCompositeOperation = "destination-in";
    person.ctx.filter = "blur(1px)";
    person.ctx.drawImage(mask.softCanvas, 0, 0);

    const output = createCanvas(cropWidth, cropHeight);
    output.ctx.fillStyle = NEUTRAL_BACKGROUND;
    output.ctx.fillRect(0, 0, output.canvas.width, output.canvas.height);
    output.ctx.drawImage(person.canvas, -cropLeft, -cropTop);

    // Crop the binary mask the same way for silhouette-based width measurements
    const croppedMask = createCanvas(cropWidth, cropHeight);
    croppedMask.ctx.drawImage(mask.canvas, -cropLeft, -cropTop);
    const maskPixels = croppedMask.ctx.getImageData(
      0,
      0,
      croppedMask.canvas.width,
      croppedMask.canvas.height,
    ).data;
    const silhouetteData = new Uint8Array(croppedMask.canvas.width * croppedMask.canvas.height);
    for (let i = 0; i < silhouetteData.length; i++) {
      silhouetteData[i] = (maskPixels[i * 4 + 3] ?? 0) > 127 ? 1 : 0;
    }

    return {
      dataUrl: output.canvas.toDataURL("image/jpeg", 0.92),
      silhouette: {
        width: croppedMask.canvas.width,
        height: croppedMask.canvas.height,
        data: silhouetteData,
      },
      rotationDeg,
      backgroundRemoved: true,
    };
  } catch (error) {
    console.warn("Background cleanup unavailable, using original photo:", error);
    return fallback;
  }
}
