// Shim for @mediapipe/selfie_segmentation which lacks ESM exports for bundlers like Rolldown / Rollup.
// Background removal (image-cleanup.ts) uses the pure TF.js runtime and never instantiates this class.

export class SelfieSegmentation {
  constructor(_config?: unknown) {}
  async close(): Promise<void> {}
  onResults(_listener: unknown): void {}
  async initialize(): Promise<void> {}
  reset(): void {}
  async send(_inputs: unknown): Promise<void> {}
  setOptions(_options: unknown): void {}
}

export const VERSION = "0.1.1675465747";

export default { SelfieSegmentation, VERSION };
