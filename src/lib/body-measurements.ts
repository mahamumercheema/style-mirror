/**
 * Height-calibrated body measurements (cm) from pose landmarks and, when available,
 * the person's segmentation silhouette. Pure geometry — no DOM, no network.
 */
import type { Silhouette } from "./image-cleanup";

export type Keypoint = { x: number; y: number; score?: number | undefined };

export type MeasurementBasis = "user" | "silhouette" | "landmarks" | "approximation";

export type CmMeasurement = {
  cm: number;
  /** 0-1: combines landmark scores with how reliably the scale was established */
  confidence: number;
  basis: MeasurementBasis;
};

export type HipCurve = {
  /** Outward bulge of each hip beyond the waist line, measured from the torso midline */
  leftCm: number;
  rightCm: number;
  averageCm: number;
  waistToHipWidthRatio: number;
  confidence: number;
};

export type CalibratedMeasurements = {
  heightCm: number;
  pixelsPerCm: number;
  /** How reliably head top and heels were located (drives every cm value) */
  scaleConfidence: number;
  scaleMethod: "silhouette" | "landmarks" | "extrapolated";
  /** Outer-edge shoulder width (joint-to-joint plus edge allowance) */
  shoulderWidth: CmMeasurement;
  /** Raw distance between the shoulder joints */
  shoulderJointWidth: CmMeasurement;
  bustWidth: CmMeasurement;
  waistWidth: CmMeasurement;
  hipWidth: CmMeasurement;
  torsoLength: CmMeasurement;
  legLength: CmMeasurement | null;
  armLength: CmMeasurement | null;
  hipCurve: HipCurve;
};

/** Front-view width → approximate circumference (elliptical cross-section). */
export const WAIST_WIDTH_TO_CIRCUMFERENCE = 2.7;
export const BUST_WIDTH_TO_CIRCUMFERENCE = 2.75;
export const HIP_WIDTH_TO_CIRCUMFERENCE = 2.8;

export const MIN_HEIGHT_CM = 100;
export const MAX_HEIGHT_CM = 230;
export const LOW_CONFIDENCE = 0.5;

const USABLE_SCORE = 0.3;
/**
 * Pose shoulder keypoints sit on the joints, a few centimetres inside the outer edge of
 * each shoulder. Adding ~1.8% of height per side gives the edge-to-edge width a tape
 * measure (and garment sizing) uses.
 */
const SHOULDER_EDGE_ALLOWANCE_PER_SIDE = 0.018;
/** Ankle joint sits ~4% of stature above the floor */
const ANKLE_HEIGHT_SHARE = 0.042;

const score = (kp: Keypoint | undefined) => kp?.score ?? 0;
const usable = (kp: Keypoint | undefined): kp is Keypoint => score(kp) >= USABLE_SCORE;
const dist = (a: Keypoint, b: Keypoint) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Keypoint, b: Keypoint): Keypoint => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
  score: Math.min(score(a), score(b)),
});
const round1 = (value: number) => Math.round(value * 10) / 10;

function isPerson(s: Silhouette, x: number, y: number) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= s.width || yi >= s.height) return false;
  return s.data[yi * s.width + xi] === 1;
}

/** Horizontal run of person pixels through (x, y), or null if (x, y) is background. */
function runAt(s: Silhouette, x: number, y: number) {
  if (!isPerson(s, x, y)) return null;
  let left = Math.round(x);
  let right = Math.round(x);
  while (left > 0 && isPerson(s, left - 1, y)) left--;
  while (right < s.width - 1 && isPerson(s, right + 1, y)) right++;
  return { left, right, width: right - left + 1 };
}

function countInRow(s: Silhouette, y: number, x0: number, x1: number) {
  let count = 0;
  for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(s.width - 1, Math.ceil(x1)); x++) {
    if (isPerson(s, x, y)) count++;
  }
  return count;
}

