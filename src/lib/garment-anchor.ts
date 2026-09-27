/**
 * Finds where a shop model's shoulders and hips are in a worn-garment photo, so the
 * unmodified photo can be positioned and scaled onto the user's own landmarks.
 * Runs MoveNet on-device; the image pixels themselves are never altered.
 */
import type { Landmark } from "./pose-types";
import { loadImage } from "./image-cleanup";

/** Model's landmarks in the garment image's natural pixel coordinates. */
export type GarmentAnchor = {
  leftShoulder: Landmark;
  rightShoulder: Landmark;
  hipCenter: Landmark | null;
};

const USABLE_SCORE = 0.3;

/** Returns null for images without a clearly visible wearer (flat lays, illustrations). */
export async function findGarmentAnchor(src: string): Promise<GarmentAnchor | null> {
  try {
    const img = await loadImage(src);
    const { detectKeypoints } = await import("./pose");
    const keypoints = await detectKeypoints(img);
    const usable = (name: string) => {
      const kp = keypoints.get(name);
      return kp && (kp.score ?? 0) >= USABLE_SCORE ? { x: kp.x, y: kp.y } : null;
    };
    const ls = usable("left_shoulder");
    const rs = usable("right_shoulder");
    if (!ls || !rs) return null;
    const lh = usable("left_hip");
    const rh = usable("right_hip");
    return {
      leftShoulder: ls,
      rightShoulder: rs,
      hipCenter: lh && rh ? { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 } : null,
    };
  } catch (error) {
    console.warn("Couldn't locate the model in the garment photo:", error);
    return null;
  }
}
