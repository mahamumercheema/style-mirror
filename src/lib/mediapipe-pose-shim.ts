// Shim for @mediapipe/pose which lacks ESM exports for bundlers like Rolldown / Rollup.
// MoveNet (used in this app) runs via pure TF.js and does not instantiate MediaPipe Pose.

export class Pose {
  constructor(_config?: unknown) {}
  async close(): Promise<void> {}
  onResults(_listener: unknown): void {}
  async initialize(): Promise<void> {}
  reset(): void {}
  async send(_inputs: unknown, _at?: number): Promise<void> {}
  setOptions(_options: unknown): void {}
}

export const VERSION = "0.5.1675469404";
export const POSE_CONNECTIONS: Array<[number, number]> = [];
export const POSE_LANDMARKS: Record<string, number> = {};
export const POSE_LANDMARKS_LEFT: Record<string, number> = {};
export const POSE_LANDMARKS_RIGHT: Record<string, number> = {};
export const POSE_LANDMARKS_NEUTRAL: Record<string, number> = {};

export default {
  Pose,
  VERSION,
  POSE_CONNECTIONS,
  POSE_LANDMARKS,
  POSE_LANDMARKS_LEFT,
  POSE_LANDMARKS_RIGHT,
  POSE_LANDMARKS_NEUTRAL,
};