export function computeCalibratedMeasurements(
  byName: Map<string, Keypoint>,
  heightCm: number,
  silhouette: Silhouette | null,
): CalibratedMeasurements | null {
  const ls = byName.get("left_shoulder");
  const rs = byName.get("right_shoulder");
  const lh = byName.get("left_hip");
  const rh = byName.get("right_hip");
  if (!ls || !rs || !lh || !rh) return null;

  const nose = byName.get("nose");
  const shoulderMid = mid(ls, rs);
  const hipMid = mid(lh, rh);
  const shoulderPx = dist(ls, rs);
  const hipJointPx = dist(lh, rh);
  const torsoPx = Math.max(hipMid.y - shoulderMid.y, 1);
  const ankles = [byName.get("left_ankle"), byName.get("right_ankle")].filter(usable);
  const knees = [byName.get("left_knee"), byName.get("right_knee")].filter(usable);

  // ---- Head top ----
  const headX = usable(nose) ? nose.x : shoulderMid.x;
  let topY: number | null = null;
  if (silhouette) {
    const half = shoulderPx * 0.6;
    for (let y = 0; y < shoulderMid.y; y++) {
      if (countInRow(silhouette, y, headX - half, headX + half) >= 2) {
        topY = y;
        break;
      }
    }
  }
  const topFromSilhouette = topY !== null;
  if (topY === null) {
    topY = usable(nose)
      ? nose.y - (shoulderMid.y - nose.y) * 0.7
      : shoulderMid.y - shoulderPx * 0.8;
  }

  // ---- Heels ----
  let bottomY: number | null = null;
  let heelFromSilhouette = false;
  if (ankles.length > 0) {
    const ankleY = Math.max(...ankles.map((a) => a.y));
    if (silhouette) {
      const x0 = Math.min(...ankles.map((a) => a.x)) - shoulderPx * 0.6;
      const x1 = Math.max(...ankles.map((a) => a.x)) + shoulderPx * 0.6;
      for (let y = silhouette.height - 1; y >= ankleY; y--) {
        if (countInRow(silhouette, y, x0, x1) >= 2) {
          bottomY = y;
          heelFromSilhouette = true;
          break;
        }
      }
    }
    if (bottomY === null) {
      bottomY = ankleY + (ANKLE_HEIGHT_SHARE / (1 - ANKLE_HEIGHT_SHARE)) * (ankleY - topY);
    }
  } else if (knees.length > 0) {
    const kneeY = knees.reduce((sum, k) => sum + k.y, 0) / knees.length;
    bottomY = kneeY + (kneeY - hipMid.y) * 0.95;
  } else {
    bottomY = hipMid.y + torsoPx * 2.3;
  }

  const bodyPx = bottomY - topY;
  if (bodyPx <= torsoPx) return null;
  const pxPerCm = bodyPx / heightCm;

  const scaleMethod: CalibratedMeasurements["scaleMethod"] =
    ankles.length === 0
      ? "extrapolated"
      : topFromSilhouette && heelFromSilhouette
        ? "silhouette"
        : "landmarks";
  const scaleConfidence =
    scaleMethod === "extrapolated"
      ? 0.3
      : scaleMethod === "silhouette"
        ? 0.92
        : topFromSilhouette || heelFromSilhouette
          ? 0.75
          : 0.6;

  const measure = (
    px: number,
    landmarkConfidence: number,
    basis: MeasurementBasis,
  ): CmMeasurement => ({
    cm: round1(px / pxPerCm),
    confidence: Math.min(landmarkConfidence, scaleConfidence),
    basis,
  });

  // ---- Waist & hips from the silhouette (narrowest / widest torso rows) ----
  const armPoints = ["left_elbow", "right_elbow", "left_wrist", "right_wrist"]
    .map((name) => byName.get(name))
    .filter(usable);
  const midlineX = (y: number) => {
    const t = (y - shoulderMid.y) / torsoPx;
    return shoulderMid.x + (hipMid.x - shoulderMid.x) * Math.min(Math.max(t, 0), 1.4);
  };
  const cleanRun = (y: number, maxWidth: number) => {
    if (!silhouette) return null;
    const run = runAt(silhouette, midlineX(y), y);
    if (!run || run.width > maxWidth || run.width < hipJointPx * 0.5) return null;
    // Arms touching the torso merge into the run — skip those rows
    const armMerged = armPoints.some(
      (p) => Math.abs(p.y - y) < torsoPx * 0.25 && p.x >= run.left && p.x <= run.right,
    );
    return armMerged ? null : { ...run, y };
  };

  type Run = { left: number; right: number; width: number; y: number };
  let waistRun: Run | null = null;
  let hipRun: Run | null = null;
  let waistRows = 0;
  let hipRows = 0;
  if (silhouette) {
    for (let y = Math.round(shoulderMid.y + torsoPx * 0.45); y <= hipMid.y; y++) {
      const run = cleanRun(y, shoulderPx * 1.3);
      if (run) {
        waistRows++;
        if (!waistRun || run.width < waistRun.width) waistRun = run;
      }
    }
    for (let y = Math.round(hipMid.y - torsoPx * 0.1); y <= hipMid.y + torsoPx * 0.35; y++) {
      const run = cleanRun(y, shoulderPx * 1.5);
      if (run) {
        hipRows++;
        if (!hipRun || run.width > hipRun.width) hipRun = run;
      }
    }
  }
  // Bust: chest band just below the armpits; median of clean rows (arms often touch here)
  const bustWidths: number[] = [];
  if (silhouette) {
    for (
      let y = Math.round(shoulderMid.y + torsoPx * 0.2);
      y <= shoulderMid.y + torsoPx * 0.4;
      y++
    ) {
      const run = cleanRun(y, shoulderPx * 1.1);
      if (run) bustWidths.push(run.width);
    }
  }
  bustWidths.sort((a, b) => a - b);
  const bustRunWidth =
    bustWidths.length >= 3 ? (bustWidths[Math.floor(bustWidths.length / 2)] ?? null) : null;
  if (waistRows < 3) waistRun = null;
  if (hipRows < 3) hipRun = null;

  const torsoScore = Math.min(score(ls), score(rs), score(lh), score(rh));
  const hipWidthPx = hipRun?.width ?? hipJointPx * 1.6;
  const waistWidthPx = waistRun?.width ?? hipWidthPx * 0.8;
  const bustWidth =
    bustRunWidth !== null
      ? measure(bustRunWidth, Math.min(score(ls), score(rs)), "silhouette")
      : measure((shoulderPx * 0.95 + hipWidthPx) / 2, Math.min(0.3, torsoScore), "approximation");
  const hipWidth = hipRun
    ? measure(hipWidthPx, Math.min(score(lh), score(rh)), "silhouette")
    : measure(hipWidthPx, Math.min(0.35, torsoScore), "approximation");
  const waistWidth = waistRun
    ? measure(waistWidthPx, torsoScore, "silhouette")
    : measure(waistWidthPx, Math.min(0.3, torsoScore), "approximation");

  // ---- Hip curvature: hip edges vs waist edges, each relative to the torso midline ----
  let leftCurvePx: number;
  let rightCurvePx: number;
  if (hipRun && waistRun) {
    const hipMidline = midlineX(hipRun.y);
    const waistMidline = midlineX(waistRun.y);
    leftCurvePx = hipMidline - hipRun.left - (waistMidline - waistRun.left);
    rightCurvePx = hipRun.right - hipMidline - (waistRun.right - waistMidline);
  } else {
    leftCurvePx = rightCurvePx = (hipWidthPx - waistWidthPx) / 2;
  }
  const hipCurve: HipCurve = {
    leftCm: round1(leftCurvePx / pxPerCm),
    rightCm: round1(rightCurvePx / pxPerCm),
    averageCm: round1((leftCurvePx + rightCurvePx) / 2 / pxPerCm),
    waistToHipWidthRatio: Math.round((waistWidthPx / hipWidthPx) * 100) / 100,
    confidence: Math.min(hipWidth.confidence, waistWidth.confidence),
  };

  // ---- Limb lengths: average of usable sides, following the joints (handles bent knees/elbows) ----
  const chainLength = (names: [string, string, string][]) => {
    const sides = names
      .map(([a, b, c]) => [byName.get(a), byName.get(b), byName.get(c)] as const)
      .filter((pts): pts is readonly [Keypoint, Keypoint, Keypoint] => pts.every(usable));
    if (sides.length === 0) return null;
    const px = sides.reduce((sum, [a, b, c]) => sum + dist(a, b) + dist(b, c), 0) / sides.length;
    const conf = Math.min(...sides.flat().map(score));
    return measure(px, conf, "landmarks");
  };

  return {
    heightCm,
    pixelsPerCm: pxPerCm,
    scaleConfidence,
    scaleMethod,
    shoulderWidth: measure(
      shoulderPx + 2 * SHOULDER_EDGE_ALLOWANCE_PER_SIDE * heightCm * pxPerCm,
      Math.min(score(ls), score(rs)),
      "landmarks",
    ),
    shoulderJointWidth: measure(shoulderPx, Math.min(score(ls), score(rs)), "landmarks"),
    bustWidth,
    waistWidth,
    hipWidth,
    torsoLength: measure(dist(shoulderMid, hipMid), torsoScore, "landmarks"),
    legLength: chainLength([
      ["left_hip", "left_knee", "left_ankle"],
      ["right_hip", "right_knee", "right_ankle"],
    ]),
    armLength: chainLength([
      ["left_shoulder", "left_elbow", "left_wrist"],
      ["right_shoulder", "right_elbow", "right_wrist"],
    ]),
    hipCurve,
  };
}

