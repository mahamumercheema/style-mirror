import { removeClothingBackground } from "./clothing-background-removal";

/**
 * @imgly/background-removal is loaded from the CDN in the browser (it isn't a dependency), so
 * its onnxruntime engine never enters the build. Its model files come from IMG.LY's CDN.
 */
const IMGLY_CDN_URL = "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm";
type ImglyBackgroundRemoval = {
  removeBackground: (
    image: string | Blob,
    config?: { output?: { format?: "image/png" | "image/webp" | "image/jpeg" } },
  ) => Promise<Blob>;
};

/**
 * Removes a garment photo's background in the browser using an AI model
 * (@imgly/background-removal). Falls back to the built-in colour-based
 * remover if the model can't load. Returns a transparent PNG data URL.
 */
export async function removeGarmentBackground(src: string): Promise<string> {
  try {
    const { removeBackground } = (await import(
      /* @vite-ignore */ IMGLY_CDN_URL
    )) as ImglyBackgroundRemoval;
    const blob = await removeBackground(src, { output: { format: "image/png" } });
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("AI background removal failed, using fallback:", err);
    return removeClothingBackground(src);
  }
}
