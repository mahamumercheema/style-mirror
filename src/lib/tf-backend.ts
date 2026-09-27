/**
 * Shared TensorFlow.js backend setup for the on-device models (pose + segmentation).
 */
let backendPromise: Promise<typeof import("@tensorflow/tfjs-core")> | null = null;

export function initTfBackend() {
  if (!backendPromise) {
    backendPromise = (async () => {
      const tf = await import("@tensorflow/tfjs-core");
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
      return tf;
    })().catch((error) => {
      backendPromise = null;
      throw error;
    });
  }
  return backendPromise;
}