// ============================================================================
// Manual overrides
// ============================================================================

export type ManualKey =
  "height" | "shoulderWidth" | "bust" | "waist" | "hips" | "torsoLength" | "inseam" | "armLength";
/** User-entered values, always stored in cm. Bust, waist and hips are circumferences. */
export type ManualMeasurements = Partial<Record<ManualKey, number>>;

export type ResolvedValue = {
  cm: number;
  source: "user" | "ai";
  confidence: number;
  basis: MeasurementBasis;
};

export type ResolvedMeasurements = {
  height: ResolvedValue | null;
  shoulderWidth: ResolvedValue | null;
  bustWidth: ResolvedValue | null;
  waistWidth: ResolvedValue | null;
  hipWidth: ResolvedValue | null;
  torsoLength: ResolvedValue | null;
  legLength: ResolvedValue | null;
  armLength: ResolvedValue | null;
  /** Circumferences: the user's tape value when entered, otherwise estimated from width */
  bustCircumference: ResolvedValue | null;
  waistCircumference: ResolvedValue | null;
  hipCircumference: ResolvedValue | null;
  hipCurve: (HipCurve & { source: "user" | "ai" }) | null;
  /** Garment width multiplier when the user's shoulder width differs from the detected one */
  fitScale: number;
};

const userValue = (cm: number): ResolvedValue => ({
  cm: round1(cm),
  source: "user",
  confidence: 1,
  basis: "user",
});

