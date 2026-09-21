/**
 * Client-side body-proportion estimation using TensorFlow.js MoveNet
 * (free, runs entirely in the browser — nothing is uploaded).
 */

export type Landmark = { x: number; y: number };

export type BodyType = "Rectangle" | "Triangle" | "Inverted triangle" | "Hourglass";

export type Measurements = {
  /** Total body height in px / shoulder width in px */
  heightToShoulderRatio: number;
  /** Shoulder width as a share of image width (0-1) */
  shoulderWidthRatio: number;
  /** Hip width as a share of image width (0-1) */
  hipWidthRatio: number;
  /** Shoulder width / hip width */
  shoulderToHipRatio: number;
  bodyType: BodyType;
  /** Confidence 0-1 of the landmarks used */
  confidence: number;
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
};

function dist(a: Landmark, b: Landmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function classify(shoulderToHip: number): BodyType {
  if (shoulderToHip > 1.1) return "Inverted triangle";
  if (shoulderToHip < 0.92) return "Triangle";
  if (shoulderToHip > 1.02) return "Hourglass";
  return "Rectangle";
}

let detectorPromise: Promise<unknown> | null = null;

async function getDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const [tf, poseDetection] = await Promise.all([
        import("@tensorflow/tfjs-core"),
        import("@tensorflow-models/pose-detection"),
      ]);
      await import("@tensorflow/tfjs-backend-webgl");
      try {
        await tf.setBackend("webgl");
      } catch {
        /* fall back to whatever backend is registered */
      }
      await tf.ready();
      return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: "SinglePose.Lightning",
      });
    })().catch((error) => {
      detectorPromise = null;
      throw error;
    });
  }
  return detectorPromise as Promise<{
    estimatePoses: (
      image: HTMLImageElement,
    ) => Promise<
      Array<{ keypoints: Array<{ name?: string; x: number; y: number; score?: number }> }>
    >;
  }>;
}

export async function estimateBody(image: HTMLImageElement): Promise<PoseResult> {
  const detector = await getDetector();
  const poses = await detector.estimatePoses(image);
  const pose = poses[0];
  if (!pose) {
    throw new Error("No person detected. Try a clearer full-body photo on a plain background.");
  }

  const byName = new Map<string, { x: number; y: number; score?: number }>();
  for (const kp of pose.keypoints) {
    if (kp.name) byName.set(kp.name, kp);
  }

  const required = ["left_shoulder", "right_shoulder", "left_hip", "right_hip"] as const;
  const points = required.map((name) => byName.get(name));
  if (points.some((p) => !p)) {
    throw new Error("Couldn't find shoulders and hips. Try a front-facing full-body photo.");
  }

  const [ls, rs, lh, rh] = points as Array<{ x: number; y: number; score?: number }>;
  const nose = byName.get("nose");
  const ankles = [byName.get("left_ankle"), byName.get("right_ankle")].filter(Boolean) as Array<{
    y: number;
  }>;

  const shoulderWidth = dist(ls, rs);
  const hipWidth = dist(lh, rh);
  const shoulderY = (ls.y + rs.y) / 2;
  const hipY = (lh.y + rh.y) / 2;

  const topY = nose ? nose.y - shoulderWidth * 0.45 : shoulderY - shoulderWidth * 0.8;
  const bottomY = ankles.length
    ? ankles.reduce((sum, a) => sum + a.y, 0) / ankles.length
    : hipY + (hipY - shoulderY) * 2.6;
  const bodyHeight = Math.max(bottomY - topY, 1);

  const scores = [ls, rs, lh, rh].map((p) => p.score ?? 0);
  const confidence = scores.reduce((a, b) => a + b, 0) / scores.length;
  const shoulderToHip = hipWidth > 0 ? shoulderWidth / hipWidth : 1;

  return {
    measurements: {
      heightToShoulderRatio: bodyHeight / Math.max(shoulderWidth, 1),
      shoulderWidthRatio: shoulderWidth / image.naturalWidth,
      hipWidthRatio: hipWidth / image.naturalWidth,
      shoulderToHipRatio: shoulderToHip,
      bodyType: classify(shoulderToHip),
      confidence,
    },
    guide: {
      leftShoulder: { x: ls.x, y: ls.y },
      rightShoulder: { x: rs.x, y: rs.y },
      hipCenter: { x: (lh.x + rh.x) / 2, y: hipY },
      torsoHeight: Math.max(hipY - shoulderY, 1),
    },
  };
}
