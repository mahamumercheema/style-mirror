export type Landmark = { x: number; y: number };

export type BodyType = "Rectangle" | "Triangle" | "Inverted triangle" | "Hourglass";

export type DetectedKeypoint = {
  name: string;
  x: number;
  y: number;
  score: number;
};

export type SkeletonLine = {
  from: Landmark;
  to: Landmark;
  name: string;
};

export type Measurements = {
  /** Total body height in px / shoulder width in px */
  heightToShoulderRatio: number;
  /** Shoulder width as a share of image width (0-1) */
  shoulderWidthRatio: number;
  /** Hip width as a share of image width (0-1) */
  hipWidthRatio: number;
  /** Torso vertical height as a share of body height (0-1) */
  torsoHeightRatio: number;
  /** Estimated leg length as a share of body height (0-1) */
  legLengthRatio: number;
  /** Shoulder width / hip width */
  shoulderToHipRatio: number;
  bodyType: BodyType;
  /** Confidence 0-1 of the key landmarks used */
  confidence: number;
  /** Count of detected landmarks out of 13 */
  detectedLandmarksCount: number;
  totalLandmarksCount: number;
  /** Optional calibration: user's known height in cm */
  userHeightCm?: number;
  /** Estimated real measurements based on userHeightCm */
  estimatedShoulderWidthCm?: number;
  estimatedHipWidthCm?: number;
  estimatedTorsoHeightCm?: number;
  estimatedLegLengthCm?: number;
};

export type PoseGuide = {
  leftShoulder: Landmark;
  rightShoulder: Landmark;
  hipCenter: Landmark;
  /** vertical distance shoulders -> hips, px */
  torsoHeight: number;
};

export type PoseResult = {
  measurements: Measurements;
  guide: PoseGuide;
  keypoints: DetectedKeypoint[];
  skeletonLines: SkeletonLine[];
  imageDimensions: { width: number; height: number };
};

export const MAJOR_LANDMARKS = [
  "nose",
  "left_eye",
  "right_eye",
  "left_ear",
  "right_ear",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
];

export function classifyBodyType(shoulderToHip: number): BodyType {
  if (shoulderToHip > 1.1) return "Inverted triangle";
  if (shoulderToHip < 0.92) return "Triangle";
  if (shoulderToHip > 1.02) return "Hourglass";
  return "Rectangle";
}

/**
 * Generates default proportional body landmarks and guides when automated pose
 * estimation is inconclusive or when the user wants to position garments manually.
 */
export function createDefaultPoseResult(image: HTMLImageElement): PoseResult {
  const w = image.naturalWidth || 800;
  const h = image.naturalHeight || 1000;
  const shoulderMidY = h * 0.35;
  const shoulderWidth = w * 0.32;
  const hipMidY = h * 0.55;
  const hipWidth = w * 0.3;
  const torsoHeight = Math.max(hipMidY - shoulderMidY, 1);

  const ls = { x: (w - shoulderWidth) / 2, y: shoulderMidY };
  const rs = { x: (w + shoulderWidth) / 2, y: shoulderMidY };
  const lh = { x: (w - hipWidth) / 2, y: hipMidY };
  const rh = { x: (w + hipWidth) / 2, y: hipMidY };
  const hipMidX = w / 2;

  const skeletonLines: SkeletonLine[] = [
    { from: ls, to: rs, name: "shoulders" },
    { from: lh, to: rh, name: "hips" },
    { from: ls, to: lh, name: "left_torso" },
    { from: rs, to: rh, name: "right_torso" },
    { from: { x: hipMidX, y: shoulderMidY }, to: { x: hipMidX, y: hipMidY }, name: "spine" },
  ];

  const keypoints: DetectedKeypoint[] = [
    { name: "nose", x: hipMidX, y: h * 0.22, score: 0.9 },
    { name: "left_shoulder", x: ls.x, y: ls.y, score: 0.9 },
    { name: "right_shoulder", x: rs.x, y: rs.y, score: 0.9 },
    { name: "left_hip", x: lh.x, y: lh.y, score: 0.9 },
    { name: "right_hip", x: rh.x, y: rh.y, score: 0.9 },
    { name: "left_knee", x: ls.x, y: h * 0.72, score: 0.85 },
    { name: "right_knee", x: rs.x, y: h * 0.72, score: 0.85 },
    { name: "left_ankle", x: ls.x, y: h * 0.92, score: 0.85 },
    { name: "right_ankle", x: rs.x, y: h * 0.92, score: 0.85 },
  ];

  const shoulderToHip = shoulderWidth / hipWidth;

  return {
    measurements: {
      heightToShoulderRatio: h / shoulderWidth,
      shoulderWidthRatio: shoulderWidth / w,
      hipWidthRatio: hipWidth / w,
      torsoHeightRatio: torsoHeight / h,
      legLengthRatio: (h - hipMidY) / h,
      shoulderToHipRatio: shoulderToHip,
      bodyType: classifyBodyType(shoulderToHip),
      confidence: 0.85,
      detectedLandmarksCount: 9,
      totalLandmarksCount: MAJOR_LANDMARKS.length,
    },
    guide: {
      leftShoulder: ls,
      rightShoulder: rs,
      hipCenter: { x: hipMidX, y: hipMidY },
      torsoHeight,
    },
    keypoints,
    skeletonLines,
    imageDimensions: { width: w, height: h },
  };
}