/** Combines AI estimates with manual entries; manual values always win. */
export function resolveMeasurements(
  calibrated: CalibratedMeasurements | null | undefined,
  manual: ManualMeasurements,
): ResolvedMeasurements {
  // A corrected height rescales every photo-derived value
  const scale = manual.height && calibrated ? manual.height / calibrated.heightCm : 1;
  const ai = (m: CmMeasurement | null | undefined): ResolvedValue | null =>
    m ? { cm: round1(m.cm * scale), source: "ai", confidence: m.confidence, basis: m.basis } : null;
  const circumference = (width: ResolvedValue | null, factor: number): ResolvedValue | null =>
    width ? { ...width, cm: round1(width.cm * factor) } : null;

  const aiShoulder = ai(calibrated?.shoulderWidth);
  const shoulderWidth = manual.shoulderWidth ? userValue(manual.shoulderWidth) : aiShoulder;

  const fromCircumference = (circumferenceCm: number, factor: number): ResolvedValue => ({
    cm: round1(circumferenceCm / factor),
    source: "user",
    confidence: 1,
    basis: "approximation",
  });
  // Priority for front-view widths: a real photo measurement, then an estimate from the
  // user's tape circumference, then the photo's rough approximation.
  const width = (
    measured: CmMeasurement | null | undefined,
    tapeCm: number | undefined,
    factor: number,
  ): ResolvedValue | null => {
    const fromPhoto = ai(measured);
    if (fromPhoto && fromPhoto.basis !== "approximation") return fromPhoto;
    if (tapeCm) return fromCircumference(tapeCm, factor);
    return fromPhoto;
  };
  const bustWidth = width(calibrated?.bustWidth, manual.bust, BUST_WIDTH_TO_CIRCUMFERENCE);
  const waistWidth = width(calibrated?.waistWidth, manual.waist, WAIST_WIDTH_TO_CIRCUMFERENCE);
  const hipWidth = width(calibrated?.hipWidth, manual.hips, HIP_WIDTH_TO_CIRCUMFERENCE);

  let hipCurve: ResolvedMeasurements["hipCurve"] = null;
  if (!calibrated && (manual.waist || manual.hips)) {
    if (waistWidth && hipWidth) {
      const perSide = round1((hipWidth.cm - waistWidth.cm) / 2);
      hipCurve = {
        leftCm: perSide,
        rightCm: perSide,
        averageCm: perSide,
        waistToHipWidthRatio: Math.round((waistWidth.cm / hipWidth.cm) * 100) / 100,
        confidence: Math.min(waistWidth.confidence, hipWidth.confidence),
        source: "user",
      };
    }
  } else if (calibrated) {
    const c = calibrated.hipCurve;
    hipCurve = {
      ...c,
      leftCm: round1(c.leftCm * scale),
      rightCm: round1(c.rightCm * scale),
      averageCm: round1(c.averageCm * scale),
      source: "ai",
    };
  }

  const height = manual.height
    ? userValue(manual.height)
    : calibrated
      ? userValue(calibrated.heightCm)
      : null;

  return {
    height,
    shoulderWidth,
    bustWidth,
    waistWidth,
    hipWidth,
    torsoLength: manual.torsoLength ? userValue(manual.torsoLength) : ai(calibrated?.torsoLength),
    legLength: manual.inseam ? userValue(manual.inseam) : ai(calibrated?.legLength),
    armLength: manual.armLength ? userValue(manual.armLength) : ai(calibrated?.armLength),
    bustCircumference: manual.bust
      ? userValue(manual.bust)
      : circumference(bustWidth, BUST_WIDTH_TO_CIRCUMFERENCE),
    waistCircumference: manual.waist
      ? userValue(manual.waist)
      : circumference(waistWidth, WAIST_WIDTH_TO_CIRCUMFERENCE),
    hipCircumference: manual.hips
      ? userValue(manual.hips)
      : circumference(hipWidth, HIP_WIDTH_TO_CIRCUMFERENCE),
    hipCurve,
    fitScale:
      manual.shoulderWidth && aiShoulder && aiShoulder.cm > 0
        ? manual.shoulderWidth / aiShoulder.cm
        : 1,
  };
}

