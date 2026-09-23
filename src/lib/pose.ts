/**
 * Client-side body-proportion estimation using TensorFlow.js MoveNet
 * (free, runs entirely in the browser — nothing is uploaded).
 */
import {
  type Landmark,
  type BodyType,
  type DetectedKeypoint,
  type SkeletonLine,
  type Measurements,
  type PoseGuide,
  type PoseResult,
  MAJOR_LANDMARKS,
  classifyBodyType,
} from "./pose-types";

export * from "./pose-types";

function dist(a: Landmark, b: Landmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const classify = classifyBodyType;

let detectorPromise: Promise<unknown> | null = null;

async function getDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const [tf, poseDetection] = await Promise.all([
        import("@tensorflow/tfjs-core"),
        import("@tensorflow-models/pose-detection"),
      ]);
      try {
        await import("@tensorflow/tfjs-backend-webgl");
        await tf.setBackend("webgl");
      } catch {
        try {
          await import("@tensorflow/tfjs-backend-cpu");
          await tf.setBackend("cpu");
        } catch {
          /* fall back to registered backend */
        }
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

const MAJOR_LANDMARKS = [
  "nose",
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
] as const;

export async function estimateBody(image: HTMLImageElement): Promise<PoseResult> {
  const detector = await getDetector();
  const poses = await detector.estimatePoses(image);
  const pose = poses[0];
  if (!pose || !pose.keypoints || pose.keypoints.length === 0) {
    throw new Error(
      "We couldn't detect a person in this photo. Please upload a clear, front-facing full-body photo with your entire body visible.",
    );
  }

  const byName = new Map<string, { x: number; y: number; score?: number }>();
  for (const kp of pose.keypoints) {
    if (kp.name) byName.set(kp.name, kp);
  }

  // Check essential torso landmarks: shoulders and hips
  const ls = byName.get("left_shoulder");
  const rs = byName.get("right_shoulder");
  const lh = byName.get("left_hip");
  const rh = byName.get("right_hip");

  if (!ls || !rs || !lh || !rh) {
    throw new Error(
      "We couldn't clearly detect your full body. Shoulders and hips are not clearly visible. Please upload a front-facing photo where your head, shoulders, hips, knees and feet are visible.",
    );
  }

  const shoulderScore = ((ls.score ?? 0) + (rs.score ?? 0)) / 2;
  const hipScore = ((lh.score ?? 0) + (rh.score ?? 0)) / 2;
  if (shoulderScore < 0.22 || hipScore < 0.22) {
    throw new Error(
      "We couldn't clearly detect your full body. The upper body or torso landmark confidence is too low. Please upload a front-facing photo where your head, shoulders, hips, knees and feet are visible.",
    );
  }

  // Check lower body: knees and ankles
  const lk = byName.get("left_knee");
  const rk = byName.get("right_knee");
  const la = byName.get("left_ankle");
  const ra = byName.get("right_ankle");

  const hasKnees = (lk?.score ?? 0) > 0.2 || (rk?.score ?? 0) > 0.2;
  const hasAnkles = (la?.score ?? 0) > 0.2 || (ra?.score ?? 0) > 0.2;

  if (!hasKnees && !hasAnkles) {
    throw new Error(
      "We couldn't clearly detect your full body. Your lower body, knees or feet appear to be cropped out. Please upload a front-facing photo where your head, shoulders, hips, knees and feet are visible.",
    );
  }

  // Calculate scores and counts across all 13 major landmarks
  const detectedKeypoints: DetectedKeypoint[] = [];
  let scoreSum = 0;
  let countOverThreshold = 0;

  for (const name of MAJOR_LANDMARKS) {
    const pt = byName.get(name);
    const score = pt?.score ?? 0;
    scoreSum += score;
    if (score >= 0.2) {
      countOverThreshold++;
    }
    if (pt) {
      detectedKeypoints.push({
        name,
        x: pt.x,
        y: pt.y,
        score,
      });
    }
  }

  const averageConfidence = scoreSum / MAJOR_LANDMARKS.length;

  if (averageConfidence < 0.3) {
    throw new Error(
      "We couldn't clearly detect your full body. Pose confidence score is too low. Please upload a clear, front-facing full-body photo with your entire body visible.",
    );
  }

  // Build skeleton connecting lines for the overlay
  const skeletonLines: SkeletonLine[] = [];
  const addLine = (nameA: string, nameB: string, lineName: string) => {
    const a = byName.get(nameA);
    const b = byName.get(nameB);
    if (a && b && (a.score ?? 0) >= 0.15 && (b.score ?? 0) >= 0.15) {
      skeletonLines.push({
        from: { x: a.x, y: a.y },
        to: { x: b.x, y: b.y },
        name: lineName,
      });
    }
  };

  // Shoulder and torso structure
  addLine("left_shoulder", "right_shoulder", "shoulders");
  addLine("left_shoulder", "left_hip", "left_torso");
  addLine("right_shoulder", "right_hip", "right_torso");
  addLine("left_hip", "right_hip", "hips");

  // Arms
  addLine("left_shoulder", "left_elbow", "left_upper_arm");
  addLine("left_elbow", "left_wrist", "left_forearm");
  addLine("right_shoulder", "right_elbow", "right_upper_arm");
  addLine("right_elbow", "right_wrist", "right_forearm");

  // Legs
  addLine("left_hip", "left_knee", "left_thigh");
  addLine("left_knee", "left_ankle", "left_shin");
  addLine("right_hip", "right_knee", "right_thigh");
  addLine("right_knee", "right_ankle", "right_shin");

  // Neck and spine
  const nose = byName.get("nose");
  const shoulderMidX = (ls.x + rs.x) / 2;
  const shoulderMidY = (ls.y + rs.y) / 2;
  const hipMidX = (lh.x + rh.x) / 2;
  const hipMidY = (lh.y + rh.y) / 2;

  if (nose && (nose.score ?? 0) >= 0.2) {
    skeletonLines.push({
      from: { x: nose.x, y: nose.y },
      to: { x: shoulderMidX, y: shoulderMidY },
      name: "neck",
    });
  }
  skeletonLines.push({
    from: { x: shoulderMidX, y: shoulderMidY },
    to: { x: hipMidX, y: hipMidY },
    name: "spine",
  });

  // Calculate body proportions
  const shoulderWidth = dist(ls, rs);
  const hipWidth = dist(lh, rh);
  const torsoHeight = Math.max(hipMidY - shoulderMidY, 1);

  const validAnkles = [la, ra].filter((a) => (a?.score ?? 0) >= 0.2) as Array<{
    x: number;
    y: number;
  }>;
  const validKnees = [lk, rk].filter((k) => (k?.score ?? 0) >= 0.2) as Array<{
    x: number;
    y: number;
  }>;

  const topY =
    nose && (nose.score ?? 0) >= 0.2
      ? nose.y - shoulderWidth * 0.45
      : shoulderMidY - shoulderWidth * 0.8;

  let bottomY = image.naturalHeight;
  if (validAnkles.length > 0) {
    bottomY = validAnkles.reduce((sum, a) => sum + a.y, 0) / validAnkles.length;
  } else if (validKnees.length > 0) {
    const kneeY = validKnees.reduce((sum, k) => sum + k.y, 0) / validKnees.length;
    bottomY = kneeY + (kneeY - hipMidY) * 0.85;
  } else {
    bottomY = hipMidY + torsoHeight * 2.3;
  }

  const bodyHeight = Math.max(bottomY - topY, 1);
  const legLength = Math.max(bottomY - hipMidY, 1);

  const shoulderToHip = hipWidth > 0 ? shoulderWidth / hipWidth : 1;

  return {
    measurements: {
      heightToShoulderRatio: bodyHeight / Math.max(shoulderWidth, 1),
      shoulderWidthRatio: shoulderWidth / image.naturalWidth,
      hipWidthRatio: hipWidth / image.naturalWidth,
      torsoHeightRatio: torsoHeight / bodyHeight,
      legLengthRatio: legLength / bodyHeight,
      shoulderToHipRatio: shoulderToHip,
      bodyType: classify(shoulderToHip),
      confidence: averageConfidence,
      detectedLandmarksCount: countOverThreshold,
      totalLandmarksCount: MAJOR_LANDMARKS.length,
    },
    guide: {
      leftShoulder: { x: ls.x, y: ls.y },
      rightShoulder: { x: rs.x, y: rs.y },
      hipCenter: { x: hipMidX, y: hipMidY },
      torsoHeight,
    },
    keypoints: detectedKeypoints,
    skeletonLines,
    imageDimensions: {
      width: image.naturalWidth,
      height: image.naturalHeight,
    },
  };
}
