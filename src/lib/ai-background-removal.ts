import { removeClothingBackground } from "./clothing-background-removal";

/**
 * Removes a garment photo's background in the browser using an AI model
 * (@imgly/background-removal). Falls back to the built-in colour-based
 * remover if the model can't load. Returns a transparent PNG data URL.
 */
export async function removeGarmentBackground(src: string): Promise<string> {
  try {
    const { removeBackground } = await import("@imgly/background-removal");
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