export function feetInchesToCm(feet: number, inches: number) {
  return round1((feet * 12 + inches) * 2.54);
}

export function cmToFeetInches(cm: number) {
  const totalInches = cm / 2.54;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - feet * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

// ============================================================================
// Display units (values are always stored in cm)
// ============================================================================

export type LengthUnit = "cm" | "in";
export const CM_PER_INCH = 2.54;

export const toUnit = (cm: number, unit: LengthUnit) =>
  Math.round((unit === "in" ? cm / CM_PER_INCH : cm) * 10) / 10;
export const fromUnit = (value: number, unit: LengthUnit) =>
  unit === "in" ? value * CM_PER_INCH : value;
/** e.g. "38.1 cm", "15 in" — one decimal, trailing ".0" dropped */
export const formatLength = (cm: number, unit: LengthUnit) => `${toUnit(cm, unit)} ${unit}`;

/** Shared display-unit preference (height prompt + measurements card). Defaults to inches. */
const UNIT_STORAGE_KEY = "ora_length_unit";

export function readUnitPreference(): LengthUnit {
  try {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(UNIT_STORAGE_KEY);
      if (saved === "cm" || saved === "in") return saved;
    }
  } catch {
    /* storage unavailable */
  }
  return "in";
}

export function saveUnitPreference(unit: LengthUnit) {
  try {
    window.localStorage.setItem(UNIT_STORAGE_KEY, unit);
  } catch {
    /* storage unavailable: the choice lasts for this visit */
  }
}
